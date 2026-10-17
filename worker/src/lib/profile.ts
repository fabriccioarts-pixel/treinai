import {
  ageFromBirthDate,
  calculateNutritionTargets,
  localDate,
  type ActivityLevel,
  type Goal,
  type NutritionTargets,
  type Sex,
} from "./nutrition";

export interface ProfileRow {
  user_id: string;
  goal: Goal;
  emphasis: string | null;
  training_days: number;
  sex: Sex;
  birth_date: string;
  height_cm: number;
  weight_kg: number;
  body_fat_pct: number | null;
  target_weight_kg: number | null;
  activity_level: ActivityLevel;
  wake_time: string;
  sleep_time: string;
  timezone: string;
  health_restriction: number;
  health_consent_at: string;
  updated_at: string;
}

export interface Profile {
  goal: Goal;
  emphasis: string | null;
  trainingDays: number;
  sex: Sex;
  birthDate: string;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  bodyFatPct: number | null;
  targetWeightKg: number | null;
  activityLevel: ActivityLevel;
  wakeTime: string;
  sleepTime: string;
  timezone: string;
  healthRestriction: boolean;
  updatedAt: string;
}

export interface ProfileWithTargets {
  profile: Profile;
  targets: NutritionTargets;
  /** Data de hoje no fuso do usuário */
  today: string;
  trainedToday: boolean;
  /** Meta de água de hoje: base + extra se já treinou */
  waterTodayMl: number;
}

const DAY_MS = 86_400_000;

export async function loadProfileWithTargets(db: D1Database, userId: string): Promise<ProfileWithTargets | null> {
  const row = await db.prepare("SELECT * FROM user_profiles WHERE user_id = ?").bind(userId).first<ProfileRow>();
  if (!row) return null;

  const { results: sessions } = await db
    .prepare(
      `SELECT finished_at, duration_seconds FROM workout_sessions
       WHERE user_id = ? AND finished_at IS NOT NULL AND finished_at >= ?`
    )
    .bind(userId, new Date(Date.now() - 14 * DAY_MS).toISOString())
    .all<{ finished_at: string; duration_seconds: number | null }>();

  const profile: Profile = {
    goal: row.goal,
    emphasis: row.emphasis,
    trainingDays: row.training_days,
    sex: row.sex,
    birthDate: row.birth_date,
    ageYears: ageFromBirthDate(row.birth_date),
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    bodyFatPct: row.body_fat_pct,
    targetWeightKg: row.target_weight_kg,
    activityLevel: row.activity_level,
    wakeTime: row.wake_time,
    sleepTime: row.sleep_time,
    timezone: row.timezone,
    healthRestriction: row.health_restriction === 1,
    updatedAt: row.updated_at,
  };

  const targets = calculateNutritionTargets({
    ...profile,
    trainingDaysPerWeek: profile.trainingDays,
    recentSessionMinutes: sessions
      .filter((s) => s.duration_seconds !== null && s.duration_seconds > 0)
      .map((s) => (s.duration_seconds as number) / 60),
  });

  const today = localDate(profile.timezone);
  const trainedToday = sessions.some((s) => localDate(profile.timezone, new Date(s.finished_at)) === today);

  return {
    profile,
    targets,
    today,
    trainedToday,
    waterTodayMl: targets.waterBaseMl + (trainedToday ? targets.waterTrainingExtraMl : 0),
  };
}
