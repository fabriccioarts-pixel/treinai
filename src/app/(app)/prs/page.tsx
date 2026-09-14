import { PageHeader } from "@/components/shared/page-header";
import { PrsView } from "@/components/pr/prs-view";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";
import type { MuscleGroup } from "@/lib/types";

export default async function PrsPage() {
  const session = await auth();
  const { personalRecords } = await workerApi.listPersonalRecords(session!.user.id);

  return (
    <div>
      <PageHeader title="Seus PRs 🏆" subtitle="Seus melhores resultados por exercício" />
      <PrsView
        personalRecords={personalRecords.map((pr) => ({
          id: pr.id,
          exerciseName: pr.exercise_name,
          weight: pr.weight,
          reps: pr.reps,
          achievedAt: pr.achieved_at,
          muscleGroup: pr.muscle_group as MuscleGroup,
        }))}
      />
    </div>
  );
}
