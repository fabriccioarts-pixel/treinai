import { planWorkoutTemplates } from "./plan-template";
import { newId, nowIso } from "./id";

/**
 * Clona o plano Full Body de retorno para a conta de um usuário recém-criado.
 */
export async function seedDefaultWorkoutsForUser(db: Env["DB"], userId: string): Promise<void> {
  const statements: D1PreparedStatement[] = [];
  const createdAt = nowIso();

  for (const workout of planWorkoutTemplates) {
    const workoutId = newId();
    statements.push(
      db
        .prepare("INSERT INTO workouts (id, user_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)")
        .bind(workoutId, userId, workout.name, workout.description, createdAt)
    );
    for (const we of workout.exercises) {
      statements.push(
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
            we.notes
          )
      );
    }
  }

  await db.batch(statements);
}
