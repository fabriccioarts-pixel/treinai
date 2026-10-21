import type { Context } from "hono";
import { nowIso } from "./id";

/*
 * Acesso pago: teste grátis de TRIAL_DAYS dias e depois assinatura (Cakto, ver cakto.ts).
 * Sem acesso, só a IA fica bloqueada (Théo no chat e na voz, análise de refeição):
 * é ela que gera custo. Registrar treino, carga, água e progresso continua liberado.
 */

export type PlanKey = "mensal" | "trimestral";

export const PLANS: Record<PlanKey, { label: string; months: number; amountCents: number }> = {
  mensal: { label: "Plano Mensal", months: 1, amountCents: 4990 },
  trimestral: { label: "Plano Trimestral", months: 3, amountCents: 11970 },
};

export function isPlanKey(value: unknown): value is PlanKey {
  return value === "mensal" || value === "trimestral";
}

const DEFAULT_TRIAL_DAYS = 3;
/** Folga depois da data de cobrança, enquanto a Cakto tenta cobrar de novo */
const GRACE_MS = 3 * 24 * 60 * 60_000;

export function trialDays(env: Env): number {
  const days = Number(env.TRIAL_DAYS);
  return Number.isFinite(days) && days >= 0 ? days : DEFAULT_TRIAL_DAYS;
}

export function trialEndsAtFrom(env: Env, start = Date.now()): string {
  return new Date(start + trialDays(env) * 24 * 60 * 60_000).toISOString();
}

/** Grava o fim do teste numa conta nova; antes da migration 0013 não faz nada */
export async function startTrial(env: Env, userId: string): Promise<void> {
  try {
    await env.DB.prepare("UPDATE users SET trial_ends_at = ? WHERE id = ? AND trial_ends_at IS NULL")
      .bind(trialEndsAtFrom(env), userId)
      .run();
  } catch {
    // Migration 0013 ainda não rodou: sem cobrança, a IA segue liberada
  }
}

export interface Access {
  status: "trial" | "active" | "expired";
  trialEndsAt: string | null;
  subscription: {
    id: string;
    plan: PlanKey;
    status: string;
    amountCents: number;
    paidUntil: string | null;
  } | null;
}

interface SubscriptionRow {
  id: string;
  plan: PlanKey;
  status: string;
  amount_cents: number;
  paid_until: string | null;
}

export async function getAccess(env: Env, userId: string): Promise<Access> {
  let user: { trial_ends_at: string | null; created_at: string } | null;
  let sub: SubscriptionRow | null;
  try {
    [user, sub] = await Promise.all([
      env.DB.prepare("SELECT trial_ends_at, created_at FROM users WHERE id = ?")
        .bind(userId)
        .first<{ trial_ends_at: string | null; created_at: string }>(),
      // Da conta, ou comprada com o mesmo e-mail antes de a conta existir; vale a que paga até mais tarde
      env.DB.prepare(
        `SELECT id, plan, status, amount_cents, paid_until FROM subscriptions
         WHERE user_id = ?1 OR (user_id IS NULL AND email = (SELECT email FROM users WHERE id = ?1))
         ORDER BY (paid_until IS NULL), paid_until DESC, updated_at DESC LIMIT 1`
      )
        .bind(userId)
        .first<SubscriptionRow>(),
    ]);
  } catch {
    // Migration 0013 ainda não rodou: sem cobrança
    return { status: "active", trialEndsAt: null, subscription: null };
  }

  const subscription = sub
    ? { id: sub.id, plan: sub.plan, status: sub.status, amountCents: sub.amount_cents, paidUntil: sub.paid_until }
    : null;
  const now = Date.now();

  // A folga só cobre a renovação atrasada de quem segue assinando: cancelada vale até o fim do
  // período pago, e reembolso/chargeback encerram na hora (paid_until já é o momento do estorno)
  const grace = sub?.status === "active" ? GRACE_MS : 0;
  if (sub?.paid_until && Date.parse(sub.paid_until) + grace > now) {
    return { status: "active", trialEndsAt: user?.trial_ends_at ?? null, subscription };
  }

  // Conta sem data gravada (criada entre o deploy e a migration): conta o teste a partir do cadastro
  const trialEndsAt = user?.trial_ends_at ?? (user ? trialEndsAtFrom(env, Date.parse(user.created_at)) : null);
  if (trialEndsAt && Date.parse(trialEndsAt) > now) {
    return { status: "trial", trialEndsAt, subscription };
  }
  return { status: "expired", trialEndsAt, subscription };
}

/** Nas rotas de IA: resposta 402 quando o teste acabou e não há assinatura em dia */
export async function requireAiAccess(c: Context<{ Bindings: Env }>, userId: string): Promise<Response | null> {
  const access = await getAccess(c.env, userId);
  if (access.status !== "expired") return null;
  return c.json({ error: "subscription_required", trialEndsAt: access.trialEndsAt }, 402);
}

export interface SubscriptionUpdate {
  id: string;
  userId: string | null;
  email: string;
  plan: PlanKey;
  status: string;
  amountCents: number;
  /** Até quando o acesso está pago (ISO, UTC); null mantém o que já estava gravado */
  paidUntil: string | null;
  /** Reembolso ou chargeback: o acesso acaba agora, mesmo com período pago pela frente */
  revoke?: boolean;
}

export async function upsertSubscription(env: Env, sub: SubscriptionUpdate): Promise<void> {
  const now = nowIso();
  const paidUntil = sub.revoke ? now : sub.paidUntil;
  // Fora do reembolso, paid_until nunca anda para trás: um aviso atrasado não tira acesso já pago
  await env.DB.prepare(
    `INSERT INTO subscriptions (id, user_id, email, plan, status, amount_cents, paid_until, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
     ON CONFLICT(id) DO UPDATE SET
       user_id = COALESCE(subscriptions.user_id, excluded.user_id),
       -- Cancelar depois de um estorno não pode apagar o estorno (nem reabrir acesso)
       status = CASE
         WHEN subscriptions.status IN ('refunded', 'chargeback') AND excluded.status = 'canceled' THEN subscriptions.status
         ELSE excluded.status
       END,
       plan = excluded.plan,
       amount_cents = excluded.amount_cents,
       paid_until = CASE
         WHEN ?9 THEN excluded.paid_until
         WHEN excluded.paid_until IS NULL THEN subscriptions.paid_until
         WHEN subscriptions.paid_until IS NULL OR excluded.paid_until > subscriptions.paid_until THEN excluded.paid_until
         ELSE subscriptions.paid_until
       END,
       updated_at = excluded.updated_at`
  )
    .bind(sub.id, sub.userId, sub.email.toLowerCase(), sub.plan, sub.status, sub.amountCents, paidUntil, now, sub.revoke ? 1 : 0)
    .run();
}
