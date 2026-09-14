import Link from "next/link";
import { Layers, ListChecks, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

interface WorkoutTodayCardProps {
  name: string;
  exerciseCount: number;
  estimatedSets: number;
  estimatedTime: string;
  href: string;
}

export function WorkoutTodayCard({
  name,
  exerciseCount,
  estimatedSets,
  estimatedTime,
  href,
}: WorkoutTodayCardProps) {
  return (
    <Card className="gap-4 border-none bg-gradient-to-br from-primary/15 via-card to-card p-5 ring-1 ring-primary/20">
      <div>
        <p className="text-xs font-medium tracking-wide text-primary uppercase">
          Treino de hoje
        </p>
        <h3 className="mt-1 text-lg font-semibold text-foreground">{name}</h3>
      </div>

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

      <Link
        href={href}
        className={buttonVariants({
          size: "lg",
          className: "h-12 w-full text-base font-semibold",
        })}
      >
        Iniciar treino
      </Link>
    </Card>
  );
}
