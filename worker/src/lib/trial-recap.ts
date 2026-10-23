import { loadStreak } from "./streak-shields";
import { loadDiagnosticAnswers } from "./diagnostic-summary";

/*
 * Resumo do que a pessoa fez desde o cadastro: alimenta a tela de fim de teste (/assinar) e os
 * e-mails do teste. Tabelas opcionais (migração ainda não rodou) contam zero.
 */

export interface TrialRecap {
  firstName: string;
  daysSinceSignup: number;
  workoutsDone: number;
  workoutsCreated: number;
  meals: number;
  waterMl: number;
  records: number;
  coachMessages: number;
  hasMealPlan: boolean;
  streakDays: number;
  goal: { weightKg: number; targetKg: number } | null;
}

/** Datas do D1: "AAAA-MM-DD HH:MM:SS" (UTC, sem fuso) ou ISO completo */
export function parseDbDate(value: string): number {
  return Date.parse(/[zZ]$|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(" ", "T")}Z`);
}

export async function loadTrialRecap(db: D1Database, userId: string): Promise<TrialRecap | null> {
  const user = await db.prepare("SELECT name, created_at FROM users WHERE id = ?")
    .bind(userId)
    .first<{ name: string; created_at: string }>();
  if (!user) return null;

  const count = async (sql: string) => {
    try {
      return (await db.prepare(sql).bind(userId).first<{ n: number }>())?.n ?? 0;
    } catch {
      return 0;
    }
  };

  const [workoutsDone, workoutsCreated, meals, waterMl, records, coachMessages, mealPlans, streak, profile, diagnostic] =
    await Promise.all([
      count("SELECT COUNT(*) AS n FROM workout_sessions WHERE user_id = ? AND finished_at IS NOT NULL"),
      count("SELECT COUNT(*) AS n FROM workouts WHERE user_id = ? AND archived_at IS NULL"),
      count("SELECT COUNT(*) AS n FROM meals WHERE user_id = ?"),
      count("SELECT COALESCE(SUM(amount_ml), 0) AS n FROM water_logs WHERE user_id = ?"),
      count("SELECT COUNT(*) AS n FROM personal_records WHERE user_id = ?"),
      count(
        `SELECT COUNT(*) AS n FROM coach_messages m JOIN coach_conversations c ON c.id = m.conversation_id
         WHERE c.user_id = ? AND m.role = 'user' AND m.hidden = 0`,
      ),
      count("SELECT COUNT(*) AS n FROM meal_plans WHERE user_id = ?"),
      loadStreak(db, userId).catch(() => null),
      db.prepare("SELECT weight_kg, target_weight_kg FROM user_profiles WHERE user_id = ?")
        .bind(userId)
        .first<{ weight_kg: number; target_weight_kg: number | null }>()
        .catch(() => null),
      loadDiagnosticAnswers(db, userId),
    ]);

  const weightKg = profile?.weight_kg ?? (Number(diagnostic?.peso) || null);
  const targetKg = profile?.target_weight_kg ?? (Number(diagnostic?.peso_meta) || null);
  const since = parseDbDate(user.created_at);

  return {
    firstName: (user.name || diagnostic?.nome || "").trim().split(/\s+/)[0] ?? "",
    daysSinceSignup: Number.isFinite(since) ? Math.max(1, Math.ceil((Date.now() - since) / 86_400_000)) : 1,
    workoutsDone,
    workoutsCreated,
    meals,
    waterMl,
    records,
    coachMessages,
    hasMealPlan: mealPlans > 0,
    streakDays: streak?.streakDays ?? 0,
    goal: weightKg && targetKg ? { weightKg, targetKg } : null,
  };
}
