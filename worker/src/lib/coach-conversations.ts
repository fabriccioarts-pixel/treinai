import { newId, nowIso } from "./id";

export type CoachAction = { type: "workout_created" | "workout_updated"; workoutId: string; name: string };

interface MessageRow {
  role: "user" | "assistant";
  content: string;
}

const TITLE_MAX = 60;
const ONBOARDING_TITLE = "Seu plano inicial";

/** Conversa do usuário, ou null se não existir ou for de outra pessoa */
export async function findConversation(db: D1Database, conversationId: string, userId: string) {
  return db
    .prepare("SELECT id FROM coach_conversations WHERE id = ? AND user_id = ?")
    .bind(conversationId, userId)
    .first<{ id: string }>();
}

/** Mensagens da conversa em ordem cronológica, incluindo as ocultas: é o histórico que vai para o modelo */
export async function loadModelHistory(db: D1Database, conversationId: string) {
  const { results } = await db
    .prepare("SELECT role, content FROM coach_messages WHERE conversation_id = ? ORDER BY created_at, rowid")
    .bind(conversationId)
    .all<MessageRow>();
  return results;
}

function titleFrom(message: string) {
  const oneLine = message.replace(/\s+/g, " ").trim();
  return oneLine.length > TITLE_MAX ? `${oneLine.slice(0, TITLE_MAX - 1).trimEnd()}…` : oneLine;
}

/**
 * Grava a pergunta e a resposta. Sem conversationId, abre uma conversa nova
 * com o título tirado da primeira mensagem. Devolve o id da conversa.
 */
export async function saveExchange(
  db: D1Database,
  input: {
    conversationId?: string;
    userId: string;
    message: string;
    hidden: boolean;
    reply: string;
    actions: CoachAction[];
  },
) {
  const now = nowIso();
  // A resposta precisa vir depois da pergunta mesmo quando as duas caem no mesmo milissegundo
  const replyAt = new Date(Date.parse(now) + 1).toISOString();
  const conversationId = input.conversationId ?? newId();

  const statements = [
    input.conversationId
      ? db.prepare("UPDATE coach_conversations SET updated_at = ? WHERE id = ?").bind(replyAt, conversationId)
      : db
          .prepare(
            "INSERT INTO coach_conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
          )
          .bind(conversationId, input.userId, input.hidden ? ONBOARDING_TITLE : titleFrom(input.message), now, replyAt),
    db
      .prepare(
        "INSERT INTO coach_messages (id, conversation_id, role, content, actions, hidden, created_at) VALUES (?, ?, 'user', ?, NULL, ?, ?)",
      )
      .bind(newId(), conversationId, input.message, input.hidden ? 1 : 0, now),
    db
      .prepare(
        "INSERT INTO coach_messages (id, conversation_id, role, content, actions, hidden, created_at) VALUES (?, ?, 'assistant', ?, ?, 0, ?)",
      )
      .bind(
        newId(),
        conversationId,
        input.reply,
        input.actions.length > 0 ? JSON.stringify(input.actions) : null,
        replyAt,
      ),
  ];
  await db.batch(statements);
  return conversationId;
}
