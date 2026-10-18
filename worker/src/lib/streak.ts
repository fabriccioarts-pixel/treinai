const DAY_MS = 86_400_000;
const MAX_LOOKBACK_DAYS = 400;

/** Dias seguidos sem treino tolerados sem quebrar a constância (folga). */
export const MAX_REST_DAYS = 1;

export interface StreakInfo {
  /** Dias com treino na sequência atual */
  streakDays: number;
  trainedToday: boolean;
  /** A folga já foi usada: se não treinar hoje, a constância quebra */
  atRisk: boolean;
  /** Sequência que acabou de quebrar (0 se não quebrou agora) */
  lostStreakDays: number;
}

/**
 * Constância com tolerância: entre dois treinos cabem até MAX_REST_DAYS dias de folga.
 * Hoje ainda não acabou, então não conta como dia perdido.
 * Dias protegidos (escudo usado) são neutros: não contam como treino nem gastam a folga.
 */
export function computeStreak(
  finishedDays: Set<string>,
  now = Date.now(),
  protectedDays: Set<string> = new Set(),
): StreakInfo {
  const dayKey = (daysBack: number) => new Date(now - daysBack * DAY_MS).toISOString().slice(0, 10);
  const trained = (daysBack: number) => finishedDays.has(dayKey(daysBack));
  const shielded = (daysBack: number) => !trained(daysBack) && protectedDays.has(dayKey(daysBack));

  const chainFrom = (start: number) => {
    let count = 0;
    let rest = 0;
    for (let d = start; d < MAX_LOOKBACK_DAYS; d++) {
      if (trained(d)) {
        count++;
        rest = 0;
      } else if (shielded(d)) {
        continue;
      } else if (++rest > MAX_REST_DAYS) {
        break;
      }
    }
    return count;
  };

  let lastTrained = 0;
  while (lastTrained < MAX_LOOKBACK_DAYS && !trained(lastTrained)) lastTrained++;

  // Dias completos sem treino desde o último (hoje não entra na conta; dias com escudo também não)
  let missedDays = 0;
  for (let d = 1; d < lastTrained; d++) if (!shielded(d)) missedDays++;
  const alive = lastTrained < MAX_LOOKBACK_DAYS && missedDays <= MAX_REST_DAYS;

  return {
    streakDays: alive ? chainFrom(lastTrained) : 0,
    trainedToday: lastTrained === 0,
    atRisk: alive && lastTrained > 0 && missedDays === MAX_REST_DAYS,
    // Quebrou ontem: a folga estourou exatamente no último dia completo
    lostStreakDays: missedDays === MAX_REST_DAYS + 1 ? chainFrom(lastTrained) : 0,
  };
}
