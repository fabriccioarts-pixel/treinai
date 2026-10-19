import { newId, nowIso } from "./id";
import { localDate } from "./nutrition";

/*
 * Limite diário de conversa por voz (a parte mais cara da IA). Cada ligação recebe como prazo o que
 * resta dos minutos do dia; o cliente já desliga ao chegar no prazo. Ligação que não avisou o fim conta
 * até o prazo dela, então fechar o app no meio não dá minutos extras.
 */

export const DAILY_VOICE_MINUTES = 20;
/** O Gemini limita sessões só de áudio a 15 min */
export const MAX_CALL_MS = 15 * 60_000;
/** Menos que isso não vale abrir uma ligação */
const MIN_CALL_MS = 30_000;
const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

export type VoiceQuota =
  | { allowed: true; sessionId: string | null; allowedMs: number; remainingMs: number }
  | { allowed: false; remainingMs: 0 };

export async function startVoiceQuota(db: D1Database, userId: string): Promise<VoiceQuota> {
  const dailyMs = DAILY_VOICE_MINUTES * 60_000;
  try {
    const tz = await db
      .prepare("SELECT timezone FROM user_profiles WHERE user_id = ?")
      .bind(userId)
      .first<{ timezone: string }>();
    const today = localDate(tz?.timezone ?? DEFAULT_TIME_ZONE);
    const { results } = await db
      .prepare("SELECT started_at, allowed_ms, ended_at FROM voice_sessions WHERE user_id = ? AND local_date = ?")
      .bind(userId, today)
      .all<{ started_at: string; allowed_ms: number; ended_at: string | null }>();

    const now = Date.now();
    const usedMs = results.reduce((sum, s) => {
      const start = Date.parse(s.started_at);
      const end = Math.min(s.ended_at ? Date.parse(s.ended_at) : now, start + s.allowed_ms);
      return sum + Math.max(0, end - start);
    }, 0);
    const remainingMs = Math.max(0, dailyMs - usedMs);
    if (remainingMs < MIN_CALL_MS) return { allowed: false, remainingMs: 0 };

    const allowedMs = Math.min(MAX_CALL_MS, remainingMs);
    const sessionId = newId();
    await db
      .prepare("INSERT INTO voice_sessions (id, user_id, local_date, started_at, allowed_ms) VALUES (?, ?, ?, ?, ?)")
      .bind(sessionId, userId, today, nowIso(), allowedMs)
      .run();
    return { allowed: true, sessionId, allowedMs, remainingMs };
  } catch {
    // Migration 0011 ainda não rodou: sem limite diário, só o teto de 15 min por ligação
    return { allowed: true, sessionId: null, allowedMs: MAX_CALL_MS, remainingMs: dailyMs };
  }
}

/** Fim da ligação avisado pelo cliente: para de contar minutos a partir de agora */
export async function endVoiceSession(db: D1Database, userId: string, sessionId: string) {
  await db
    .prepare("UPDATE voice_sessions SET ended_at = ? WHERE id = ? AND user_id = ? AND ended_at IS NULL")
    .bind(nowIso(), sessionId, userId)
    .run()
    .catch(() => null);
}
