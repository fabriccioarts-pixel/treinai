import { Hono } from "hono";
import { newId, nowIso } from "../lib/id";

export const goalRoutes = new Hono<{ Bindings: Env }>();

goalRoutes.get("/", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "missing_userId" }, 400);

  const { results: goals } = await c.env.DB.prepare(
    `SELECT g.*, e.name AS exercise_name, e.muscle_group
     FROM load_goals g
     JOIN exercises e ON e.id = g.exercise_id
     WHERE g.user_id = ? AND g.active = 1
     ORDER BY g.created_at DESC`
  )
    .bind(userId)
    .all<{
      id: string;
      exercise_id: string;
      exercise_name: string;
      muscle_group: string;
      target_weight: number;
      target_reps: number;
      starting_weight: number;
      deadline: string | null;
      achieved_at: string | null;
      created_at: string;
    }>();

  const goalsWithProgress = await Promise.all(
    goals.map(async (goal) => {
      const best = await c.env.DB.prepare(
        "SELECT MAX(weight) AS best FROM personal_records WHERE user_id = ? AND exercise_id = ? AND type = 'carga'"
      )
        .bind(userId, goal.exercise_id)
        .first<{ best: number | null }>();

      const currentWeight = Math.max(best?.best ?? 0, goal.starting_weight);
      const span = goal.target_weight - goal.starting_weight;
      const progressPct =
        span <= 0
          ? 100
          : Math.min(100, Math.max(0, Math.round(((currentWeight - goal.starting_weight) / span) * 100)));

      return {
        id: goal.id,
        exerciseId: goal.exercise_id,
        exerciseName: goal.exercise_name,
        muscleGroup: goal.muscle_group,
        targetWeight: goal.target_weight,
        targetReps: goal.target_reps,
        startingWeight: goal.starting_weight,
        currentWeight,
        progressPct,
        deadline: goal.deadline,
        achievedAt: goal.achieved_at,
        createdAt: goal.created_at,
      };
    })
  );

  return c.json({ goals: goalsWithProgress });
});

goalRoutes.post("/", async (c) => {
  const body = await c.req.json<{
    userId?: string;
    exerciseId?: string;
    targetWeight?: number;
    targetReps?: number;
    deadline?: string;
  }>();

  if (!body.userId || !body.exerciseId || !body.targetWeight || body.targetWeight <= 0) {
    return c.json({ error: "invalid_input" }, 400);
  }

  const best = await c.env.DB.prepare(
    "SELECT MAX(weight) AS best FROM personal_records WHERE user_id = ? AND exercise_id = ? AND type = 'carga'"
  )
    .bind(body.userId, body.exerciseId)
    .first<{ best: number | null }>();

  const startingWeight = best?.best ?? 0;
  if (body.targetWeight <= startingWeight) {
    return c.json({ error: "target_below_current" }, 400);
  }

  const id = newId();
  await c.env.DB.prepare(
    `INSERT INTO load_goals (id, user_id, exercise_id, target_weight, target_reps, starting_weight, deadline, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.userId,
      body.exerciseId,
      body.targetWeight,
      body.targetReps ?? 1,
      startingWeight,
      body.deadline ?? null,
      nowIso()
    )
    .run();

  return c.json({ id }, 201);
});

goalRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("UPDATE load_goals SET active = 0 WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});
