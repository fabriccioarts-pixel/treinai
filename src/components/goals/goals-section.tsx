import { Target } from "lucide-react";
import { SectionHeader } from "@/components/shared/section-header";
import { EmptyState } from "@/components/shared/empty-state";
import { GoalProgressCard, type GoalVM } from "@/components/goals/goal-progress-card";
import { CreateGoalDialog } from "@/components/goals/create-goal-dialog";

interface ExerciseOption {
  id: string;
  name: string;
  muscle_group: string;
}

export function GoalsSection({ goals, exercises }: { goals: GoalVM[]; exercises: ExerciseOption[] }) {
  const active = goals.filter((g) => !g.achievedAt);
  const achieved = goals.filter((g) => g.achievedAt);
  const ordered = [...active, ...achieved];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <SectionHeader title="Metas de carga" />
        <CreateGoalDialog exercises={exercises} />
      </div>

      {ordered.length > 0 ? (
        <div className="space-y-2.5">
          {ordered.map((goal) => (
            <GoalProgressCard key={goal.id} goal={goal} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Target}
          title="Nenhuma meta definida"
          description="Crie uma meta de carga para um exercício e acompanhe o progresso até chegar lá."
        />
      )}
    </section>
  );
}
