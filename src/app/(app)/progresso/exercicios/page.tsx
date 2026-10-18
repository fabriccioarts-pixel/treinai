import { redirect } from "next/navigation";
import { TrendIcon } from "@/components/ui/app-icon";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ExerciseProgressList } from "@/components/progress/exercise-progress-list";
import { summarizeExercises } from "@/lib/exercise-progress";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

export default async function ExerciciosProgressoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { personalRecords } = await workerApi.listPersonalRecords(session.user.id);
  const exercises = summarizeExercises(personalRecords);

  return (
    <div>
      <PageHeader
        title="Evolução por exercício"
        subtitle="Toque em um exercício para ver a evolução das cargas"
        illustration="progress"
      />
      {exercises.length > 0 ? (
        <ExerciseProgressList exercises={exercises} />
      ) : (
        <EmptyState
          icon={TrendIcon}
          title="Nenhum exercício registrado"
          description="Complete séries nos seus treinos para acompanhar a evolução de cada exercício."
        />
      )}
    </div>
  );
}
