import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, Clock, Layers } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@/lib/types";
import { workerApi, WorkerApiError } from "@/lib/worker-api";
import { deleteWorkoutAction } from "@/app/actions/workout-actions";
import { startWorkoutAction } from "@/app/actions/session-actions";

export default async function TreinoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let workout;
  try {
    ({ workout } = await workerApi.getWorkout(id));
  } catch (err) {
    if (err instanceof WorkerApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div>
      <PageHeader
        title={workout.name}
        subtitle={`${workout.exercises.length} exercícios`}
        action={
          <Link
            href="/treinos"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        }
      />

      <div className="space-y-3">
        {workout.exercises.map((exercise, index) => (
          <Card key={exercise.id} className="gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {index + 1}. {MUSCLE_GROUP_LABEL[exercise.muscle_group as MuscleGroup] ?? exercise.muscle_group}
                </p>
                <p className="font-medium text-foreground">{exercise.exercise_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                {exercise.target_sets}x {exercise.target_reps_min}–{exercise.target_reps_max}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {exercise.rest_time}s
              </span>
            </div>
            {exercise.notes && (
              <p className="text-sm text-muted-foreground">{exercise.notes}</p>
            )}
          </Card>
        ))}
      </div>

      <form action={startWorkoutAction.bind(null, workout.id)} className="mt-6">
        <button
          type="submit"
          className={buttonVariants({
            size: "lg",
            className: "h-12 w-full text-base font-semibold",
          })}
        >
          Iniciar treino
        </button>
      </form>

      <form action={deleteWorkoutAction.bind(null, workout.id)} className="mt-3">
        <button
          type="submit"
          className={buttonVariants({ variant: "outline", className: "w-full gap-2 text-destructive" })}
        >
          <Trash2 className="h-4 w-4" />
          Excluir treino
        </button>
      </form>
    </div>
  );
}
