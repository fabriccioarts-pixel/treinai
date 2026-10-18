import { Hono } from "hono";
import { BADGE_CATALOG, computeLevel, evaluateBadges } from "../lib/badges";
import { loadWeeklyMissions } from "../lib/missions";
import { loadStreak, MAX_SHIELDS, SHIELD_EVERY } from "../lib/streak-shields";
import { loadRecentXp, loadTotalXp, syncDailyXp, XP } from "../lib/xp";

export const gamificationRoutes = new Hono<{ Bindings: Env }>();

/**
 * Painel da gamificação: nível, missões da semana, escudos e XP recente.
 * Também concede o que estiver pendente (XP diário, missões completas, conquistas novas).
 */
gamificationRoutes.get("/", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "missing_userId" }, 400);
  const db = c.env.DB;

  await syncDailyXp(db, userId);
  const [missions, streak] = await Promise.all([loadWeeklyMissions(db, userId), loadStreak(db, userId)]);
  const newBadges = await evaluateBadges(db, userId);
  const [xp, recentXp] = await Promise.all([loadTotalXp(db, userId), loadRecentXp(db, userId)]);

  return c.json({
    xp,
    ...computeLevel(xp),
    missions,
    shields: {
      available: streak.shields,
      max: MAX_SHIELDS,
      every: SHIELD_EVERY,
      usedTotal: streak.shieldsUsedTotal,
      justUsed: streak.shieldsJustUsed,
      // Dias de constância que faltam para o próximo escudo
      nextIn: SHIELD_EVERY - (streak.streakDays % SHIELD_EVERY),
    },
    recentXp,
    newBadges,
  });
});

/** Resumo de um treino concluído: XP ganho, nível antes/depois, PRs, conquistas e missões */
gamificationRoutes.get("/session/:id", async (c) => {
  const userId = c.req.query("userId");
  const sessionId = c.req.param("id");
  if (!userId) return c.json({ error: "missing_userId" }, 400);
  const db = c.env.DB;

  const session = await db
    .prepare(
      `SELECT s.id, s.started_at, s.finished_at, s.duration_seconds, w.name AS workout_name
       FROM workout_sessions s JOIN workouts w ON w.id = s.workout_id
       WHERE s.id = ? AND s.user_id = ?`,
    )
    .bind(sessionId, userId)
    .first<{ id: string; started_at: string; finished_at: string | null; duration_seconds: number | null; workout_name: string }>();
  if (!session || !session.finished_at) return c.json({ error: "not_found" }, 404);

  const from = session.started_at;
  // Margem para missões e conquistas concedidas logo depois de finalizar
  const until = new Date(Date.parse(session.finished_at) + 10 * 60_000).toISOString();

  const [setsRes, prsRes, goalsRes, badgesRes, missionsRes, streak] = await Promise.all([
    db
      .prepare(
        `SELECT st.exercise_id, st.weight, st.reps, e.name AS exercise_name FROM sets st
         JOIN exercises e ON e.id = st.exercise_id
         WHERE st.session_id = ? AND st.completed = 1`,
      )
      .bind(sessionId)
      .all<{ exercise_id: string; weight: number; reps: number; exercise_name: string }>(),
    db
      .prepare(
        `SELECT pr.weight, pr.reps, e.name AS exercise_name FROM personal_records pr
         JOIN exercises e ON e.id = pr.exercise_id
         WHERE pr.user_id = ? AND pr.type = 'carga' AND pr.achieved_at >= ? AND pr.achieved_at <= ?`,
      )
      .bind(userId, from, session.finished_at)
      .all<{ weight: number; reps: number; exercise_name: string }>(),
    db
      .prepare("SELECT COUNT(*) AS n FROM load_goals WHERE user_id = ? AND achieved_at >= ? AND achieved_at <= ?")
      .bind(userId, from, session.finished_at)
      .first<{ n: number }>(),
    db
      .prepare("SELECT badge_key FROM user_badges WHERE user_id = ? AND achieved_at >= ? AND achieved_at <= ?")
      .bind(userId, from, until)
      .all<{ badge_key: string }>(),
    db
      .prepare(
        "SELECT label, amount FROM xp_events WHERE user_id = ? AND source = 'missao' AND created_at >= datetime(?) AND created_at <= datetime(?)",
      )
      .bind(userId, from, until)
      .all<{ label: string; amount: number }>()
      .catch(() => ({ results: [] as { label: string; amount: number }[] })),
    loadStreak(db, userId),
  ]);

  const sets = setsRes.results;
  const missionXp = missionsRes.results.reduce((sum, m) => sum + m.amount, 0);
  const xpGained = XP.session + prsRes.results.length * XP.pr + (goalsRes?.n ?? 0) * XP.goal + missionXp;
  const xpNow = await loadTotalXp(db, userId);
  const badgeKeys = new Set(badgesRes.results.map((b) => b.badge_key));

  return c.json({
    workoutName: session.workout_name,
    durationSeconds: session.duration_seconds ?? 0,
    sets: sets.length,
    exercises: new Set(sets.map((s) => s.exercise_id)).size,
    volumeKg: Math.round(sets.reduce((sum, s) => sum + s.weight * s.reps, 0)),
    prs: prsRes.results.map((p) => ({ exerciseName: p.exercise_name, weight: p.weight, reps: p.reps })),
    xpGained,
    xpBreakdown: [
      { label: "Treino concluído", amount: XP.session },
      ...(prsRes.results.length > 0 ? [{ label: `${prsRes.results.length} recorde(s) de carga`, amount: prsRes.results.length * XP.pr }] : []),
      ...((goalsRes?.n ?? 0) > 0 ? [{ label: "Meta de carga batida", amount: (goalsRes?.n ?? 0) * XP.goal }] : []),
      ...missionsRes.results.map((m) => ({ label: m.label, amount: m.amount })),
    ],
    levelBefore: computeLevel(Math.max(0, xpNow - xpGained)),
    levelAfter: computeLevel(xpNow),
    badges: BADGE_CATALOG.filter((b) => badgeKeys.has(b.key)),
    streakDays: streak.streakDays,
  });
});
