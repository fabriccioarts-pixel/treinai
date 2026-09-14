import Link from "next/link";
import { Layers, ListChecks, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { startWorkoutAction } from "@/app/actions/session-actions";

interface WorkoutTodayCardProps {
  id: string;
  name: string;
  exerciseCount: number;
  estimatedSets: number;
  estimatedTime: string;
}

export function WorkoutTodayCard({
  id,
  name,
  exerciseCount,
  estimatedSets,
  estimatedTime,
}: WorkoutTodayCardProps) {
  return (
    <Card className="gap-4 border-none bg-gradient-to-br from-primary/15 via-card to-card p-5 ring-1 ring-primary/20">
      <Link href={`/treinos/${id}`}>
        <p className="text-xs font-medium tracking-wide text-primary uppercase">
          Treino de hoje
        </p>
        <h3 className="mt-1 text-lg font-semibold text-foreground">{name}</h3>
      </Link>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Layers className="h-4 w-4" />
          {exerciseCount} exercícios
        </span>
        <span className="flex items-center gap-1.5">
          <ListChecks className="h-4 w-4" />
          {estimatedSets} séries
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          {estimatedTime}
        </span>
      </div>

      <form action={startWorkoutAction.bind(null, id)}>
        <button
          type="submit"
          className={buttonVariants({
            size: "lg",
            className: "h-12 w-full text-base font-semibold",
          })}
        >
          Iniciar treino
        </button>
      </form>
    </Card>
  );
}
