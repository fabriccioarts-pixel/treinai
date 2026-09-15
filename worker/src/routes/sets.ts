import { Hono } from "hono";
import { newId, nowIso } from "../lib/id";
import { estimateOneRepMax, setVolume } from "../lib/calculations";
import { evaluateBadges, type BadgeDef } from "../lib/badges";

export const setRoutes = new Hono<{ Bindings: Env }>();

setRoutes.get("/", async (c) => {
  const sessionId = c.req.query("sessionId");
  const exerciseId = c.req.query("exerciseId");
  const userId = c.req.query("userId");
  const limit = Number(c.req.query("limit") ?? "50");

  if (sessionId) {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM sets WHERE session_id = ? ORDER BY set_number"
    )
      .bind(sessionId)
      .all();
    return c.json({ sets: results });
  }

  if (exerciseId && userId) {
    const { results } = await c.env.DB.prepare(
      `SELECT st.* FROM sets st
       JOIN workout_sessions ws ON ws.id = st.session_id
       WHERE st.exercise_id = ? AND ws.user_id = ? AND st.completed = 1
       ORDER BY st.created_at DESC
       LIMIT ?`
    )
      .bind(exerciseId, userId, limit)
      .all();
    return c.json({ sets: results });
  }

  return c.json({ error: "missing_query" }, 400);
});

setRoutes.post("/", async (c) => {
  const body = await c.req.json<{
    sessionId: string;
    exerciseId: string;
    setNumber: number;
    weight: number;
    reps: number;
    rpe?: number;
    completed?: boolean;
  }>();

  if (!body.sessionId || !body.exerciseId || body.weight == null || body.reps == null) {
    return c.json({ error: "invalid_input" }, 400);
  }

  const id = newId();
  const createdAt = nowIso();
  await c.env.DB.prepare(
    `INSERT INTO sets (id, session_id, exercise_id, set_number, weight, reps, rpe, completed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.sessionId,
      body.exerciseId,
      body.setNumber,
      body.weight,
      body.reps,
      body.rpe ?? null,
      body.completed === false ? 0 : 1,
      createdAt
    )
    .run();

  const newPRs = await detectAndSavePRs(c.env, body.sessionId, body.exerciseId, body.weight, body.reps);

  const session = await c.env.DB.prepare("SELECT user_id FROM workout_sessions WHERE id = ?")
    .bind(body.sessionId)
    .first<{ user_id: string }>();

  let newGoals: { id: string; exerciseName: string; targetWeight: number }[] = [];
  let newBadges: BadgeDef[] = [];
  if (session) {
    if (newPRs.some((pr) => pr.type === "carga")) {
      newGoals = await checkGoalAchievements(c.env.DB, session.user_id, body.exerciseId, body.weight);
    }
    newBadges = await evaluateBadges(c.env.DB, session.user_id);
  }

  return c.json({ id, newPRs, newGoals, newBadges }, 201);
});

async function checkGoalAchievements(db: D1Database, userId: string, exerciseId: string, currentWeight: number) {
  const { results: goals } = await db
    .prepare(
      `SELECT g.id, g.target_weight, e.name AS exercise_name FROM load_goals g
       JOIN exercises e ON e.id = g.exercise_id
       WHERE g.user_id = ? AND g.exercise_id = ? AND g.active = 1 AND g.achieved_at IS NULL AND g.target_weight <= ?`
    )
    .bind(userId, exerciseId, currentWeight)
    .all<{ id: string; target_weight: number; exercise_name: string }>();

  if (goals.length === 0) return [];

  await db.batch(
    goals.map((g) =>
      db.prepare("UPDATE load_goals SET achieved_at = ? WHERE id = ?").bind(nowIso(), g.id)
    )
  );

  return goals.map((g) => ({ id: g.id, exerciseName: g.exercise_name, targetWeight: g.target_weight }));
}

async function detectAndSavePRs(
  env: Env,
  sessionId: string,
  exerciseId: string,
  weight: number,
  reps: number
) {
  const session = await env.DB.prepare("SELECT user_id FROM workout_sessions WHERE id = ?")
    .bind(sessionId)
    .first<{ user_id: string }>();
  if (!session) return [];
  const userId = session.user_id;

  const oneRm = estimateOneRepMax(weight, reps);
  const volume = setVolume(weight, reps);
  const achievedAt = nowIso();
  const newPRs: { type: string; weight: number; reps: number }[] = [];
  const inserts = [];

  const bestLoad = await env.DB.prepare(
    "SELECT MAX(weight) AS best FROM personal_records WHERE user_id = ? AND exercise_id = ? AND type = 'carga'"
  )
    .bind(userId, exerciseId)
    .first<{ best: number | null }>();
  if (!bestLoad?.best || weight > bestLoad.best) {
    inserts.push(
      env.DB.prepare(
        `INSERT INTO personal_records (id, user_id, exercise_id, type, weight, reps, estimated_one_rep_max, volume, achieved_at)
         VALUES (?, ?, ?, 'carga', ?, ?, ?, ?, ?)`
      ).bind(newId(), userId, exerciseId, weight, reps, oneRm, volume, achievedAt)
    );
    newPRs.push({ type: "carga", weight, reps });
  }

  const bestRepsAtWeight = await env.DB.prepare(
    "SELECT MAX(reps) AS best FROM personal_records WHERE user_id = ? AND exercise_id = ? AND type = 'repeticoes' AND weight = ?"
  )
    .bind(userId, exerciseId, weight)
    .first<{ best: number | null }>();
  if (!bestRepsAtWeight?.best || reps > bestRepsAtWeight.best) {
    inserts.push(
      env.DB.prepare(
        `INSERT INTO personal_records (id, user_id, exercise_id, type, weight, reps, estimated_one_rep_max, volume, achieved_at)
         VALUES (?, ?, ?, 'repeticoes', ?, ?, ?, ?, ?)`
      ).bind(newId(), userId, exerciseId, weight, reps, oneRm, volume, achievedAt)
    );
    newPRs.push({ type: "repeticoes", weight, reps });
  }

  const bestOneRm = await env.DB.prepare(
    "SELECT MAX(estimated_one_rep_max) AS best FROM personal_records WHERE user_id = ? AND exercise_id = ? AND type = '1rm'"
  )
    .bind(userId, exerciseId)
    .first<{ best: number | null }>();
  if (!bestOneRm?.best || oneRm > bestOneRm.best) {
    inserts.push(
      env.DB.prepare(
        `INSERT INTO personal_records (id, user_id, exercise_id, type, weight, reps, estimated_one_rep_max, volume, achieved_at)
         VALUES (?, ?, ?, '1rm', ?, ?, ?, ?, ?)`
      ).bind(newId(), userId, exerciseId, weight, reps, oneRm, volume, achievedAt)
    );
    newPRs.push({ type: "1rm", weight, reps });
  }

  const bestVolume = await env.DB.prepare(
    "SELECT MAX(volume) AS best FROM personal_records WHERE user_id = ? AND exercise_id = ? AND type = 'volume'"
  )
    .bind(userId, exerciseId)
    .first<{ best: number | null }>();
  if (!bestVolume?.best || volume > bestVolume.best) {
    inserts.push(
      env.DB.prepare(
        `INSERT INTO personal_records (id, user_id, exercise_id, type, weight, reps, estimated_one_rep_max, volume, achieved_at)
         VALUES (?, ?, ?, 'volume', ?, ?, ?, ?, ?)`
      ).bind(newId(), userId, exerciseId, weight, reps, oneRm, volume, achievedAt)
    );
    newPRs.push({ type: "volume", weight, reps });
  }

  if (inserts.length) await env.DB.batch(inserts);
  return newPRs;
}
