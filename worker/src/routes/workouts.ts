import { Hono } from "hono";
import { newId, nowIso } from "../lib/id";

export const workoutRoutes = new Hono<{ Bindings: Env }>();

interface WorkoutExerciseInput {
  exerciseId: string;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restTime: number;
  notes?: string;
}

workoutRoutes.get("/", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "missing_userId" }, 400);

  const { results } = await c.env.DB.prepare(
    `SELECT w.id, w.name, w.description, w.created_at,
            COUNT(we.id) AS exercise_count,
            GROUP_CONCAT(DISTINCT e.muscle_group) AS muscle_groups
     FROM workouts w
     LEFT JOIN workout_exercises we ON we.workout_id = w.id
     LEFT JOIN exercises e ON e.id = we.exercise_id
     WHERE w.user_id = ?
     GROUP BY w.id
     ORDER BY w.created_at DESC`
  )
    .bind(userId)
    .all();

  return c.json({ workouts: results });
});

workoutRoutes.post("/", async (c) => {
  const body = await c.req.json<{
    userId: string;
    name: string;
    description?: string;
    exercises: WorkoutExerciseInput[];
  }>();

  if (!body.userId || !body.name || !Array.isArray(body.exercises)) {
    return c.json({ error: "invalid_input" }, 400);
  }

  const workoutId = newId();
  const statements = [
    c.env.DB.prepare(
      "INSERT INTO workouts (id, user_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(workoutId, body.userId, body.name, body.description ?? null, nowIso()),
    ...body.exercises.map((we) =>
      c.env.DB.prepare(
        `INSERT INTO workout_exercises
          (id, workout_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_time, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId(),
        workoutId,
        we.exerciseId,
        we.order,
        we.targetSets,
        we.targetRepsMin,
        we.targetRepsMax,
        we.restTime,
        we.notes ?? null
      )
    ),
  ];

  await c.env.DB.batch(statements);
  return c.json({ id: workoutId }, 201);
});

workoutRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const workout = await c.env.DB.prepare("SELECT * FROM workouts WHERE id = ?").bind(id).first();
  if (!workout) return c.json({ error: "not_found" }, 404);

  const { results: exercises } = await c.env.DB.prepare(
    `SELECT we.*, e.name AS exercise_name, e.muscle_group, e.equipment
     FROM workout_exercises we
     JOIN exercises e ON e.id = we.exercise_id
     WHERE we.workout_id = ?
     ORDER BY we.order_index`
  )
    .bind(id)
    .all();

  return c.json({ workout: { ...workout, exercises } });
});

workoutRoutes.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{
    name: string;
    description?: string;
    exercises: WorkoutExerciseInput[];
  }>();

  if (!body.name || !Array.isArray(body.exercises)) {
    return c.json({ error: "invalid_input" }, 400);
  }

  const statements = [
    c.env.DB.prepare("UPDATE workouts SET name = ?, description = ? WHERE id = ?").bind(
      body.name,
      body.description ?? null,
      id
    ),
    c.env.DB.prepare("DELETE FROM workout_exercises WHERE workout_id = ?").bind(id),
    ...body.exercises.map((we) =>
      c.env.DB.prepare(
        `INSERT INTO workout_exercises
          (id, workout_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_time, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId(),
        id,
        we.exerciseId,
        we.order,
        we.targetSets,
        we.targetRepsMin,
        we.targetRepsMax,
        we.restTime,
        we.notes ?? null
      )
    ),
  ];

  await c.env.DB.batch(statements);
  return c.json({ ok: true });
});

workoutRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM workouts WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});
