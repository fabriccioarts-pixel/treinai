import { computeStreak, MAX_REST_DAYS, type StreakInfo } from "./streak";

/*
 * Escudos de constância: a cada SHIELD_EVERY dias seguidos a pessoa ganha um escudo (guarda até
 * MAX_SHIELDS). Se a constância estourar a folga, os escudos cobrem os dias que faltaram e ela
 * continua viva. Aplicado sob demanda, sempre que a constância é lida.
 *
 * Sem as tabelas da migration 0010, funciona como antes (sem escudos).
 */

export const SHIELD_EVERY = 7;
export const MAX_SHIELDS = 2;

const DAY_MS = 86_400_000;
const LOOKBACK_DAYS = 400;

export interface StreakWithShields extends StreakInfo {
  shields: number;
  shieldsUsedTotal: number;
  /** Dias (UTC) com treino concluído */
  finishedDays: Set<string>;
  /** Dias (UTC) cobertos por escudo */
  protectedDays: Set<string>;
  /** Escudos gastos nesta leitura, para avisar a pessoa */
  shieldsJustUsed: number;
}

export async function loadStreak(db: D1Database, userId: string, now = Date.now()): Promise<StreakWithShields> {
  const { results: trainedDays } = await db
    .prepare(
      `SELECT DISTINCT substr(finished_at, 1, 10) AS day FROM workout_sessions
       WHERE user_id = ? AND finished_at IS NOT NULL AND finished_at >= ?`,
    )
    .bind(userId, new Date(now - LOOKBACK_DAYS * DAY_MS).toISOString())
    .all<{ day: string }>();
  const finishedDays = new Set(trainedDays.map((r) => r.day));

  let state: { available: number; last_awarded_streak: number; used_total: number } | null = null;
  let protectedDays = new Set<string>();
  try {
    const [row, days] = await Promise.all([
      db
        .prepare("SELECT available, last_awarded_streak, used_total FROM streak_shields WHERE user_id = ?")
        .bind(userId)
        .first<{ available: number; last_awarded_streak: number; used_total: number }>(),
      db.prepare("SELECT day FROM streak_shield_days WHERE user_id = ?").bind(userId).all<{ day: string }>(),
    ]);
    state = row ?? { available: 0, last_awarded_streak: 0, used_total: 0 };
    protectedDays = new Set(days.results.map((d) => d.day));
  } catch {
    // Migration 0010 ainda não rodou: constância sem escudos
    return {
      ...computeStreak(finishedDays, now),
      shields: 0,
      shieldsUsedTotal: 0,
      finishedDays,
      protectedDays,
      shieldsJustUsed: 0,
    };
  }

  const dayKey = (daysBack: number) => new Date(now - daysBack * DAY_MS).toISOString().slice(0, 10);
  let streak = computeStreak(finishedDays, now, protectedDays);
  let { available, last_awarded_streak: lastAwarded, used_total: usedTotal } = state;
  const newProtected: string[] = [];

  let lastTrained = 0;
  while (lastTrained < LOOKBACK_DAYS && !finishedDays.has(dayKey(lastTrained))) lastTrained++;

  // Escudos ganhos pela sequência que existia até o último treino: quem não abriu o app
  // nos dias seguintes não perde o escudo que já tinha conquistado
  const chainAtLastTraining =
    lastTrained < LOOKBACK_DAYS ? computeStreak(finishedDays, now - lastTrained * DAY_MS, protectedDays).streakDays : 0;
  const milestone = Math.floor(chainAtLastTraining / SHIELD_EVERY) * SHIELD_EVERY;
  if (milestone > lastAwarded) {
    available = Math.min(MAX_SHIELDS, available + (milestone - lastAwarded) / SHIELD_EVERY);
    lastAwarded = milestone;
  } else if (chainAtLastTraining < lastAwarded) {
    // Sequência nova (a anterior quebrou): volta a contar do começo
    lastAwarded = milestone;
  }

  // Constância estourou a folga: tenta salvar com os escudos guardados
  if (streak.streakDays === 0 && available > 0) {
    const missed: string[] = [];
    for (let d = 1; d < lastTrained; d++) {
      const key = dayKey(d);
      if (!protectedDays.has(key)) missed.push(key);
    }
    const needed = missed.length - MAX_REST_DAYS;
    if (lastTrained < LOOKBACK_DAYS && needed > 0 && needed <= available) {
      // Protege os dias mais recentes; a folga fica com os mais antigos
      const candidate = new Set([...protectedDays, ...missed.slice(0, needed)]);
      const rescued = computeStreak(finishedDays, now, candidate);
      if (rescued.streakDays > 0) {
        newProtected.push(...missed.slice(0, needed));
        protectedDays = candidate;
        streak = rescued;
        available -= needed;
        usedTotal += needed;
      }
    }
  }

  const changed =
    newProtected.length > 0 ||
    available !== state.available ||
    lastAwarded !== state.last_awarded_streak ||
    usedTotal !== state.used_total;
  if (changed) {
    await db
      .batch([
        db
          .prepare(
            `INSERT INTO streak_shields (user_id, available, last_awarded_streak, used_total) VALUES (?, ?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET available = excluded.available,
               last_awarded_streak = excluded.last_awarded_streak, used_total = excluded.used_total`,
          )
          .bind(userId, available, lastAwarded, usedTotal),
        ...newProtected.map((day) =>
          db.prepare("INSERT OR IGNORE INTO streak_shield_days (user_id, day) VALUES (?, ?)").bind(userId, day),
        ),
      ])
      .catch((err) => console.error("Erro ao salvar escudos:", err));
  }

  return {
    ...streak,
    shields: available,
    shieldsUsedTotal: usedTotal,
    finishedDays,
    protectedDays,
    shieldsJustUsed: newProtected.length,
  };
}
