import { Hono } from "hono";
import { newId } from "../lib/id";

export const exerciseRoutes = new Hono<{ Bindings: Env }>();

exerciseRoutes.get("/", async (c) => {
  const userId = c.req.query("userId");
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM exercises WHERE user_id IS NULL OR user_id = ? ORDER BY muscle_group, name"
  )
    .bind(userId ?? "")
    .all();
  return c.json({ exercises: results });
});

exerciseRoutes.post("/", async (c) => {
  const body = await c.req.json<{
    userId: string;
    name: string;
    muscleGroup: string;
    equipment: string;
    type: string;
    videoSearchTerm?: string;
  }>();

  if (!body.userId || !body.name || !body.muscleGroup || !body.equipment || !body.type) {
    return c.json({ error: "invalid_input" }, 400);
  }

  const id = newId();
  await c.env.DB.prepare(
    `INSERT INTO exercises (id, user_id, name, muscle_group, equipment, type, video_search_term, is_custom)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
  )
    .bind(id, body.userId, body.name, body.muscleGroup, body.equipment, body.type, body.videoSearchTerm ?? null)
    .run();

  return c.json({ id }, 201);
});
