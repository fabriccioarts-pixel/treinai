import Link from "next/link";
import { ChevronRight, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@/lib/types";

interface WorkoutCardProps {
  id: string;
  name: string;
  exerciseCount: number;
  muscleGroups: readonly MuscleGroup[];
}

export function WorkoutCard({ id, name, exerciseCount, muscleGroups }: WorkoutCardProps) {
  return (
    <Link href={`/treinos/${id}`}>
      <Card className="flex-row items-center gap-4 p-4 transition-colors hover:bg-muted/60">
        <div className="flex-1 space-y-1.5">
          <p className="font-medium text-foreground">{name}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {muscleGroups.map((group) => (
              <Badge key={group} variant="secondary" className="font-normal">
                {MUSCLE_GROUP_LABEL[group]}
              </Badge>
            ))}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            {exerciseCount} exercícios
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </Card>
    </Link>
  );
}
