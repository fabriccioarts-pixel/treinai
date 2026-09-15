import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, EllipsisVertical, Trash2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import { MUSCLE_GROUP_COLOR } from "@/lib/muscle-colors";
import type { MuscleGroup } from "@/lib/types";
import { workerApi, WorkerApiError } from "@/lib/worker-api";
import { deleteWorkoutAction } from "@/app/actions/workout-actions";
import { startWorkoutAction } from "@/app/actions/session-actions";
import { WorkoutExerciseGroups } from "@/components/workout/workout-exercise-groups";

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
        <form id="delete-workout-form" action={deleteWorkoutAction.bind(null, workout.id)} />
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Mais opções"
            className={buttonVariants({ variant: "ghost", size: "icon", className: "size-[52px]" })}
          >
            <EllipsisVertical className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              variant="destructive"
              nativeButton
              render={<button type="submit" form="delete-workout-form" />}
            >
              <Trash2 />
              Excluir treino
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

      <WorkoutExerciseGroups
        groupList={groupList}
        startWorkoutAction={startWorkoutAction.bind(null, workout.id)}
      />
    </div>
  );
}
