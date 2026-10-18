import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { workerApi, WorkerApiError } from "@/lib/worker-api";
import { WorkoutExecutor, type PreviousSetVM } from "@/components/workout/workout-executor";

export default async function ExecutarTreinoPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  const authSession = await auth();
  if (!authSession?.user?.id) redirect("/login");

  const notFoundOn404 = (err: unknown) => {
    if (err instanceof WorkerApiError && err.status === 404) return null;
    throw err;
  };

  const [workoutRes, sessionRes, setsRes] = await Promise.all([
    workerApi.getWorkout(id).catch(notFoundOn404),
    workerApi.getSession(sessionId).catch(notFoundOn404),
    workerApi.listSessionSets(sessionId),
  ]);

  if (!workoutRes || !sessionRes) notFound();

  const { workout } = workoutRes;
  const { session: workoutSession } = sessionRes;

  if (workoutSession.user_id !== authSession.user.id || workoutSession.workout_id !== id) {
    notFound();
  }
  if (workoutSession.finished_at) {
    redirect("/");
  }

  const previousSets = await loadPreviousSets(
    authSession.user.id,
    sessionId,
    workout.exercises.map((e) => e.exercise_id),
  );

  return (
    <WorkoutExecutor
      sessionId={sessionId}
      workoutName={workout.name}
      startedAt={workoutSession.started_at}
      exercises={workout.exercises}
      initialSets={setsRes.sets}
      previousSets={previousSets}
    />
  );
}

/**
 * Séries da última sessão (fora a atual) de cada exercício, para pré-preencher a carga.
 * É só conveniência: se falhar, o treino abre com os campos vazios.
 */
async function loadPreviousSets(userId: string, currentSessionId: string, exerciseIds: string[]) {
  const entries = await Promise.all(
    [...new Set(exerciseIds)].map(async (exerciseId) => {
      const { sets } = await workerApi.listExerciseSets(userId, exerciseId).catch(() => ({ sets: [] }));
      const lastSessionId = sets.find((s) => s.session_id !== currentSessionId)?.session_id;
      const previous = sets
        .filter((s) => s.session_id === lastSessionId)
        .map((s) => ({ set_number: s.set_number, weight: s.weight, reps: s.reps }))
        .sort((a, b) => a.set_number - b.set_number);
      return [exerciseId, previous] as const;
    }),
  );
  return Object.fromEntries(entries.filter(([, previous]) => previous.length > 0)) as Record<
    string,
    PreviousSetVM[]
  >;
}
