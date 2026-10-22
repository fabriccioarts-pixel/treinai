import { newId, nowIso } from "./id";
import { localDate, userTimeZone } from "./nutrition";
import type { MealEstimate } from "./meal-analysis";

export const MEAL_TYPES = ["cafe", "almoco", "lanche", "jantar"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

/** Refeição pelo horário local, quando o usuário não diz qual foi */
export function mealTypeByHour(hour: number): MealType {
  if (hour < 10) return "cafe";
  if (hour < 15) return "almoco";
  if (hour < 18) return "lanche";
  return "jantar";
}

/** Quanto de água já foi registrado no dia local do usuário */
export async function waterTotalMl(db: D1Database, userId: string, date: string): Promise<number> {
  const row = await db
    .prepare("SELECT COALESCE(SUM(amount_ml), 0) AS ml FROM water_logs WHERE user_id = ? AND local_date = ?")
    .bind(userId, date)
    .first<{ ml: number }>();
  return row?.ml ?? 0;
}

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
export async function logWaterRecord(
  db: D1Database,
  userId: string,
  amountMl: number,
): Promise<{ id: string; date: string }> {
  const id = newId();
  const date = localDate(await userTimeZone(db, userId));
  await db
    .prepare("INSERT INTO water_logs (id, user_id, amount_ml, local_date, logged_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, userId, amountMl, date, nowIso())
    .run();
  return { id, date };
}
