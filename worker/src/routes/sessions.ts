import { Hono } from "hono";
import { newId, nowIso } from "../lib/id";

export const sessionRoutes = new Hono<{ Bindings: Env }>();

sessionRoutes.post("/", async (c) => {
  const { userId, workoutId } = await c.req.json<{ userId: string; workoutId: string }>();
  if (!userId || !workoutId) return c.json({ error: "invalid_input" }, 400);

  const id = newId();
  await c.env.DB.prepare(
    "INSERT INTO workout_sessions (id, user_id, workout_id, started_at) VALUES (?, ?, ?, ?)"
  )
    .bind(id, userId, workoutId, nowIso())
    .run();

  return c.json({ id }, 201);
});

sessionRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const { finishedAt, durationSeconds } = await c.req.json<{
    finishedAt?: string;
    durationSeconds?: number;
  }>();

  await c.env.DB.prepare(
    "UPDATE workout_sessions SET finished_at = ?, duration_seconds = ? WHERE id = ?"
  )
    .bind(finishedAt ?? nowIso(), durationSeconds ?? null, id)
    .run();

  return c.json({ ok: true });
});

sessionRoutes.get("/", async (c) => {
  const userId = c.req.query("userId");
  const limit = Number(c.req.query("limit") ?? "20");
  if (!userId) return c.json({ error: "missing_userId" }, 400);

  const { results } = await c.env.DB.prepare(
    `SELECT s.*, w.name AS workout_name
     FROM workout_sessions s
     JOIN workouts w ON w.id = s.workout_id
     WHERE s.user_id = ?
     ORDER BY s.started_at DESC
     LIMIT ?`
  )
    .bind(userId, limit)
    .all();

  return c.json({ sessions: results });
});
