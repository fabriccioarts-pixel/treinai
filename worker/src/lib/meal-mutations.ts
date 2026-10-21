import { newId, nowIso } from "./id";
import { localDate, userTimeZone } from "./nutrition";
import type { MealEstimate } from "./meal-analysis";

export type MealType = "cafe" | "almoco" | "lanche" | "jantar";

export interface SaveMealInput {
  mealType: MealType;
  source: "foto" | "texto";
  items: MealEstimate["items"];
}

export interface SavedMeal {
  id: string;
  totals: { kcal: number; proteinG: number; carbsG: number; fatG: number };
}

/** Salva uma refeição já estimada (itens com macros); usada pela rota REST e pelas ferramentas do Théo */
export async function saveMealRecord(db: D1Database, userId: string, input: SaveMealInput): Promise<SavedMeal> {
  const total = (key: "kcal" | "protein_g" | "carbs_g" | "fat_g") =>
    Math.round(input.items.reduce((sum, i) => sum + i[key], 0));
  const mealId = newId();
  const date = localDate(await userTimeZone(db, userId));

  await db.batch([
    db.prepare(
      `INSERT INTO meals (id, user_id, local_date, meal_type, source, kcal, protein_g, carbs_g, fat_g, logged_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(mealId, userId, date, input.mealType, input.source, total("kcal"), total("protein_g"), total("carbs_g"), total("fat_g"), nowIso()),
    ...input.items.map((i) =>
      db.prepare(
        `INSERT INTO meal_items (id, meal_id, name, grams, kcal, protein_g, carbs_g, fat_g)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(newId(), mealId, i.name, i.grams, i.kcal, i.protein_g, i.carbs_g, i.fat_g),
    ),
  ]);

  return {
    id: mealId,
    totals: { kcal: total("kcal"), proteinG: total("protein_g"), carbsG: total("carbs_g"), fatG: total("fat_g") },
  };
}

/** Registra um consumo de água; usada pela rota REST e pelas ferramentas do Théo */
export async function logWaterRecord(db: D1Database, userId: string, amountMl: number): Promise<{ id: string }> {
  const id = newId();
  const date = localDate(await userTimeZone(db, userId));
  await db
    .prepare("INSERT INTO water_logs (id, user_id, amount_ml, local_date, logged_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, userId, amountMl, date, nowIso())
    .run();
  return { id };
}
