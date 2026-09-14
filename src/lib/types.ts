/**
 * Modelo de dados principal do Treinai.
 * Espelha as entidades da Fase 14 do escopo do produto.
 * Ainda não persistido (ver Fase 4) — usado para tipar a UI e os mocks.
 */

export type MuscleGroup =
  | "peito"
  | "costas"
  | "pernas"
  | "ombros"
  | "biceps"
  | "triceps"
  | "abdomen"
  | "cardio";

export type Equipment =
  | "barra"
  | "halteres"
  | "maquina"
  | "cabo"
  | "peso-corporal"
  | "outro";

export type ExerciseType = "composto" | "isolado" | "cardio";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  type: ExerciseType;
  isCustom: boolean;
  /** Termo de busca sugerido para encontrar um vídeo de referência de execução. */
  videoSearchTerm?: string;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restTime: number; // segundos
  notes?: string;
}

export interface Workout {
  id: string;
  userId: string;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
  createdAt: string;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  workoutId: string;
  startedAt: string;
  finishedAt?: string;
  durationSeconds?: number;
}

export interface SetLog {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number;
  completed: boolean;
  createdAt: string;
}

/** Orientação de progressão de carga/técnica para uma semana de um programa. */
export interface ProgramWeekGuidance {
  week: number;
  focus: string;
  howTo: string;
}

/**
 * Programa de treino: metadados e regras que envolvem um conjunto de Workouts
 * (ex.: os treinos A/B/C de um ciclo), incluindo progressão semana a semana.
 */
export interface TrainingProgram {
  id: string;
  userId: string;
  name: string;
  goal: string;
  frequencyPerWeek: number;
  sessionDurationMinutes: { min: number; max: number };
  restBetweenSetsSeconds: { min: number; max: number };
  mainRule: string;
  weeks: ProgramWeekGuidance[];
  workoutIds: string[];
  warmup: string;
  loadControl: string;
  safetyNote: string;
}

export type PersonalRecordType = "carga" | "repeticoes" | "1rm" | "volume";

export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseId: string;
  type: PersonalRecordType;
  weight: number;
  reps: number;
  estimatedOneRepMax: number;
  volume: number;
  achievedAt: string;
}
