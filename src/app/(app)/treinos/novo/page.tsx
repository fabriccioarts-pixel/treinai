import { redirect } from "next/navigation";
import { SubpageHeader } from "@/components/shared/subpage-header";
import { WorkoutBuilder } from "@/components/workout/workout-builder";
import { RoutineChangeNotice } from "@/components/workout/routine-change-notice";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

export default async function NovoTreinoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const [{ exercises }, stability] = await Promise.all([
    workerApi.listExercises(session.user.id),
    workerApi.getRoutineStability(session.user.id).catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      <SubpageHeader
        title="Novo treino"
        subtitle="Dê um nome e escolha os exercícios."
        fallbackHref="/treinos"
      />
      {stability && <RoutineChangeNotice stability={stability} />}
      <WorkoutBuilder exercises={exercises} stability={stability} />
    </div>
  );
}
