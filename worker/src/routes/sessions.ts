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

sessionRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const session = await c.env.DB.prepare("SELECT * FROM workout_sessions WHERE id = ?")
    .bind(id)
    .first();
  if (!session) return c.json({ error: "not_found" }, 404);
  return c.json({ session });
});

const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

sessionRoutes.put("/:id/photo", async (c) => {
  const id = c.req.param("id");
  const contentType = c.req.header("content-type") ?? "";
  if (!ALLOWED_PHOTO_TYPES.has(contentType)) {
    return c.json({ error: "unsupported_media_type" }, 415);
  }

  const session = await c.env.DB.prepare("SELECT id FROM workout_sessions WHERE id = ?")
    .bind(id)
    .first();
  if (!session) return c.json({ error: "not_found" }, 404);

  const body = await c.req.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > MAX_PHOTO_BYTES) {
    return c.json({ error: "invalid_photo" }, 400);
  }

  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const key = `sessions/${id}.${extension}`;

  await c.env.PHOTOS.put(key, body, { httpMetadata: { contentType } });
  await c.env.DB.prepare("UPDATE workout_sessions SET photo_key = ? WHERE id = ?").bind(key, id).run();

  return c.json({ ok: true, key });
});

sessionRoutes.get("/:id/photo", async (c) => {
  const id = c.req.param("id");
  const session = await c.env.DB.prepare("SELECT photo_key FROM workout_sessions WHERE id = ?")
    .bind(id)
    .first<{ photo_key: string | null }>();
  if (!session?.photo_key) return c.json({ error: "not_found" }, 404);

  const object = await c.env.PHOTOS.get(session.photo_key);
  if (!object) return c.json({ error: "not_found" }, 404);

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
});

sessionRoutes.delete("/:id/photo", async (c) => {
  const id = c.req.param("id");
  const session = await c.env.DB.prepare("SELECT photo_key FROM workout_sessions WHERE id = ?")
    .bind(id)
    .first<{ photo_key: string | null }>();
  if (!session) return c.json({ error: "not_found" }, 404);

  if (session.photo_key) {
    await c.env.PHOTOS.delete(session.photo_key);
    await c.env.DB.prepare("UPDATE workout_sessions SET photo_key = NULL WHERE id = ?").bind(id).run();
  }

  return c.json({ ok: true });
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
  const withPhoto = c.req.query("withPhoto") === "1";
  if (!userId) return c.json({ error: "missing_userId" }, 400);

  const { results } = await c.env.DB.prepare(
    `SELECT s.*, w.name AS workout_name
     FROM workout_sessions s
     JOIN workouts w ON w.id = s.workout_id
     WHERE s.user_id = ?${withPhoto ? " AND s.photo_key IS NOT NULL" : ""}
     ORDER BY s.started_at DESC
     LIMIT ?`
  )
    .bind(userId, limit)
    .all();

  return c.json({ sessions: results });
});
