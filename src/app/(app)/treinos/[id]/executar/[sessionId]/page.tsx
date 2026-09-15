import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { workerApi, WorkerApiError } from "@/lib/worker-api";
import { WorkoutExecutor } from "@/components/workout/workout-executor";

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

  return (
    <WorkoutExecutor
      sessionId={sessionId}
      workoutName={workout.name}
      startedAt={workoutSession.started_at}
      exercises={workout.exercises}
      initialSets={setsRes.sets}
    />
  );
}
