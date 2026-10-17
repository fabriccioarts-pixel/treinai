/*
 * Tipos e rótulos do perfil corporal / plano nutricional.
 * O cálculo em si vive no worker (worker/src/lib/nutrition.ts) — aqui só o que a interface precisa.
 */

export type Sex = "masculino" | "feminino" | "nao-informado";
export type Goal = "hipertrofia" | "emagrecimento" | "ganho-massa" | "enfase";
export type ActivityLevel = "sedentario" | "leve" | "moderado" | "intenso";

export interface UserProfile {
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

export interface NutritionTargets {
  bmr: number;
  bmrFormula: "mifflin-st-jeor" | "katch-mcardle";
  activityFactor: number;
  exerciseKcalPerDay: number;
  exerciseSource: "real" | "declarado";
  tdee: number;
  targetKcal: number;
  adjustmentKcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  waterBaseMl: number;
  waterTrainingExtraMl: number;
  deficitBlockedReason: "menor-de-idade" | "restricao-de-saude" | null;
}

export interface ProfilePlan {
  profile: UserProfile;
  targets: NutritionTargets;
  today: string;
  trainedToday: boolean;
  waterTodayMl: number;
}

export type ProfileInput = Omit<UserProfile, "ageYears" | "updatedAt">;

export const GOAL_OPTIONS: { value: Goal; label: string; description: string }[] = [
  { value: "hipertrofia", label: "Hipertrofia", description: "Crescer massa muscular de forma geral" },
  { value: "emagrecimento", label: "Emagrecimento", description: "Perder gordura e definir o corpo" },
  { value: "ganho-massa", label: "Ganho de massa", description: "Ganhar força e volume corporal" },
  { value: "enfase", label: "Ênfase específica", description: "Focar mais em um grupo muscular" },
];

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "nao-informado", label: "Prefiro não informar" },
];

export const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: "sedentario", label: "Quase sempre sentado", description: "Escritório, estudo, home office" },
  { value: "leve", label: "Ando um pouco", description: "Em pé parte do dia, deslocamentos a pé" },
  { value: "moderado", label: "Muito em pé", description: "Comércio, professor, cozinha, atendimento" },
  { value: "intenso", label: "Trabalho pesado", description: "Obra, carga, trabalho braçal" },
];

export function formatLiters(ml: number): string {
  return `${(ml / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`;
}

export function formatKcal(kcal: number): string {
  return kcal.toLocaleString("pt-BR");
}

export type MealType = "cafe" | "almoco" | "lanche" | "jantar";

export const MEAL_TYPE_LABEL: Record<MealType, string> = {
  cafe: "Café da manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
};

/** Sugestão pelo horário local: o usuário pode trocar antes de salvar */
export function mealTypeForNow(date = new Date()): MealType {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes < 10 * 60 + 30) return "cafe";
  if (minutes < 15 * 60) return "almoco";
  if (minutes < 18 * 60 + 30) return "lanche";
  return "jantar";
}

export interface MealItem {
  name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealEstimate {
  items: MealItem[];
  confidence: "alta" | "media" | "baixa";
  note: string;
}

export interface MealsToday {
  date: string;
  totals: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  meals: {
    id: string;
    mealType: MealType;
    source: "foto" | "texto";
    kcal: number;
    loggedAt: string;
    items: { name: string; grams: number; kcal: number }[];
  }[];
}
