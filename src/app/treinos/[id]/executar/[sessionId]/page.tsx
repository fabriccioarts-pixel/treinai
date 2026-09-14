import { notFound } from "next/navigation";
import {
  WorkoutExecutionView,
  type ExecutionExercise,
  type ExistingSet,
} from "@/components/workout/workout-execution-view";
import { workerApi, WorkerApiError } from "@/lib/worker-api";

export default async function ExecutarTreinoPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;

  let workout;
  try {
    ({ workout } = await workerApi.getWorkout(id));
  } catch (err) {
    if (err instanceof WorkerApiError && err.status === 404) notFound();
    throw err;
  }

  const { sets } = await workerApi.listSessionSets(sessionId);

  const exercises: ExecutionExercise[] = workout.exercises.map((we) => ({
    exerciseId: we.exercise_id,
    exerciseName: we.exercise_name,
    muscleGroup: we.muscle_group,
    targetSets: we.target_sets,
    targetRepsMin: we.target_reps_min,
    targetRepsMax: we.target_reps_max,
    restTime: we.rest_time,
    notes: we.notes,
  }));

  const existingSets: ExistingSet[] = sets.map((s) => ({
    exerciseId: s.exercise_id,
    setNumber: s.set_number,
    weight: s.weight,
    reps: s.reps,
    completed: s.completed === 1,
  }));

  return (
    <WorkoutExecutionView
      sessionId={sessionId}
      workoutName={workout.name}
      exercises={exercises}
      existingSets={existingSets}
    />
  );
}
