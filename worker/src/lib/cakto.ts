import { PLANS, upsertSubscription, type PlanKey } from "./billing";

/*
 * Assinatura pela Cakto (docs.cakto.com.br).
 * Checkout: o link da oferta, com ?callback=<id da conta> e nome/e-mail já preenchidos.
 * Confirmação: só pelo webhook (servidor a servidor), nunca pela volta do navegador.
 * Cancelamento pelo app: API pública com chave OAuth (opcional — sem ela, o cancelamento é pela Cakto).
 */

const CHECKOUT_BASE = "https://pay.cakto.com.br";
const API = "https://api.cakto.com.br";
/** Entrega mais velha que isso é recusada (proteção contra reenvio de um aviso capturado) */
const SIGNATURE_TOLERANCE_S = 5 * 60;
const DAY_MS = 24 * 60 * 60_000;

export class CaktoError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "CaktoError";
  }
}

function offerId(env: Env, plan: PlanKey): string | undefined {
  return (plan === "mensal" ? env.CAKTO_OFFER_MENSAL : env.CAKTO_OFFER_TRIMESTRAL) || undefined;
}

/** Link de pagamento da oferta do plano; o callback (id da conta) volta no webhook */
export function checkoutUrl(env: Env, plan: PlanKey, user: { id: string; name: string; email: string }): string {
  const offer = offerId(env, plan);
  if (!offer) throw new CaktoError(503, "cakto_not_configured");
  const params = new URLSearchParams({ callback: user.id, name: user.name, email: user.email });
  return `${CHECKOUT_BASE}/${encodeURIComponent(offer)}?${params}`;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function safeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  return crypto.subtle.timingSafeEqual(ha, hb);
}

/**
 * Origem do webhook: vale a assinatura do cabeçalho (X-Cakto-Signature "v1=<hmac>" de
 * "{timestamp}.{corpo cru}", dentro da tolerância de tempo) ou o campo `secret` do corpo — as duas
 * formas que a Cakto documenta, com o mesmo segredo.
 */
export async function verifyCaktoWebhook(
  env: Env,
  input: { rawBody: string; timestamp?: string; signature?: string; bodySecret?: unknown },
): Promise<boolean> {
  // Espaço ou quebra de linha colados junto com o segredo no `wrangler secret put` não contam
  const secret = env.CAKTO_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error(JSON.stringify({ message: "cakto webhook: CAKTO_WEBHOOK_SECRET não configurado" }));
    return false;
  }

  let headerOk = false;
  let headerReason = "sem cabeçalho";
  if (input.signature && input.timestamp) {
    const ts = Number(input.timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > SIGNATURE_TOLERANCE_S) {
      headerReason = "timestamp fora da tolerância";
    } else {
      const expected = `v1=${await hmacSha256Hex(secret, `${input.timestamp}.${input.rawBody}`)}`;
      // Numa troca de versão o cabeçalho pode trazer "v1=...,v2=...": compara só a v1
      const v1 = input.signature.split(",").map((s) => s.trim()).find((s) => s.startsWith("v1="));
      headerOk = !!v1 && (await safeEqual(v1, expected));
      headerReason = headerOk ? "ok" : "hmac não confere";
    }
  }
  const bodySecret = typeof input.bodySecret === "string" ? input.bodySecret.trim() : "";
  const bodyOk = !!bodySecret && (await safeEqual(bodySecret, secret));

  if (!headerOk && !bodyOk) {
    // Só tamanhos e resultados, nunca o segredo: separa "chave diferente" de "assinatura calculada diferente"
    console.warn(
      JSON.stringify({
        message: "cakto webhook recusado",
        header: headerReason,
        bodySecret: bodySecret ? "não confere" : "ausente",
        secretLength: secret.length,
        rawSecretLength: env.CAKTO_WEBHOOK_SECRET.length,
        bodySecretLength: bodySecret.length,
      }),
    );
  }
  return headerOk || bodyOk;
}

/** Pedido no formato do webhook (só os campos usados aqui) */
export interface CaktoOrder {
  id?: string;
  status?: string;
  callback?: string | null;
  amount?: number | null;
  paidAt?: string | null;
  customer?: { email?: string | null } | null;
  offer?: { id?: string } | null;
  product?: { type?: string } | null;
  subscription?: {
    id?: string;
    status?: string;
    amount?: string | number;
    recurrence_period?: number | null;
    next_payment_date?: string | null;
  } | null;
}

function toUtcIso(date: string | null | undefined): string | null {
  const time = date ? Date.parse(date) : NaN;
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function planFor(env: Env, order: CaktoOrder): PlanKey {
  const offer = order.offer?.id;
  if (offer && offer === env.CAKTO_OFFER_TRIMESTRAL) return "trimestral";
  if (offer && offer === env.CAKTO_OFFER_MENSAL) return "mensal";
  // Oferta não cadastrada aqui: decide pelo intervalo da cobrança (em dias)
  return (order.subscription?.recurrence_period ?? 30) >= 60 ? "trimestral" : "mensal";
}

/** Dono da compra: assinatura já conhecida → callback do link → conta com o mesmo e-mail */
async function resolveUserId(db: D1Database, subscriptionId: string, order: CaktoOrder): Promise<string | null> {
  const known = await db.prepare("SELECT user_id FROM subscriptions WHERE id = ?")
    .bind(subscriptionId)
    .first<{ user_id: string | null }>();
  if (known?.user_id) return known.user_id;

  if (order.callback) {
    const byCallback = await db.prepare("SELECT id FROM users WHERE id = ?").bind(order.callback).first<{ id: string }>();
    if (byCallback) return byCallback.id;
  }
  const email = order.customer?.email?.toLowerCase();
  if (!email) return null;
  const byEmail = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first<{ id: string }>();
  return byEmail?.id ?? null;
}

const REVOKING_EVENTS = new Set(["refund", "chargeback"]);

/**
 * Aplica um evento de pedido. Pedido sem assinatura (produto de pagamento único) é ignorado:
 * o Treinai só vende planos recorrentes.
 */
export async function applyCaktoEvent(env: Env, event: string, order: CaktoOrder): Promise<"applied" | "ignored"> {
  const sub = order.subscription;
  if (!sub?.id) return "ignored";
  const isPaid = (event === "purchase_approved" && order.status === "paid") || event === "subscription_renewed";
  const isCanceled = event === "subscription_canceled";
  const isRevoked = REVOKING_EVENTS.has(event);
  if (!isPaid && !isCanceled && !isRevoked) return "ignored";

  const email = order.customer?.email ?? "";
  const plan = planFor(env, order);
  const amount = Number(sub.amount ?? order.amount ?? PLANS[plan].amountCents / 100);

  // Pago até a próxima cobrança; sem ela no aviso, o pagamento + o intervalo da recorrência
  let paidUntil: string | null = null;
  if (isPaid) {
    paidUntil =
      toUtcIso(sub.next_payment_date) ??
      new Date(
        (Date.parse(order.paidAt ?? "") || Date.now()) + (sub.recurrence_period ?? PLANS[plan].months * 30) * DAY_MS,
      ).toISOString();
  }

  await upsertSubscription(env, {
    id: sub.id,
    userId: await resolveUserId(env.DB, sub.id, order),
    email,
    plan,
    status: event === "refund" ? "refunded" : event === "chargeback" ? "chargeback" : isCanceled ? "canceled" : "active",
    amountCents: Math.round((Number.isFinite(amount) ? amount : PLANS[plan].amountCents / 100) * 100),
    paidUntil,
    revoke: isRevoked,
  });
  return "applied";
}

async function apiToken(env: Env): Promise<string> {
  if (!env.CAKTO_CLIENT_ID || !env.CAKTO_CLIENT_SECRET) throw new CaktoError(503, "cakto_api_not_configured");
  const res = await fetch(`${API}/public_api/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.CAKTO_CLIENT_ID, client_secret: env.CAKTO_CLIENT_SECRET }),
  });
  if (!res.ok) throw new CaktoError(502, "cakto_auth_failed");
  const { access_token } = await res.json<{ access_token?: string }>();
  if (!access_token) throw new CaktoError(502, "cakto_auth_failed");
  return access_token;
}

/** Cancela as próximas cobranças. O acesso já pago continua até o fim do período (paid_until). */
export async function cancelCaktoSubscription(env: Env, subscriptionId: string): Promise<void> {
  const token = await apiToken(env);
  const res = await fetch(`${API}/public_api/subscriptions/${encodeURIComponent(subscriptionId)}/cancel/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  // 400 = já cancelada: para o app, o resultado é o mesmo
  if (!res.ok && res.status !== 400) {
    const body = await res.text().catch(() => "");
    console.error(JSON.stringify({ message: "cakto cancel failed", status: res.status, body: body.slice(0, 300) }));
    throw new CaktoError(502, "cakto_cancel_failed");
  }
}
