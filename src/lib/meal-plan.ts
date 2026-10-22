/*
 * Cardápio da semana e lista de compras (gerados no worker, em worker/src/lib/meal-plan.ts).
 */

export interface MealPlanPreferences {
  mealsPerDay: 3 | 4 | 5;
  diet: "tudo" | "sem-carne-vermelha" | "vegetariano";
  lactoseFree: boolean;
  avoid: string;
  routine: "cozinha" | "marmita" | "fora";
}

export interface MealPlanItem {
  food: string;
  quantity: string;
  kcal: number;
  protein_g: number;
}

export interface MealPlan {
  days: { day: string; meals: { slot: string; name: string; items: MealPlanItem[]; swap: string }[] }[];
  shopping: { category: string; items: { name: string; quantity: string }[] }[];
  tips: string[];
  dayTotals: { kcal: number; proteinG: number }[];
  targets: { kcal: number; proteinG: number; carbsG: number; fatG: number; goal: string };
}

export interface SavedMealPlan {
  id: string;
  createdAt: string;
  preferences: MealPlanPreferences;
  plan: MealPlan;
}

export const DEFAULT_MEAL_PLAN_PREFERENCES: MealPlanPreferences = {
  mealsPerDay: 4,
  diet: "tudo",
  lactoseFree: false,
  avoid: "",
  routine: "cozinha",
};

export const DIET_OPTIONS: { value: MealPlanPreferences["diet"]; label: string }[] = [
  { value: "tudo", label: "Como de tudo" },
  { value: "sem-carne-vermelha", label: "Sem carne vermelha" },
  { value: "vegetariano", label: "Vegetariano" },
];

export const ROUTINE_OPTIONS: { value: MealPlanPreferences["routine"]; label: string; hint: string }[] = [
  { value: "cozinha", label: "Cozinho quase todo dia", hint: "O cardápio varia mais entre os dias" },
  { value: "marmita", label: "Faço marmita", hint: "Cozinha 2 vezes na semana; as refeições repetem em blocos" },
  { value: "fora", label: "Almoço fora", hint: "No almoço, como montar o prato no restaurante por quilo" },
];
