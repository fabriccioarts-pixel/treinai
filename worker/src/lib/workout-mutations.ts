import { newId, nowIso } from "./id";
import { recordWorkoutChange } from "./routine-stability";

export interface WorkoutExerciseInput {
  exerciseId: string;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restTime: number;
  notes?: string;
  /** Exercícios seguidos com o mesmo número formam um conjugado (bi-set, tri-set…) */
  supersetGroup?: number | null;
  technique?: string | null;
}

/** Técnicas de intensidade aceitas; espelha src/lib/training-methods.ts do app */
export const TECHNIQUES = [
  "drop-set",
  "rest-pause",
  "piramide-crescente",
  "piramide-decrescente",
  "falha",
  "parciais",
  "isometria",
  "cadencia",
] as const;

/**
 * Deixa os conjugados consistentes, venha o treino do app ou do Théo: só conta como grupo
 * uma sequência de 2+ exercícios seguidos com o mesmo número (renumerados 1, 2, 3…), e só o
 * último de cada grupo tem descanso, que vale para a volta inteira. Técnica desconhecida vira série normal.
 */
export function normalizeWorkoutExercises(exercises: WorkoutExerciseInput[]): WorkoutExerciseInput[] {
  const sorted = [...exercises].sort((a, b) => a.order - b.order);
  const groupOf = (e: WorkoutExerciseInput) =>
    e.supersetGroup != null && Number.isFinite(Number(e.supersetGroup)) ? Number(e.supersetGroup) : null;

  const runs: WorkoutExerciseInput[][] = [];
  for (const e of sorted) {
    const last = runs.at(-1);
    if (last && groupOf(e) !== null && groupOf(last[0]) === groupOf(e)) last.push(e);
    else runs.push([e]);
  }

  let nextGroup = 0;
  return runs.flatMap((run) => {
    const group = run.length > 1 ? ++nextGroup : null;
    return run.map((e, i) => ({
      ...e,
      supersetGroup: group,
      restTime: group !== null && i < run.length - 1 ? 0 : e.restTime,
      technique: e.technique && (TECHNIQUES as readonly string[]).includes(e.technique) ? e.technique : null,
    }));
  });
}

/**
 * Usadas tanto pelas rotas HTTP de /workouts quanto pela ferramenta do
 * personal trainer de IA — mantém uma única fonte de verdade para as
 * mutações de treino.
 */

function insertExerciseStatements(db: D1Database, workoutId: string, exercises: WorkoutExerciseInput[]) {
  return normalizeWorkoutExercises(exercises).map((we) =>
    db
      .prepare(
        `INSERT INTO workout_exercises
          (id, workout_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_time, notes,
           superset_group, technique)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        newId(),
        workoutId,
        we.exerciseId,
        we.order,
        we.targetSets,
        we.targetRepsMin,
        we.targetRepsMax,
        we.restTime,
        we.notes ?? null,
        we.supersetGroup ?? null,
        we.technique ?? null
      )
  );
}

export async function createWorkoutRecord(
  db: D1Database,
  userId: string,
  input: { name: string; description?: string; exercises: WorkoutExerciseInput[] }
): Promise<string> {
  const workoutId = newId();
  const statements = [
    db
      .prepare("INSERT INTO workouts (id, user_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(workoutId, userId, input.name, input.description ?? null, nowIso()),
    ...insertExerciseStatements(db, workoutId, input.exercises),
  ];
  await db.batch(statements);
  await recordWorkoutChange(db, userId, workoutId, "criado");
  return workoutId;
}

export async function updateWorkoutRecord(
  db: D1Database,
  workoutId: string,
  input: { name: string; description?: string; exercises: WorkoutExerciseInput[] }
): Promise<void> {
  const statements = [
    db
      .prepare("UPDATE workouts SET name = ?, description = ? WHERE id = ?")
      .bind(input.name, input.description ?? null, workoutId),
    db.prepare("DELETE FROM workout_exercises WHERE workout_id = ?").bind(workoutId),
    ...insertExerciseStatements(db, workoutId, input.exercises),
  ];
  await db.batch(statements);
  const owner = await db.prepare("SELECT user_id FROM workouts WHERE id = ?").bind(workoutId).first<{ user_id: string }>();
  if (owner) await recordWorkoutChange(db, owner.user_id, workoutId, "alterado");
}
