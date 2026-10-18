import { newId } from "./id";
import { localDate } from "./nutrition";
import { loadProfileWithTargets } from "./profile";

/*
 * XP do Treinai. Treinos, PRs e metas de carga continuam derivados das contagens (sempre
 * consistentes); o resto (água, refeições, calorias, missões) fica em xp_events, um registro
 * por (usuário, origem, referência) para nunca contar duas vezes.
 *
 * Tudo aqui tolera a migration 0010 ainda não ter rodado: sem as tabelas, cai no XP antigo.
 */

export const XP = {
  session: 20,
  pr: 10,
  goal: 50,
  waterGoal: 15,
  mealsLogged: 10,
  caloriesOnTarget: 20,
} as const;

/** Refeições registradas no dia para valer o XP de "registrou o dia" */
const MEALS_PER_DAY = 3;
/** Faixa em torno da meta de calorias que conta como "dentro da meta" */
const KCAL_TOLERANCE = 0.1;
const DEFAULT_TIME_ZONE = "America/Sao_Paulo";
const DEFAULT_WATER_TARGET_ML = 2000;
const DAY_MS = 86_400_000;
const SYNC_DAYS = 7;

export interface XpEvent {
  source: string;
  amount: number;
  label: string;
  createdAt: string;
}

/** Concede XP uma única vez por (origem, referência). Retorna true se foi concedido agora. */
export async function awardXp(
  db: D1Database,
  userId: string,
  source: string,
  ref: string,
  amount: number,
  label: string,
): Promise<boolean> {
  try {
    const result = await db
      .prepare(
        "INSERT OR IGNORE INTO xp_events (id, user_id, source, ref, amount, label) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(newId(), userId, source, ref, amount, label)
      .run();
    return (result.meta.changes ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function loadTotalXp(db: D1Database, userId: string): Promise<number> {
  const [sessions, prs, goals, events] = await Promise.all([
    db
      .prepare("SELECT COUNT(*) AS n FROM workout_sessions WHERE user_id = ? AND finished_at IS NOT NULL")
      .bind(userId)
      .first<{ n: number }>(),
    db
      .prepare("SELECT COUNT(*) AS n FROM personal_records WHERE user_id = ? AND type = 'carga'")
      .bind(userId)
      .first<{ n: number }>(),
    db
      .prepare("SELECT COUNT(*) AS n FROM load_goals WHERE user_id = ? AND achieved_at IS NOT NULL")
      .bind(userId)
      .first<{ n: number }>(),
    db
      .prepare("SELECT COALESCE(SUM(amount), 0) AS n FROM xp_events WHERE user_id = ?")
      .bind(userId)
      .first<{ n: number }>()
      .catch(() => null),
  ]);
  return (
    (sessions?.n ?? 0) * XP.session + (prs?.n ?? 0) * XP.pr + (goals?.n ?? 0) * XP.goal + (events?.n ?? 0)
  );
}

export async function loadRecentXp(db: D1Database, userId: string, limit = 6): Promise<XpEvent[]> {
  try {
    const { results } = await db
      .prepare(
        "SELECT source, amount, label, created_at FROM xp_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
      )
      .bind(userId, limit)
      .all<{ source: string; amount: number; label: string; created_at: string }>();
    return results.map((r) => ({ source: r.source, amount: r.amount, label: r.label, createdAt: r.created_at }));
  } catch {
    return [];
  }
}

/**
 * Concede o XP diário de nutrição dos últimos dias (água, refeições e calorias). Rodado sob
 * demanda, quando a pessoa abre o app: não depende de cron nem de mexer nas rotas de registro.
 * Calorias só valem para dias já encerrados, porque o dia de hoje ainda pode mudar.
 */
export async function syncDailyXp(db: D1Database, userId: string): Promise<void> {
  try {
    const plan = await loadProfileWithTargets(db, userId);
    const timeZone = plan?.profile.timezone ?? DEFAULT_TIME_ZONE;
    const today = localDate(timeZone);
    const since = localDate(timeZone, new Date(Date.now() - (SYNC_DAYS - 1) * DAY_MS));

    const [water, meals, sessions] = await Promise.all([
      db
        .prepare(
          `SELECT local_date, SUM(amount_ml) AS ml FROM water_logs
           WHERE user_id = ? AND local_date >= ? GROUP BY local_date`,
        )
        .bind(userId, since)
        .all<{ local_date: string; ml: number }>(),
      db
        .prepare(
          `SELECT local_date, COUNT(*) AS n, SUM(kcal) AS kcal FROM meals
           WHERE user_id = ? AND local_date >= ? GROUP BY local_date`,
        )
        .bind(userId, since)
        .all<{ local_date: string; n: number; kcal: number }>()
        .catch(() => ({ results: [] as { local_date: string; n: number; kcal: number }[] })),
      db
        .prepare(
          `SELECT finished_at FROM workout_sessions
           WHERE user_id = ? AND finished_at IS NOT NULL AND finished_at >= ?`,
        )
        .bind(userId, new Date(Date.now() - (SYNC_DAYS + 1) * DAY_MS).toISOString())
        .all<{ finished_at: string }>(),
    ]);

    const trainedDates = new Set(sessions.results.map((s) => localDate(timeZone, new Date(s.finished_at))));
    const waterTarget = (date: string) =>
      plan
        ? plan.targets.waterBaseMl + (trainedDates.has(date) ? plan.targets.waterTrainingExtraMl : 0)
        : DEFAULT_WATER_TARGET_ML;

    const awards: Promise<boolean>[] = [];
    for (const day of water.results) {
      if (day.ml >= waterTarget(day.local_date)) {
        awards.push(awardXp(db, userId, "agua", day.local_date, XP.waterGoal, "Meta de água batida"));
      }
    }
    for (const day of meals.results) {
      if (day.n >= MEALS_PER_DAY) {
        awards.push(awardXp(db, userId, "refeicoes", day.local_date, XP.mealsLogged, "Refeições do dia registradas"));
      }
      const target = plan?.targets.targetKcal;
      if (target && day.local_date < today && Math.abs(day.kcal - target) <= target * KCAL_TOLERANCE) {
        awards.push(awardXp(db, userId, "calorias", day.local_date, XP.caloriesOnTarget, "Dentro da meta de calorias"));
      }
    }
    await Promise.all(awards);
  } catch (err) {
    console.error("Erro ao sincronizar XP diário:", err);
  }
}
