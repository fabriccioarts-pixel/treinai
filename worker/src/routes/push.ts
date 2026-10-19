import { Hono } from "hono";
import { newId } from "../lib/id";
import { dueReminders, pushToUser, vapidFromEnv } from "../lib/reminders";

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

/**
 * Notificação de teste. Sem `kind`: boas-vindas logo depois de ativar, para a pessoa ver que funcionou.
 * Com `kind` ("agua" | "treino"): o lembrete real, com a mensagem motivacional, sem esperar o horário.
 */
pushRoutes.post("/test", async (c) => {
  const body = await c.req
    .json<{ userId?: string; kind?: string }>()
    .catch(() => ({}) as Record<string, never>);
  if (!body.userId) return c.json({ error: "missing_userId" }, 400);
  const vapid = vapidFromEnv(c.env);
  if (!vapid) return c.json({ error: "push_not_configured" }, 503);

  if (body.kind === "bom-dia" || body.kind === "agua" || body.kind === "treino") {
    const [message] = await dueReminders(c.env.DB, body.userId, new Date(), body.kind);
    // Água: meta de hoje já batida. Treino: nenhum treino cadastrado.
    if (!message) return c.json({ sent: 0, reason: body.kind === "agua" ? "water_goal_met" : "no_workout" });
    return c.json({ sent: await pushToUser(c.env.DB, vapid, body.userId, message) });
  }

  const sent = await pushToUser(c.env.DB, vapid, body.userId, {
    title: "Lembretes ativados",
    body: "Vou te dar bom dia, lembrar da água ao longo do dia e do treino às 18h. Bora!",
    url: "/",
    tag: "boas-vindas",
  });
  return c.json({ sent });
});
