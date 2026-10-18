import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SubpageHeader } from "@/components/shared/subpage-header";
import { ExerciseLibrary } from "@/components/profile/exercise-library";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";
import type { Equipment, MuscleGroup } from "@/lib/types";

export const metadata: Metadata = { title: "Biblioteca de exercícios · Treinai" };

export default async function BibliotecaExerciciosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { exercises } = await workerApi.listExercises(session.user.id);

  return (
    <div className="space-y-6">
      <SubpageHeader
        title="Biblioteca de exercícios"
        subtitle="Como executar cada exercício do app"
        fallbackHref="/perfil"
      />
      <ExerciseLibrary
        exercises={exercises.map((e) => ({
          id: e.id,
          name: e.name,
          muscleGroup: e.muscle_group as MuscleGroup,
          equipment: e.equipment as Equipment,
          isCustom: e.is_custom === 1,
        }))}
      />
    </div>
  );
}
