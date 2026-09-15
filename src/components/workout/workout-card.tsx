import Link from "next/link";
import { ChevronRight, Dumbbell, Layers, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import { MUSCLE_GROUP_COLOR } from "@/lib/muscle-colors";
import { cn } from "@/lib/utils";
import type { MuscleGroup } from "@/lib/types";

interface WorkoutCardProps {
  id: string;
  name: string;
  exerciseCount: number;
  muscleGroups: readonly MuscleGroup[];
}

export function WorkoutCard({ id, name, exerciseCount, muscleGroups }: WorkoutCardProps) {
  const primaryColor = muscleGroups[0] ? MUSCLE_GROUP_COLOR[muscleGroups[0]] : "var(--muted-foreground)";

  // A listagem não traz séries por exercício — aproxima volume e duração pela contagem de exercícios.
  const filledSegments = Math.min(5, Math.max(1, Math.round(exerciseCount / 2)));
  const volumeLevel = filledSegments >= 5 ? "Alto" : filledSegments >= 3 ? "Moderado" : "Leve";
  const estimatedMinutes = Math.round((exerciseCount * 6) / 5) * 5;

  return (
    <Link href={`/treinos/${id}`}>
      <Card className="gap-3 p-4 transition-colors hover:bg-muted/40">
        <div className="flex items-start gap-3">
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
            style={{ background: `color-mix(in oklch, ${primaryColor}, transparent 84%)` }}
          >
            <Dumbbell className="h-3.5 w-3.5" style={{ color: primaryColor }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">{name}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {muscleGroups.map((group) => (
                <span
                  key={group}
                  className="inline-flex items-center gap-1.5 rounded-4xl bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: MUSCLE_GROUP_COLOR[group] }}
                  />
                  {MUSCLE_GROUP_LABEL[group]}
                </span>
              ))}
            </div>
          </div>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              {exerciseCount} exercícios
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              ~{estimatedMinutes} min
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">{volumeLevel}</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={cn("h-1 w-3 rounded-full", i < filledSegments ? "bg-primary" : "bg-muted")}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
