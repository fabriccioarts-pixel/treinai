/*
 * Cálculo do plano nutricional: TMB → gasto diário (TDEE) → meta de calorias, macros e água.
 * Funções puras, sem acesso ao banco — fáceis de testar e de explicar ao usuário.
 *
 * Referências:
 * - TMB: Mifflin-St Jeor (1990); Katch-McArdle quando há % de gordura (usa massa magra).
 * - Gasto do treino: MET da musculação (Compendium of Physical Activities) × peso × tempo,
 *   descontando 1 MET (repouso), que já está dentro da TMB × fator de rotina.
 * - Proteína 1,8–2,0 g/kg (faixa ISSN 1,6–2,2), maior no déficit para preservar massa magra.
 * - Gordura 25% das calorias (mín. 0,6 g/kg); carboidrato completa a meta.
 * - Água: ~35 ml/kg/dia + ~500 ml por hora de treino.
 * Em obesidade (IMC > 30) proteína, gordura e água usam um peso de referência ajustado.
 */

export type Sex = "masculino" | "feminino" | "nao-informado";
export type Goal = "hipertrofia" | "emagrecimento" | "ganho-massa" | "enfase";
export type ActivityLevel = "sedentario" | "leve" | "moderado" | "intenso";

export const SEXES: Sex[] = ["masculino", "feminino", "nao-informado"];
export const GOALS: Goal[] = ["hipertrofia", "emagrecimento", "ganho-massa", "enfase"];
export const ACTIVITY_LEVELS: ActivityLevel[] = ["sedentario", "leve", "moderado", "intenso"];

/** Fator de rotina fora da academia (NEAT) — o treino entra separado, com o tempo real */
const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentario: 1.2, // trabalho sentado, pouco deslocamento
  leve: 1.3, // anda bastante, fica em pé parte do dia
  moderado: 1.4, // em pé/andando a maior parte do dia
  intenso: 1.5, // trabalho físico pesado
};

const STRENGTH_TRAINING_MET = 5;
/** Treino esquecido aberto não pode inflar o gasto */
const MAX_SESSION_MINUTES = 150;
const DEFAULT_SESSION_MINUTES = 60;

export interface NutritionInput {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  bodyFatPct: number | null;
  goal: Goal;
  activityLevel: ActivityLevel;
  /** Dias de treino declarados no onboarding — usados enquanto não há histórico */
  trainingDaysPerWeek: number;
  /** Duração (min) dos treinos concluídos nos últimos 14 dias */
  recentSessionMinutes: number[];
  healthRestriction: boolean;
}

export interface NutritionTargets {
  bmr: number;
  bmrFormula: "mifflin-st-jeor" | "katch-mcardle";
  activityFactor: number;
  exerciseKcalPerDay: number;
  /** "real" = calculado com os treinos registrados; "declarado" = estimado pelos dias informados */
  exerciseSource: "real" | "declarado";
  tdee: number;
  targetKcal: number;
  adjustmentKcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  waterBaseMl: number;
  waterTrainingExtraMl: number;
  /** Por que a meta é a de manutenção mesmo com objetivo de emagrecer */
  deficitBlockedReason: "menor-de-idade" | "restricao-de-saude" | null;
}

export function ageFromBirthDate(birthDate: string, today = new Date()): number {
  const birth = new Date(`${birthDate}T12:00:00Z`);
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

export function calculateBmr(input: Pick<NutritionInput, "sex" | "ageYears" | "heightCm" | "weightKg" | "bodyFatPct">) {
  if (input.bodyFatPct !== null) {
    const leanMassKg = input.weightKg * (1 - input.bodyFatPct / 100);
    return { bmr: 370 + 21.6 * leanMassKg, formula: "katch-mcardle" as const };
  }
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears;
  // Sem sexo informado: média entre as duas constantes (+5 e −161)
  const sexConstant = input.sex === "masculino" ? 5 : input.sex === "feminino" ? -161 : -78;
  return { bmr: base + sexConstant, formula: "mifflin-st-jeor" as const };
}

/** Gasto médio diário do treino, a partir do histórico real quando houver ao menos 2 treinos */
export function calculateExerciseKcalPerDay(
  input: Pick<NutritionInput, "weightKg" | "trainingDaysPerWeek" | "recentSessionMinutes">,
) {
  const hasHistory = input.recentSessionMinutes.length >= 2;
  const minutesPerWeek = hasHistory
    ? input.recentSessionMinutes.reduce((sum, m) => sum + Math.min(Math.max(m, 0), MAX_SESSION_MINUTES), 0) / 2
    : input.trainingDaysPerWeek * DEFAULT_SESSION_MINUTES;
  const kcalPerMinute = ((STRENGTH_TRAINING_MET - 1) * input.weightKg) / 60;
  return {
    kcalPerDay: (minutesPerWeek * kcalPerMinute) / 7,
    avgSessionMinutes: hasHistory ? (minutesPerWeek * 2) / input.recentSessionMinutes.length : DEFAULT_SESSION_MINUTES,
    source: hasHistory ? ("real" as const) : ("declarado" as const),
  };
}

/** Peso de referência para proteína/gordura: em obesidade, g/kg do peso total superestima */
function referenceWeightKg(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  if (bmi <= 30) return weightKg;
  const weightAtBmi25 = 25 * heightM * heightM;
  return weightAtBmi25 + 0.25 * (weightKg - weightAtBmi25);
}

const PROTEIN_G_PER_KG: Record<Goal, number> = {
  emagrecimento: 2.0,
  hipertrofia: 2.0,
  "ganho-massa": 1.8,
  enfase: 1.8,
};

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

export function calculateNutritionTargets(input: NutritionInput): NutritionTargets {
  const { bmr, formula } = calculateBmr(input);
  const activityFactor = ACTIVITY_FACTOR[input.activityLevel];
  const exercise = calculateExerciseKcalPerDay(input);
  const tdee = bmr * activityFactor + exercise.kcalPerDay;

  const deficitBlockedReason =
    input.goal !== "emagrecimento"
      ? null
      : input.ageYears < 18
        ? ("menor-de-idade" as const)
        : input.healthRestriction
          ? ("restricao-de-saude" as const)
          : null;

  let adjustment = 0;
  if (input.goal === "emagrecimento" && !deficitBlockedReason) {
    adjustment = -Math.min(tdee * 0.2, 750);
  } else if (input.goal === "hipertrofia") {
    adjustment = tdee * 0.075;
  } else if (input.goal === "ganho-massa") {
    adjustment = tdee * 0.125;
  }

  // Piso de segurança: nunca abaixo da TMB nem do mínimo usual por sexo
  const minimumKcal = Math.max(
    bmr,
    input.sex === "masculino" ? 1500 : input.sex === "feminino" ? 1200 : 1350,
  );
  const targetKcal = roundTo(Math.max(tdee + adjustment, minimumKcal), 10);

  const refWeight = referenceWeightKg(input.weightKg, input.heightCm);
  const proteinG = Math.round(refWeight * PROTEIN_G_PER_KG[input.goal]);
  // Gordura: 25% das calorias, nunca menos de 0,6 g/kg (hormonal); carboidrato fica com o resto
  const fatG = Math.round(Math.max((targetKcal * 0.25) / 9, refWeight * 0.6));
  const carbsG = Math.max(0, Math.round((targetKcal - proteinG * 4 - fatG * 9) / 4));

  const waterBaseMl = roundTo(Math.min(Math.max(refWeight * 35, 1500), 4500), 50);
  const waterTrainingExtraMl = roundTo((exercise.avgSessionMinutes / 60) * 500, 50);

  return {
    bmr: Math.round(bmr),
    bmrFormula: formula,
    activityFactor,
    exerciseKcalPerDay: Math.round(exercise.kcalPerDay),
    exerciseSource: exercise.source,
    tdee: Math.round(tdee),
    targetKcal,
    adjustmentKcal: Math.round(targetKcal - tdee),
    proteinG,
    fatG,
    carbsG,
    waterBaseMl,
    waterTrainingExtraMl,
    deficitBlockedReason,
  };
}

/** Data (YYYY-MM-DD) no fuso do usuário */
export function localDate(timeZone: string, date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

/** Fuso do usuário a partir do perfil, ou o padrão enquanto ele não preenche o perfil */
export async function userTimeZone(db: D1Database, userId: string): Promise<string> {
  const row = await db.prepare("SELECT timezone FROM user_profiles WHERE user_id = ?").bind(userId).first<{ timezone: string }>();
  return row?.timezone ?? DEFAULT_TIME_ZONE;
}
