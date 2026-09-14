/**
 * Dados de exemplo para validar o design system na Fase 1.
 * O plano de treino (treinos A/B/C) vem de workout-plan.ts, extraído da
 * planilha real do usuário. As estatísticas de progresso/PRs abaixo ainda
 * são ilustrativas — serão substituídas pela persistência real (Fase 4+).
 */
import type { PersonalRecord, Exercise, MuscleGroup, Workout } from "./types";
import { planExercises, planWorkouts, fullBodyReturnProgram } from "./workout-plan";

export const mockExerciseLibrary: Exercise[] = [
  { id: "supino-reto", name: "Supino reto", muscleGroup: "peito", equipment: "barra", type: "composto", isCustom: false },
  { id: "supino-inclinado", name: "Supino inclinado", muscleGroup: "peito", equipment: "barra", type: "composto", isCustom: false },
  { id: "supino-declinado", name: "Supino declinado", muscleGroup: "peito", equipment: "barra", type: "composto", isCustom: false },
  { id: "crucifixo", name: "Crucifixo", muscleGroup: "peito", equipment: "halteres", type: "isolado", isCustom: false },
  { id: "crossover", name: "Crossover", muscleGroup: "peito", equipment: "cabo", type: "isolado", isCustom: false },
  { id: "puxada-frontal", name: "Puxada frontal", muscleGroup: "costas", equipment: "cabo", type: "composto", isCustom: false },
  { id: "remada-baixa", name: "Remada baixa", muscleGroup: "costas", equipment: "cabo", type: "composto", isCustom: false },
  { id: "remada-curvada", name: "Remada curvada", muscleGroup: "costas", equipment: "barra", type: "composto", isCustom: false },
  { id: "barra-fixa", name: "Barra fixa", muscleGroup: "costas", equipment: "peso-corporal", type: "composto", isCustom: false },
  { id: "agachamento", name: "Agachamento", muscleGroup: "pernas", equipment: "barra", type: "composto", isCustom: false },
  { id: "leg-press", name: "Leg press", muscleGroup: "pernas", equipment: "maquina", type: "composto", isCustom: false },
  { id: "cadeira-extensora", name: "Cadeira extensora", muscleGroup: "pernas", equipment: "maquina", type: "isolado", isCustom: false },
  { id: "mesa-flexora", name: "Mesa flexora", muscleGroup: "pernas", equipment: "maquina", type: "isolado", isCustom: false },
  { id: "stiff", name: "Stiff", muscleGroup: "pernas", equipment: "barra", type: "composto", isCustom: false },
  { id: "desenvolvimento", name: "Desenvolvimento", muscleGroup: "ombros", equipment: "halteres", type: "composto", isCustom: false },
  { id: "elevacao-lateral", name: "Elevação lateral", muscleGroup: "ombros", equipment: "halteres", type: "isolado", isCustom: false },
  { id: "elevacao-frontal", name: "Elevação frontal", muscleGroup: "ombros", equipment: "halteres", type: "isolado", isCustom: false },
  { id: "crucifixo-inverso", name: "Crucifixo inverso", muscleGroup: "ombros", equipment: "halteres", type: "isolado", isCustom: false },
  { id: "rosca-direta", name: "Rosca direta", muscleGroup: "biceps", equipment: "barra", type: "isolado", isCustom: false },
  { id: "rosca-alternada", name: "Rosca alternada", muscleGroup: "biceps", equipment: "halteres", type: "isolado", isCustom: false },
  { id: "rosca-martelo", name: "Rosca martelo", muscleGroup: "biceps", equipment: "halteres", type: "isolado", isCustom: false },
  { id: "triceps-pulley", name: "Tríceps pulley", muscleGroup: "triceps", equipment: "cabo", type: "isolado", isCustom: false },
  { id: "triceps-frances", name: "Tríceps francês", muscleGroup: "triceps", equipment: "halteres", type: "isolado", isCustom: false },
  { id: "triceps-testa", name: "Tríceps testa", muscleGroup: "triceps", equipment: "barra", type: "isolado", isCustom: false },
];

const exerciseLibraryById = new Map<string, Exercise>(
  [...mockExerciseLibrary, ...planExercises].map((exercise) => [exercise.id, exercise])
);

export function exerciseName(exerciseId: string): string {
  return exerciseLibraryById.get(exerciseId)?.name ?? exerciseId;
}

export function exerciseById(exerciseId: string): Exercise | undefined {
  return exerciseLibraryById.get(exerciseId);
}

function workoutMuscleGroups(workout: Workout): MuscleGroup[] {
  const seen = new Set<MuscleGroup>();
  const groups: MuscleGroup[] = [];
  for (const workoutExercise of workout.exercises) {
    const group = exerciseLibraryById.get(workoutExercise.exerciseId)?.muscleGroup;
    if (group && !seen.has(group)) {
      seen.add(group);
      groups.push(group);
    }
  }
  return groups;
}

// Treinos A/B/C do "Plano Full Body — Retorno aos treinos" (planilha do usuário).
export const mockWorkoutList = planWorkouts.map((workout) => ({
  id: workout.id,
  name: `${workout.name} — Full Body`,
  exerciseCount: workout.exercises.length,
  muscleGroups: workoutMuscleGroups(workout),
}));

const todayWorkout = planWorkouts[0];

export const mockTodayWorkout = {
  id: todayWorkout.id,
  name: `${todayWorkout.name} — Full Body`,
  exerciseCount: todayWorkout.exercises.length,
  estimatedSets: todayWorkout.exercises.reduce((sum, we) => sum + we.targetSets, 0),
  estimatedTime: `${fullBodyReturnProgram.sessionDurationMinutes.min}–${fullBodyReturnProgram.sessionDurationMinutes.max} min`,
};

export const mockWeeklyStats = {
  workoutsThisWeek: 3,
  weeklyVolumeKg: 8420,
  recentPRs: 2,
  streakDays: 5,
};

export const mockRecentPRs: Pick<
  PersonalRecord,
  "id" | "exerciseId" | "weight" | "reps" | "achievedAt"
>[] = [
  { id: "pr-1", exerciseId: "supino-maquina", weight: 70, reps: 8, achievedAt: "2026-09-12" },
  { id: "pr-2", exerciseId: "agachamento-smith", weight: 100, reps: 5, achievedAt: "2026-09-10" },
];

export const mockLoadTrend = [
  { date: "16/08", weight: 58 },
  { date: "23/08", weight: 60 },
  { date: "30/08", weight: 60 },
  { date: "06/09", weight: 65 },
  { date: "12/09", weight: 70 },
];

export const mockWeeklyVolumeSeries = [
  { week: "S1", volume: 5200 },
  { week: "S2", volume: 6100 },
  { week: "S3", volume: 5800 },
  { week: "S4", volume: 7000 },
  { week: "S5", volume: 7600 },
  { week: "S6", volume: 8420 },
];

export const mockProgressStats = {
  frequencyThisMonth: 12,
  newPRsThisMonth: 4,
};

export const mockTopMovers = [
  { exerciseId: "supino-maquina", label: "Supino máquina", changePct: 12 },
  { exerciseId: "agachamento-smith", label: "Agachamento Smith", changePct: 8 },
  { exerciseId: "remada-baixa", label: "Remada baixa", changePct: 15 },
];

export const mockAllPRs: (Pick<
  PersonalRecord,
  "id" | "exerciseId" | "weight" | "reps" | "achievedAt"
> & { muscleGroup: Exercise["muscleGroup"] })[] = [
  { id: "pr-1", exerciseId: "supino-maquina", weight: 70, reps: 8, achievedAt: "2026-09-12", muscleGroup: "peito" },
  { id: "pr-2", exerciseId: "agachamento-smith", weight: 100, reps: 5, achievedAt: "2026-09-10", muscleGroup: "pernas" },
  { id: "pr-3", exerciseId: "remada-baixa", weight: 62, reps: 10, achievedAt: "2026-09-05", muscleGroup: "costas" },
  { id: "pr-4", exerciseId: "desenvolvimento-maquina", weight: 24, reps: 10, achievedAt: "2026-08-29", muscleGroup: "ombros" },
  { id: "pr-5", exerciseId: "rosca-direta", weight: 18, reps: 10, achievedAt: "2026-08-22", muscleGroup: "biceps" },
  { id: "pr-6", exerciseId: "triceps-pulley", weight: 32, reps: 12, achievedAt: "2026-08-18", muscleGroup: "triceps" },
];
