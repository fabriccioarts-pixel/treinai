import { Hono } from "hono";
import { hashPassword, verifyPassword, hashToken, generateToken } from "../lib/password";
import { sendPasswordResetEmail } from "../lib/email";
import { newId, nowIso } from "../lib/id";
import { seedDefaultWorkoutsForUser } from "../lib/seed-user";

export const authRoutes = new Hono<{ Bindings: Env }>();

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  google_id: string | null;
  created_at: string;
}

function publicUser(row: UserRow) {
  return { id: row.id, email: row.email, name: row.name, createdAt: row.created_at };
}

authRoutes.post("/register", async (c) => {
  const { email, name, password } = await c.req.json<{
    email?: string;
    name?: string;
    password?: string;
  }>();

  if (!email || !name || !password || password.length < 8) {
    return c.json({ error: "invalid_input" }, 400);
  }

  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first();
  if (existing) {
    return c.json({ error: "email_taken" }, 409);
  }

  const id = newId();
  const passwordHash = await hashPassword(password);
  await c.env.DB.prepare(
    "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(id, email.toLowerCase(), name, passwordHash, nowIso())
    .run();
  await seedDefaultWorkoutsForUser(c.env.DB, id);

  return c.json({ user: { id, email: email.toLowerCase(), name, createdAt: nowIso() } }, 201);
});

authRoutes.post("/login", async (c) => {
  const { email, password } = await c.req.json<{ email?: string; password?: string }>();
  if (!email || !password) return c.json({ error: "invalid_input" }, 400);

  const row = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<UserRow>();

  if (!row || !row.password_hash) {
    return c.json({ error: "invalid_credentials" }, 401);
  }

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) return c.json({ error: "invalid_credentials" }, 401);

  return c.json({ user: publicUser(row) });
});

authRoutes.post("/google", async (c) => {
  const { googleId, email, name } = await c.req.json<{
    googleId?: string;
    email?: string;
    name?: string;
  }>();
  if (!googleId || !email || !name) return c.json({ error: "invalid_input" }, 400);

  let row = await c.env.DB.prepare("SELECT * FROM users WHERE google_id = ?")
    .bind(googleId)
    .first<UserRow>();

  if (!row) {
    row = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?")
      .bind(email.toLowerCase())
      .first<UserRow>();

    if (row) {
      await c.env.DB.prepare("UPDATE users SET google_id = ? WHERE id = ?")
        .bind(googleId, row.id)
        .run();
      row.google_id = googleId;
    } else {
      const id = newId();
      const createdAt = nowIso();
      await c.env.DB.prepare(
        "INSERT INTO users (id, email, name, google_id, created_at) VALUES (?, ?, ?, ?, ?)"
      )
        .bind(id, email.toLowerCase(), name, googleId, createdAt)
        .run();
      row = { id, email: email.toLowerCase(), name, password_hash: null, google_id: googleId, created_at: createdAt };
      await seedDefaultWorkoutsForUser(c.env.DB, id);
    }
  }

  return c.json({ user: publicUser(row) });
});

authRoutes.post("/reset-request", async (c) => {
  const { email } = await c.req.json<{ email?: string }>();
  if (!email) return c.json({ error: "invalid_input" }, 400);

  const row = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<UserRow>();

  // Sempre responde ok, mesmo se o e-mail não existir, para não vazar quais
  // e-mails estão cadastrados.
  if (row && row.password_hash) {
    const token = generateToken();
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await c.env.DB.prepare(
      "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(newId(), row.id, tokenHash, expiresAt, nowIso())
      .run();

    const resetUrl = `${c.env.APP_URL}/redefinir-senha?token=${token}`;
    await sendPasswordResetEmail(c.env, row.email, resetUrl);
  }

  return c.json({ ok: true });
});

authRoutes.post("/reset-confirm", async (c) => {
  const { token, newPassword } = await c.req.json<{ token?: string; newPassword?: string }>();
  if (!token || !newPassword || newPassword.length < 8) {
    return c.json({ error: "invalid_input" }, 400);
  }

  const tokenHash = await hashToken(token);
  const row = await c.env.DB.prepare(
    "SELECT * FROM password_reset_tokens WHERE token_hash = ? AND used = 0"
  )
    .bind(tokenHash)
    .first<{ id: string; user_id: string; expires_at: string }>();

  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    return c.json({ error: "invalid_or_expired_token" }, 400);
  }

  const passwordHash = await hashPassword(newPassword);
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(
      passwordHash,
      row.user_id
    ),
    c.env.DB.prepare("UPDATE password_reset_tokens SET used = 1 WHERE id = ?").bind(row.id),
  ]);

  return c.json({ ok: true });
});
