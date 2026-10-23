import { Hono, type Context } from "hono";
import { PLANS, getAccess, isPlanKey, trialDays } from "../lib/billing";
import { CaktoError, applyCaktoEvent, cancelCaktoSubscription, checkoutUrl, verifyCaktoWebhook, type CaktoOrder } from "../lib/cakto";
import { nowIso } from "../lib/id";
import { loadTrialRecap } from "../lib/trial-recap";

export const billingRoutes = new Hono<{ Bindings: Env }>();

function plansPayload() {
  return Object.entries(PLANS).map(([key, plan]) => ({ key, ...plan }));
}

/** Planos e duração do teste, para a oferta pública (sem usuário) */
billingRoutes.get("/plans", (c) => c.json({ plans: plansPayload(), trialDays: trialDays(c.env) }));

billingRoutes.get("/", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "invalid_input" }, 400);
  const access = await getAccess(c.env, userId);
  return c.json({ ...access, plans: plansPayload(), trialDays: trialDays(c.env) });
});

/** O que a pessoa fez desde o cadastro, para a tela de fim de teste (src/lib/trial-recap.ts) */
billingRoutes.get("/recap", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "invalid_input" }, 400);
  const recap = await loadTrialRecap(c.env.DB, userId);
  if (!recap) return c.json({ error: "user_not_found" }, 404);
  return c.json(recap);
});

/** Link de pagamento da Cakto para o plano, já com a conta e o contato da pessoa */
billingRoutes.post("/checkout", async (c) => {
  const { userId, plan } = await c.req.json<{ userId?: string; plan?: string }>();
  if (!userId || !isPlanKey(plan)) return c.json({ error: "invalid_input" }, 400);

  const user = await c.env.DB.prepare("SELECT id, name, email FROM users WHERE id = ?")
    .bind(userId)
    .first<{ id: string; name: string; email: string }>();
  if (!user) return c.json({ error: "user_not_found" }, 404);

  try {
    return c.json({ url: checkoutUrl(c.env, plan, user) });
  } catch (err) {
    if (err instanceof CaktoError) return c.json({ error: "billing_not_configured" }, 503);
    throw err;
  }
});

billingRoutes.post("/cancel", async (c) => {
  const { userId } = await c.req.json<{ userId?: string }>();
  if (!userId) return c.json({ error: "invalid_input" }, 400);

  const access = await getAccess(c.env, userId);
  const sub = access.subscription;
  if (!sub || sub.status !== "active") return c.json({ error: "subscription_not_found" }, 404);

  try {
    await cancelCaktoSubscription(c.env, sub.id);
  } catch (err) {
    if (err instanceof CaktoError && err.status === 503) return c.json({ error: "cancel_not_configured" }, 503);
    return c.json({ error: "cancel_failed" }, 502);
  }
  // O aviso subscription_canceled chega depois; grava já para a tela refletir o cancelamento
  await c.env.DB.prepare("UPDATE subscriptions SET status = 'canceled', updated_at = ? WHERE id = ?")
    .bind(nowIso(), sub.id)
    .run();
  return c.json({ ok: true, access: await getAccess(c.env, userId) });
});

/**
 * Webhook da Cakto. Rota pública: fica fora do segredo interno e é validada pela assinatura HMAC
 * (ou pelo `secret` do corpo). A Cakto não reenvia sozinha uma resposta não-2xx, então só o que é
 * nosso de verdade (falha no banco) volta 500, para aparecer como falha no histórico e ser reenviado.
 */
export async function handleCaktoWebhook(c: Context<{ Bindings: Env }>) {
  const rawBody = await c.req.text();
  let payload: { secret?: unknown; event?: string; data?: CaktoOrder | CaktoOrder[] };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json({ error: "invalid_body" }, 400);
  }

  const valid = await verifyCaktoWebhook(c.env, {
    rawBody,
    timestamp: c.req.header("x-cakto-timestamp"),
    signature: c.req.header("x-cakto-signature"),
    bodySecret: payload.secret,
  });
  if (!valid) return c.json({ error: "invalid_signature" }, 401);

  const event = payload.event ?? "";
  // Webhook V2 manda os pedidos da mesma cobrança numa lista
  const orders = Array.isArray(payload.data) ? payload.data : payload.data ? [payload.data] : [];
  try {
    const results = [];
    for (const order of orders) results.push(await applyCaktoEvent(c.env, event, order));
    console.log(JSON.stringify({ message: "cakto webhook", event, results }));
  } catch (err) {
    console.error(JSON.stringify({ message: "cakto webhook failed", event, error: err instanceof Error ? err.message : String(err) }));
    return c.json({ error: "webhook_failed" }, 500);
  }
  return c.json({ ok: true });
}
