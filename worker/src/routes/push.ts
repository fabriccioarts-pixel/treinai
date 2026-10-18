import { Hono } from "hono";
import { newId } from "../lib/id";
import { pushToUser, vapidFromEnv } from "../lib/reminders";

export const pushRoutes = new Hono<{ Bindings: Env }>();

/** Salva (ou move para este usuário) a inscrição de push de um aparelho */
pushRoutes.post("/subscribe", async (c) => {
  const body = await c.req
    .json<{ userId?: string; endpoint?: string; p256dh?: string; auth?: string }>()
    .catch(() => ({}) as Record<string, never>);
  const { userId, endpoint, p256dh, auth } = body;
  if (!userId || !endpoint || !p256dh || !auth || !endpoint.startsWith("https://")) {
    return c.json({ error: "invalid_subscription" }, 400);
  }

  await c.env.DB.prepare(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
  )
    .bind(newId(), userId, endpoint, p256dh, auth)
    .run();
  return c.json({ ok: true });
});

pushRoutes.post("/unsubscribe", async (c) => {
  const body = await c.req.json<{ userId?: string; endpoint?: string }>().catch(() => ({}) as Record<string, never>);
  if (!body.userId || !body.endpoint) return c.json({ error: "invalid_input" }, 400);
  await c.env.DB.prepare("DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?")
    .bind(body.userId, body.endpoint)
    .run();
  return c.json({ ok: true });
});

/** Notificação de boas-vindas logo depois de ativar, para a pessoa ver que funcionou */
pushRoutes.post("/test", async (c) => {
  const body = await c.req.json<{ userId?: string }>().catch(() => ({}) as Record<string, never>);
  if (!body.userId) return c.json({ error: "missing_userId" }, 400);
  const vapid = vapidFromEnv(c.env);
  if (!vapid) return c.json({ error: "push_not_configured" }, 503);

  const sent = await pushToUser(c.env.DB, vapid, body.userId, {
    title: "Lembretes ativados",
    body: "Vou te lembrar de beber água ao longo do dia e do treino às 18h. Bora!",
    url: "/",
    tag: "boas-vindas",
  });
  return c.json({ sent });
});
