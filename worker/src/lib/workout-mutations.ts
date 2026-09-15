import { newId, nowIso } from "./id";

export interface WorkoutExerciseInput {
  exerciseId: string;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restTime: number;
  notes?: string;
}

/**
 * Usadas tanto pelas rotas HTTP de /workouts quanto pela ferramenta do
 * personal trainer de IA — mantém uma única fonte de verdade para as
 * mutações de treino.
 */

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
    ...input.exercises.map((we) =>
      db
        .prepare(
          `INSERT INTO workout_exercises
            (id, workout_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_time, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
          we.notes ?? null
        )
    ),
  ];
  await db.batch(statements);
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
    ...input.exercises.map((we) =>
      db
        .prepare(
          `INSERT INTO workout_exercises
            (id, workout_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_time, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
          we.notes ?? null
        )
    ),
  ];
  await db.batch(statements);
}
