import { Hono } from "hono";
import { BADGE_CATALOG, computeLevel } from "../lib/badges";
import { loadTotalXp } from "../lib/xp";

export const badgeRoutes = new Hono<{ Bindings: Env }>();

badgeRoutes.get("/", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "missing_userId" }, 400);

  const [{ results: unlocked }, xp] = await Promise.all([
    c.env.DB.prepare("SELECT badge_key, achieved_at FROM user_badges WHERE user_id = ?")
      .bind(userId)
      .all<{ badge_key: string; achieved_at: string }>(),
    loadTotalXp(c.env.DB, userId),
  ]);

  const unlockedMap = new Map(unlocked.map((u) => [u.badge_key, u.achieved_at]));
  const badges = BADGE_CATALOG.map((b) => ({
    ...b,
    unlocked: unlockedMap.has(b.key),
    achievedAt: unlockedMap.get(b.key) ?? null,
  }));

  return c.json({ badges, xp, ...computeLevel(xp) });
});
