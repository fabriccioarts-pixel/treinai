import { Hono } from "hono";
import { DEFAULT_TIME_ZONE, localDate } from "../lib/nutrition";
import { loadProfileWithTargets } from "../lib/profile";
import { logWaterRecord } from "../lib/meal-mutations";

export const waterRoutes = new Hono<{ Bindings: Env }>();

const DEFAULT_TARGET_ML = 2000;

/** Água de hoje (no fuso do usuário) e a meta do dia */
waterRoutes.get("/", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "missing_userId" }, 400);

  const plan = await loadProfileWithTargets(c.env.DB, userId);
  const date = plan?.today ?? localDate(DEFAULT_TIME_ZONE);

  const { results } = await c.env.DB.prepare(
    `SELECT id, amount_ml, logged_at FROM water_logs
     WHERE user_id = ? AND local_date = ? ORDER BY logged_at ASC`
  )
    .bind(userId, date)
    .all<{ id: string; amount_ml: number; logged_at: string }>();

  return c.json({
    date,
    totalMl: results.reduce((sum, r) => sum + r.amount_ml, 0),
    targetMl: plan?.waterTodayMl ?? DEFAULT_TARGET_ML,
    entries: results.map((r) => ({ id: r.id, amountMl: r.amount_ml, loggedAt: r.logged_at })),
  });
});

waterRoutes.post("/", async (c) => {
  const body = await c.req.json<{ userId?: string; amountMl?: number }>().catch(() => ({}) as Record<string, never>);
  const { userId, amountMl } = body;
  if (!userId) return c.json({ error: "missing_userId" }, 400);
  if (typeof amountMl !== "number" || !Number.isInteger(amountMl) || amountMl < 50 || amountMl > 2000) {
    return c.json({ error: "invalid_amount" }, 400);
  }

  const { id } = await logWaterRecord(c.env.DB, userId, amountMl);
  return c.json({ id });
});

waterRoutes.delete("/:id", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "missing_userId" }, 400);

  await c.env.DB.prepare("DELETE FROM water_logs WHERE id = ? AND user_id = ?")
    .bind(c.req.param("id"), userId)
    .run();
  return c.json({ ok: true });
});
