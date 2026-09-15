import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, Clock, Layers, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import { MUSCLE_GROUP_COLOR } from "@/lib/muscle-colors";
import { cn } from "@/lib/utils";
import type { MuscleGroup } from "@/lib/types";
import { workerApi, WorkerApiError } from "@/lib/worker-api";
import { deleteWorkoutAction } from "@/app/actions/workout-actions";
import { startWorkoutAction } from "@/app/actions/session-actions";

function intensityFor(repsMin: number) {
  if (repsMin <= 6) return { label: "Força", className: "bg-gold/15 text-gold" };
  if (repsMin <= 12) return { label: "Hipertrofia", className: "bg-primary/15 text-primary" };
  return { label: "Resistência", className: "bg-chart-4/15 text-chart-4" };
}

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

  const totalSets = workout.exercises.reduce((sum, e) => sum + e.target_sets, 0);
  // Sem histórico de execução — aproxima a duração pelas séries e descansos configurados.
  const estimatedSeconds = workout.exercises.reduce(
    (sum, e) => sum + e.target_sets * (e.rest_time + 40),
    0
  );
  const estimatedMinutes = Math.max(10, Math.round(estimatedSeconds / 60));

  const groups = new Map<
    string,
    { label: string; color: string; sets: number; exercises: typeof workout.exercises }
  >();
  workout.exercises.forEach((exercise) => {
    const key = exercise.muscle_group;
    const label = MUSCLE_GROUP_LABEL[key as MuscleGroup] ?? key;
    const color = MUSCLE_GROUP_COLOR[key as MuscleGroup] ?? "var(--muted-foreground)";
    if (!groups.has(key)) groups.set(key, { label, color, sets: 0, exercises: [] });
    const g = groups.get(key)!;
    g.sets += exercise.target_sets;
    g.exercises.push(exercise);
  });
  const groupList = Array.from(groups.entries()).map(([key, g]) => ({ key, ...g }));

  let orderCounter = 0;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <Link
          href="/treinos"
          aria-label="Voltar"
          className={buttonVariants({ variant: "ghost", size: "icon", className: "size-[52px]" })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <form action={deleteWorkoutAction.bind(null, workout.id)}>
          <button
            type="submit"
            aria-label="Excluir treino"
            className={buttonVariants({ variant: "destructive", size: "icon", className: "size-[52px]" })}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </div>

      <h1 className="text-[2rem] font-semibold tracking-tight text-foreground">{workout.name}</h1>
      <p className="mt-1.5 mb-5 text-sm text-muted-foreground">
        {workout.exercises.length} exercícios · {totalSets} séries · ~{estimatedMinutes} min
      </p>

      {groupList.length > 1 && (
        <div className="mb-6 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="mb-2.5 text-xs font-semibold text-muted-foreground">
            Distribuição por grupo muscular
          </p>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
            {groupList.map((g) => (
              <div
                key={g.key}
                style={{ width: `${(g.sets / totalSets) * 100}%`, background: g.color }}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-3.5">
            {groupList.map((g) => (
              <span key={g.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />
                {g.label} · {Math.round((g.sets / totalSets) * 100)}%
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {groupList.map((group) => (
          <div key={group.key}>
            <div className="mb-2.5 flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: group.color }}
              />
              <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
              <span className="text-xs text-muted-foreground">({group.exercises.length})</span>
            </div>

            <div className="space-y-2">
              {group.exercises.map((exercise) => {
                orderCounter += 1;
                const intensity = intensityFor(exercise.target_reps_min);
                return (
                  <Card key={exercise.id} className="flex-row items-start gap-3 p-3.5">
                    <span className="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                      {orderCounter}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{exercise.exercise_name}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Layers className="h-3.5 w-3.5" />
                          {exercise.target_sets}x {exercise.target_reps_min}–{exercise.target_reps_max}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {exercise.rest_time}s
                        </span>
                        <span
                          className={cn(
                            "rounded-4xl px-2 py-0.5 text-[10px] font-semibold",
                            intensity.className
                          )}
                        >
                          {intensity.label}
                        </span>
                      </div>
                      {exercise.notes && (
                        <p className="mt-1.5 text-xs text-muted-foreground italic">{exercise.notes}</p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <form action={startWorkoutAction.bind(null, workout.id)} className="mt-6">
        <button
          type="submit"
          className={buttonVariants({
            size: "lg",
            className: "h-12 w-full gap-2 text-base font-semibold",
          })}
        >
          <Play className="h-4 w-4 fill-current" />
          Iniciar treino
        </button>
      </form>
    </div>
  );
}
