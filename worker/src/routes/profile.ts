import { Hono } from "hono";
import { z } from "zod";
import { newId, nowIso } from "../lib/id";
import { ACTIVITY_LEVELS, GOALS, SEXES, ageFromBirthDate } from "../lib/nutrition";
import { loadProfileWithTargets } from "../lib/profile";

export const profileRoutes = new Hono<{ Bindings: Env }>();

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const profileSchema = z.object({
  userId: z.string().min(1),
  goal: z.enum(GOALS),
  emphasis: z.string().max(40).nullable().optional(),
  trainingDays: z.number().int().min(1).max(7),
  sex: z.enum(SEXES),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  heightCm: z.number().min(120).max(230),
  weightKg: z.number().min(30).max(300),
  bodyFatPct: z.number().min(3).max(60).nullable().optional(),
  targetWeightKg: z.number().min(30).max(300).nullable().optional(),
  activityLevel: z.enum(ACTIVITY_LEVELS),
  wakeTime: z.string().regex(TIME),
  sleepTime: z.string().regex(TIME),
  timezone: z.string().refine(isValidTimeZone),
  healthRestriction: z.boolean(),
  healthConsent: z.literal(true),
});

profileRoutes.get("/", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "missing_userId" }, 400);

  const data = await loadProfileWithTargets(c.env.DB, userId);
  return c.json(data ?? { profile: null });
});

profileRoutes.put("/", async (c) => {
  const parsed = profileSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_profile" }, 400);
  const p = parsed.data;

  const age = ageFromBirthDate(p.birthDate);
  if (Number.isNaN(age) || age < 13 || age > 100) return c.json({ error: "invalid_age" }, 400);

  const previous = await c.env.DB.prepare("SELECT weight_kg FROM user_profiles WHERE user_id = ?")
    .bind(p.userId)
    .first<{ weight_kg: number }>();
  const now = nowIso();

  const statements = [
    c.env.DB.prepare(
      `INSERT INTO user_profiles (user_id, goal, emphasis, training_days, sex, birth_date, height_cm, weight_kg,
         body_fat_pct, target_weight_kg, activity_level, wake_time, sleep_time, timezone, health_restriction,
         health_consent_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         goal = excluded.goal, emphasis = excluded.emphasis, training_days = excluded.training_days,
         sex = excluded.sex, birth_date = excluded.birth_date, height_cm = excluded.height_cm,
         weight_kg = excluded.weight_kg, body_fat_pct = excluded.body_fat_pct,
         target_weight_kg = excluded.target_weight_kg, activity_level = excluded.activity_level,
         wake_time = excluded.wake_time, sleep_time = excluded.sleep_time, timezone = excluded.timezone,
         health_restriction = excluded.health_restriction, updated_at = excluded.updated_at`
    ).bind(
      p.userId,
      p.goal,
      p.goal === "enfase" ? (p.emphasis ?? null) : null,
      p.trainingDays,
      p.sex,
      p.birthDate,
      p.heightCm,
      p.weightKg,
      p.bodyFatPct ?? null,
      p.targetWeightKg ?? null,
      p.activityLevel,
      p.wakeTime,
      p.sleepTime,
      p.timezone,
      p.healthRestriction ? 1 : 0,
      now,
      now,
      now,
    ),
  ];

  // Histórico de peso só quando o peso muda (base da recalibração futura do gasto)
  if (!previous || previous.weight_kg !== p.weightKg) {
    statements.push(
      c.env.DB.prepare("INSERT INTO weight_logs (id, user_id, weight_kg, logged_at) VALUES (?, ?, ?, ?)").bind(
        newId(),
        p.userId,
        p.weightKg,
        now,
      ),
    );
  }

  await c.env.DB.batch(statements);
  return c.json((await loadProfileWithTargets(c.env.DB, p.userId))!);
});

/** LGPD: apaga todos os dados de saúde do usuário (perfil, pesos e água) */
profileRoutes.delete("/", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "missing_userId" }, 400);

  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM water_logs WHERE user_id = ?").bind(userId),
    c.env.DB.prepare("DELETE FROM weight_logs WHERE user_id = ?").bind(userId),
    c.env.DB.prepare("DELETE FROM user_profiles WHERE user_id = ?").bind(userId),
  ]);
  return c.json({ ok: true });
});
