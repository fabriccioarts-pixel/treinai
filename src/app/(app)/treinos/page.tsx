import Link from "next/link";
import { Plus } from "lucide-react";
import { WorkoutsBrowser } from "@/components/workout/workouts-browser";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";
import type { MuscleGroup } from "@/lib/types";

export default async function TreinosPage() {
  const session = await auth();
  const { workouts: raw } = await workerApi.listWorkouts(session!.user.id);

  const workouts = raw.map((w) => ({
    id: w.id,
    name: w.name,
    exerciseCount: w.exercise_count,
    muscleGroups: ((w.muscle_groups?.split(",").filter(Boolean) as MuscleGroup[]) ?? []),
  }));

  const totalExercises = workouts.reduce((sum, w) => sum + w.exerciseCount, 0);
  const uniqueGroups = new Set(workouts.flatMap((w) => w.muscleGroups));

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-tight text-foreground">Treinos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {workouts.length} treino{workouts.length === 1 ? "" : "s"} criado
            {workouts.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/treinos/novo"
          aria-label="Criar novo treino"
          className={buttonVariants({ size: "icon", className: "size-[52px] shrink-0" })}
        >
          <Plus className="h-5 w-5" />
        </Link>
      </header>

      {workouts.length > 0 && (
        <div className="mb-5 flex items-stretch rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex-1">
            <p className="tabular text-xl font-semibold text-foreground">{workouts.length}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Treinos</p>
          </div>
          <div className="mx-3.5 w-px bg-border" />
          <div className="flex-1">
            <p className="tabular text-xl font-semibold text-foreground">{totalExercises}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Exercícios</p>
          </div>
          <div className="mx-3.5 w-px bg-border" />
          <div className="flex-1">
            <p className="tabular text-xl font-semibold text-foreground">{uniqueGroups.size}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Grupos</p>
          </div>
        </div>
      )}

      <WorkoutsBrowser workouts={workouts} />
    </div>
  );
}
