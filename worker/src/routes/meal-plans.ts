import { Hono } from "hono";
import { z } from "zod";
import { newId, nowIso } from "../lib/id";
import { loadProfileWithTargets } from "../lib/profile";
import { requireAiAccess } from "../lib/billing";
import { generateMealPlan, MealPlanError, MealPlanPreferencesSchema, type MealPlan } from "../lib/meal-plan";

export const mealPlanRoutes = new Hono<{ Bindings: Env }>();

/** Cada geração custa uma chamada grande de IA: até 3 cardápios novos por dia */
const DAILY_LIMIT = 3;

const GOAL_TEXT: Record<string, string> = {
  hipertrofia: "hipertrofia (ganhar massa muscular)",
  emagrecimento: "emagrecimento (perder gordura mantendo músculo)",
  "ganho-massa": "ganho de massa e força",
  enfase: "hipertrofia com ênfase em um grupo muscular",
};

interface MealPlanRow {
  id: string;
  preferences: string;
  plan: string;
  created_at: string;
}

const toResponse = (row: MealPlanRow) => ({
  id: row.id,
  createdAt: row.created_at,
  preferences: JSON.parse(row.preferences),
  plan: JSON.parse(row.plan) as MealPlan,
});

/** Cardápio mais recente da pessoa */
mealPlanRoutes.get("/", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "missing_userId" }, 400);
  const row = await c.env.DB.prepare(
    "SELECT id, preferences, plan, created_at FROM meal_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
  )
    .bind(userId)
    .first<MealPlanRow>();
  return c.json({ mealPlan: row ? toResponse(row) : null });
});

const createSchema = z.object({ userId: z.string().min(1), preferences: MealPlanPreferencesSchema });

/** Gera um cardápio novo com as metas do perfil e as preferências escolhidas */
mealPlanRoutes.post("/", async (c) => {
  const parsed = createSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  const { userId, preferences } = parsed.data;

  const locked = await requireAiAccess(c, userId);
  if (locked) return locked;

  const profile = await loadProfileWithTargets(c.env.DB, userId);
  if (!profile) return c.json({ error: "profile_required" }, 409);

  const used = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM meal_plans WHERE user_id = ? AND local_date = ?")
    .bind(userId, profile.today)
    .first<{ n: number }>();
  if ((used?.n ?? 0) >= DAILY_LIMIT) return c.json({ error: "daily_limit", limit: DAILY_LIMIT }, 429);

  const apiKey = c.env.GEMINI_API_KEY || c.env.GOOGLE_API_KEY || c.env.ANTHROPIC_API_KEY;
  if (!apiKey) return c.json({ error: "ai_not_configured" }, 503);

  const t = profile.targets;
  let plan: MealPlan;
  try {
    plan = await generateMealPlan(
      apiKey,
      { kcal: t.targetKcal, proteinG: t.proteinG, carbsG: t.carbsG, fatG: t.fatG, goal: GOAL_TEXT[profile.profile.goal] ?? profile.profile.goal },
      preferences,
    );
  } catch (err) {
    console.error(JSON.stringify({ message: "meal plan generation failed", error: err instanceof Error ? err.message : String(err) }));
    return c.json({ error: err instanceof MealPlanError ? "generation_failed" : "ai_request_failed" }, 502);
  }

  const row: MealPlanRow = {
    id: newId(),
    preferences: JSON.stringify(preferences),
    plan: JSON.stringify(plan),
    created_at: nowIso(),
  };
  await c.env.DB.prepare(
    "INSERT INTO meal_plans (id, user_id, local_date, preferences, plan, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(row.id, userId, profile.today, row.preferences, row.plan, row.created_at)
    .run();

  return c.json({ mealPlan: toResponse(row) }, 201);
});
