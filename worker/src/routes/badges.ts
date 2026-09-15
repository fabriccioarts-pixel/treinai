import { Hono } from "hono";
import { BADGE_CATALOG, computeLevel } from "../lib/badges";

export const badgeRoutes = new Hono<{ Bindings: Env }>();

badgeRoutes.get("/", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "missing_userId" }, 400);

  const [{ results: unlocked }, sessionsRow, prRow, goalsRow] = await Promise.all([
    c.env.DB.prepare("SELECT badge_key, achieved_at FROM user_badges WHERE user_id = ?")
      .bind(userId)
      .all<{ badge_key: string; achieved_at: string }>(),
    c.env.DB
      .prepare("SELECT COUNT(*) AS n FROM workout_sessions WHERE user_id = ? AND finished_at IS NOT NULL")
      .bind(userId)
      .first<{ n: number }>(),
    c.env.DB
      .prepare("SELECT COUNT(*) AS n FROM personal_records WHERE user_id = ? AND type = 'carga'")
      .bind(userId)
      .first<{ n: number }>(),
    c.env.DB
      .prepare("SELECT COUNT(*) AS n FROM load_goals WHERE user_id = ? AND achieved_at IS NOT NULL")
      .bind(userId)
      .first<{ n: number }>(),
  ]);

  const unlockedMap = new Map(unlocked.map((u) => [u.badge_key, u.achieved_at]));
  const badges = BADGE_CATALOG.map((b) => ({
    ...b,
    unlocked: unlockedMap.has(b.key),
    achievedAt: unlockedMap.get(b.key) ?? null,
  }));

  const xp = (sessionsRow?.n ?? 0) * 20 + (prRow?.n ?? 0) * 10 + (goalsRow?.n ?? 0) * 50;
  const level = computeLevel(xp);

  return c.json({ badges, xp, ...level });
});
