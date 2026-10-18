import { Hono } from "hono";
import { findConversation, type CoachAction } from "../lib/coach-conversations";

export const coachConversationRoutes = new Hono<{ Bindings: Env }>();

const LIST_LIMIT = 100;
const PREVIEW_MAX = 90;

coachConversationRoutes.get("/", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "missing_userId" }, 400);

  // Prévia = última resposta do Théo, para reconhecer a conversa na lista
  const { results } = await c.env.DB.prepare(
    `SELECT cc.id, cc.title, cc.updated_at,
            (SELECT substr(m.content, 1, ?) FROM coach_messages m
             WHERE m.conversation_id = cc.id AND m.role = 'assistant'
             ORDER BY m.created_at DESC LIMIT 1) AS preview
     FROM coach_conversations cc
     WHERE cc.user_id = ?
     ORDER BY cc.updated_at DESC
     LIMIT ?`
  )
    .bind(PREVIEW_MAX, userId, LIST_LIMIT)
    .all<{ id: string; title: string; updated_at: string; preview: string | null }>();

  return c.json({ conversations: results });
});

coachConversationRoutes.get("/:id", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "missing_userId" }, 400);

  const conversation = await c.env.DB.prepare(
    "SELECT id, title, updated_at FROM coach_conversations WHERE id = ? AND user_id = ?"
  )
    .bind(c.req.param("id"), userId)
    .first<{ id: string; title: string; updated_at: string }>();
  if (!conversation) return c.json({ error: "not_found" }, 404);

  const { results } = await c.env.DB.prepare(
    `SELECT id, role, content, actions, created_at FROM coach_messages
     WHERE conversation_id = ? AND hidden = 0
     ORDER BY created_at, rowid`
  )
    .bind(conversation.id)
    .all<{ id: string; role: "user" | "assistant"; content: string; actions: string | null; created_at: string }>();

  const messages = results.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    actions: m.actions ? (JSON.parse(m.actions) as CoachAction[]) : [],
    createdAt: m.created_at,
  }));

  return c.json({ conversation, messages });
});

const TITLE_MAX = 80;

coachConversationRoutes.patch("/:id", async (c) => {
  const { userId, title } = await c.req.json<{ userId?: string; title?: string }>();
  const cleanTitle = title?.replace(/\s+/g, " ").trim().slice(0, TITLE_MAX);
  if (!userId || !cleanTitle) return c.json({ error: "invalid_input" }, 400);

  const conversation = await findConversation(c.env.DB, c.req.param("id"), userId);
  if (!conversation) return c.json({ error: "not_found" }, 404);

  // Renomear não mexe em updated_at: a conversa não sobe na lista só por ganhar nome novo
  await c.env.DB.prepare("UPDATE coach_conversations SET title = ? WHERE id = ?").bind(cleanTitle, conversation.id).run();
  return c.json({ ok: true, title: cleanTitle });
});

coachConversationRoutes.delete("/:id", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "missing_userId" }, 400);

  const conversation = await findConversation(c.env.DB, c.req.param("id"), userId);
  if (!conversation) return c.json({ error: "not_found" }, 404);

  // D1 não garante ON DELETE CASCADE sem PRAGMA foreign_keys; apaga as mensagens explicitamente
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM coach_messages WHERE conversation_id = ?").bind(conversation.id),
    c.env.DB.prepare("DELETE FROM coach_conversations WHERE id = ?").bind(conversation.id),
  ]);
  return c.json({ ok: true });
});
