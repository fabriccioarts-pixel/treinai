import { Hono } from "hono";

export const userRoutes = new Hono<{ Bindings: Env }>();

interface UserAvatarRow {
  id: string;
  avatar_key: string | null;
}

userRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const user = await c.env.DB.prepare("SELECT id, email, name, avatar_key FROM users WHERE id = ?")
    .bind(id)
    .first<{ id: string; email: string; name: string; avatar_key: string | null }>();
  if (!user) return c.json({ error: "not_found" }, 404);

  return c.json({
    user: { id: user.id, email: user.email, name: user.name, hasAvatar: user.avatar_key !== null },
  });
});

const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

userRoutes.put("/:id/avatar", async (c) => {
  const id = c.req.param("id");
  const contentType = c.req.header("content-type") ?? "";
  if (!ALLOWED_PHOTO_TYPES.has(contentType)) {
    return c.json({ error: "unsupported_media_type" }, 415);
  }

  const user = await c.env.DB.prepare("SELECT id, avatar_key FROM users WHERE id = ?")
    .bind(id)
    .first<UserAvatarRow>();
  if (!user) return c.json({ error: "not_found" }, 404);

  const body = await c.req.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > MAX_PHOTO_BYTES) {
    return c.json({ error: "invalid_photo" }, 400);
  }

  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const key = `users/${id}.${extension}`;

  await c.env.PHOTOS.put(key, body, { httpMetadata: { contentType } });
  if (user.avatar_key && user.avatar_key !== key) {
    await c.env.PHOTOS.delete(user.avatar_key).catch(() => {});
  }
  await c.env.DB.prepare("UPDATE users SET avatar_key = ? WHERE id = ?").bind(key, id).run();

  return c.json({ ok: true, key });
});

userRoutes.get("/:id/avatar", async (c) => {
  const id = c.req.param("id");
  const user = await c.env.DB.prepare("SELECT avatar_key FROM users WHERE id = ?")
    .bind(id)
    .first<{ avatar_key: string | null }>();
  if (!user?.avatar_key) return c.json({ error: "not_found" }, 404);

  const object = await c.env.PHOTOS.get(user.avatar_key);
  if (!object) return c.json({ error: "not_found" }, 404);

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "private, max-age=300",
    },
  });
});

userRoutes.delete("/:id/avatar", async (c) => {
  const id = c.req.param("id");
  const user = await c.env.DB.prepare("SELECT avatar_key FROM users WHERE id = ?")
    .bind(id)
    .first<UserAvatarRow>();
  if (!user) return c.json({ error: "not_found" }, 404);

  if (user.avatar_key) {
    await c.env.PHOTOS.delete(user.avatar_key);
    await c.env.DB.prepare("UPDATE users SET avatar_key = NULL WHERE id = ?").bind(id).run();
  }

  return c.json({ ok: true });
});
