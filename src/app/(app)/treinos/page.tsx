import Link from "next/link";
import { Plus, Dumbbell } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { WorkoutCard } from "@/components/workout/workout-card";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";
import type { MuscleGroup } from "@/lib/types";

export default async function TreinosPage() {
  const session = await auth();
  const { workouts } = await workerApi.listWorkouts(session!.user.id);

  return (
    <div>
      <PageHeader
        title="Treinos"
        subtitle={`${workouts.length} treino${workouts.length === 1 ? "" : "s"} criado${workouts.length === 1 ? "" : "s"}`}
        action={
          <Link
            href="/treinos/novo"
            className={buttonVariants({ size: "icon", className: "shrink-0" })}
            aria-label="Criar novo treino"
          >
            <Plus className="h-5 w-5" />
          </Link>
        }
      />

      {workouts.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Nenhum treino ainda"
          description="Crie seu primeiro treino para começar a registrar séries."
          action={
            <Link
              href="/treinos/novo"
              className={buttonVariants({ className: "mt-2" })}
            >
              Criar treino
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {workouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              id={workout.id}
              name={workout.name}
              exerciseCount={workout.exercise_count}
              muscleGroups={
                (workout.muscle_groups?.split(",").filter(Boolean) as MuscleGroup[]) ?? []
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
