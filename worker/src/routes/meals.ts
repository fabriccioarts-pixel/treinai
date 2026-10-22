import { Hono } from "hono";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { localDate, userTimeZone } from "../lib/nutrition";
import { MEAL_TYPES, saveMealRecord } from "../lib/meal-mutations";
import { MealAnalysisError, analyzeMeal } from "../lib/meal-analysis";
import { requireAiAccess } from "../lib/billing";

export const mealRoutes = new Hono<{ Bindings: Env }>();

/** ~3,75 MB de imagem: o app reduz a foto antes de enviar, isso é só o teto de segurança */
const MAX_PHOTO_BASE64_LENGTH = 5_000_000;

const analyzeSchema = z.object({
  userId: z.string().min(1),
  photo: z
    .object({
      base64: z.string().min(1).max(MAX_PHOTO_BASE64_LENGTH),
      mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    })
    .optional(),
  text: z.string().trim().min(2).max(500).optional(),
});

/** Só estima — nada é salvo até o usuário confirmar */
mealRoutes.post("/analyze", async (c) => {
  const parsed = analyzeSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.photo && !parsed.data.text)) {
    return c.json({ error: "invalid_input" }, 400);
  }
  const { userId, photo, text } = parsed.data;
  const locked = await requireAiAccess(c, userId);
  if (locked) return locked;

  const apiKey = c.env.GEMINI_API_KEY || c.env.GOOGLE_API_KEY || c.env.ANTHROPIC_API_KEY;
  if (!apiKey) return c.json({ error: "ai_not_configured" }, 503);

  try {
    const estimate = await analyzeMeal(
      apiKey,
      photo ? { kind: "photo", ...photo } : { kind: "text", text: text! },
    );
    return c.json(estimate);
  } catch (err) {
    if (err instanceof MealAnalysisError) return c.json({ error: "analysis_failed" }, 422);
    if (err instanceof Anthropic.RateLimitError) return c.json({ error: "busy" }, 503);
    console.error(JSON.stringify({ message: "meal analysis failed", error: err instanceof Error ? err.message : String(err) }));
    return c.json({ error: "analysis_failed" }, 502);
  }
});

const itemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  grams: z.number().min(1).max(3000),
  kcal: z.number().min(0).max(5000),
  protein_g: z.number().min(0).max(500),
  carbs_g: z.number().min(0).max(1000),
  fat_g: z.number().min(0).max(500),
});

const saveSchema = z.object({
  userId: z.string().min(1),
  mealType: z.enum(MEAL_TYPES),
  source: z.enum(["foto", "texto"]),
  items: z.array(itemSchema).min(1).max(30),
});

mealRoutes.post("/", async (c) => {
  const parsed = saveSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_meal" }, 400);
  const { userId, mealType, source, items } = parsed.data;
  const { id } = await saveMealRecord(c.env.DB, userId, { mealType, source, items });
  return c.json({ id });
});

/** Refeições de hoje (no fuso do usuário) com os totais do dia */
mealRoutes.get("/", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "missing_userId" }, 400);

  const date = localDate(await userTimeZone(c.env.DB, userId));
  const { results: meals } = await c.env.DB.prepare(
    `SELECT id, meal_type, source, kcal, protein_g, carbs_g, fat_g, logged_at FROM meals
     WHERE user_id = ? AND local_date = ? ORDER BY logged_at ASC`
  )
    .bind(userId, date)
    .all<{
      id: string;
      meal_type: string;
      source: string;
      kcal: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      logged_at: string;
    }>();

  let items: { meal_id: string; name: string; grams: number; kcal: number }[] = [];
  if (meals.length > 0) {
    const placeholders = meals.map(() => "?").join(",");
    ({ results: items } = await c.env.DB.prepare(
      `SELECT meal_id, name, grams, kcal FROM meal_items WHERE meal_id IN (${placeholders})`
    )
      .bind(...meals.map((m) => m.id))
      .all<{ meal_id: string; name: string; grams: number; kcal: number }>());
  }

  const sum = (key: "kcal" | "protein_g" | "carbs_g" | "fat_g") => Math.round(meals.reduce((s, m) => s + m[key], 0));

  return c.json({
    date,
    totals: { kcal: sum("kcal"), proteinG: sum("protein_g"), carbsG: sum("carbs_g"), fatG: sum("fat_g") },
    meals: meals.map((m) => ({
      id: m.id,
      mealType: m.meal_type,
      source: m.source,
      kcal: m.kcal,
      loggedAt: m.logged_at,
      items: items
        .filter((i) => i.meal_id === m.id)
        .map((i) => ({ name: i.name, grams: i.grams, kcal: i.kcal })),
    })),
  });
});

mealRoutes.delete("/:id", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "missing_userId" }, 400);

  const id = c.req.param("id");
  const meal = await c.env.DB.prepare("SELECT id FROM meals WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<{ id: string }>();
  if (!meal) return c.json({ error: "not_found" }, 404);

  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM meal_items WHERE meal_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM meals WHERE id = ?").bind(id),
  ]);
  return c.json({ ok: true });
});
