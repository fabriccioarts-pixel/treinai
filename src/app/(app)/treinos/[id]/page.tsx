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
import { auth } from "@/auth";

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

  const authSession = await auth();
  const activeSession = authSession?.user?.id
    ? await workerApi.getActiveSession(authSession.user.id).catch(() => null)
    : null;
  const isResuming = activeSession?.workout_id === workout.id;

  const totalSets = workout.exercises.reduce((sum, e) => sum + e.target_sets, 0);
  // Sem histórico de execução — aproxima a duração pelas séries e descansos configurados.
  const estimatedSeconds = workout.exercises.reduce(
    (sum, e) => sum + e.target_sets * (e.rest_time + 40),
    0
  );
  const estimatedMinutes = Math.max(10, Math.round(estimatedSeconds / 60));

  const groups = new Map<string, { label: string; color: string; sets: number }>();
  workout.exercises.forEach((exercise) => {
    const key = exercise.muscle_group;
    const label = MUSCLE_GROUP_LABEL[key as MuscleGroup] ?? key;
    const color = MUSCLE_GROUP_COLOR[key as MuscleGroup] ?? "var(--muted-foreground)";
    if (!groups.has(key)) groups.set(key, { label, color, sets: 0 });
    groups.get(key)!.sets += exercise.target_sets;
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

      <h1 className="text-[2rem] leading-tight font-bold tracking-tight text-balance text-foreground">{workout.name}</h1>

      {/* Resumo do treino em três números */}
      <dl className="mt-4 grid grid-cols-3 gap-2">
        {[
          { value: workout.exercises.length, label: "exercícios" },
          { value: totalSets, label: "séries" },
          { value: `~${estimatedMinutes}`, label: "minutos" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border/60 bg-card px-3 py-3 text-center">
            <dd className="tabular text-2xl font-bold text-foreground">{stat.value}</dd>
            <dt className="mt-0.5 text-[11px] text-muted-foreground">{stat.label}</dt>
          </div>
        ))}
      </dl>

      {groupList.length > 1 && (
        <div className="mt-3 mb-6 rounded-2xl border border-border/60 bg-card p-4">
          <p className="mb-3 text-xs font-semibold text-muted-foreground">Séries por grupo muscular</p>
          <div className="flex h-2.5 w-full gap-0.5">
            {groupList.map((g) => (
              <div
                key={g.key}
                className="h-full rounded-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${(g.sets / totalSets) * 100}%`, background: g.color }}
              />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {groupList.map((g) => (
              <span key={g.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: g.color }} />
                <span className="flex-1 text-foreground/90">{g.label}</span>
                <span className="tabular">{g.sets} {g.sets === 1 ? "série" : "séries"}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {groupList.length <= 1 && <div className="mb-6" />}

      <WorkoutExerciseGroups
        exercises={workout.exercises}
        startWorkoutAction={startWorkoutAction.bind(null, workout.id)}
        isResuming={isResuming}
      />
    </div>
  );
}
