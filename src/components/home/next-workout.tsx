import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StartIcon } from "@/components/ui/app-icon";
import { buttonVariants } from "@/components/ui/button";
import { startWorkoutAction } from "@/app/actions/session-actions";

interface NextWorkoutProps {
  id: string;
  name: string;
  exerciseCount: number;
  estimatedSets: number;
  estimatedTime: string;
}

export function NextWorkout({ id, name, exerciseCount, estimatedSets, estimatedTime }: NextWorkoutProps) {
  return (
    <div className="rounded-3xl border border-primary/25 bg-card p-5 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--primary)_25%,transparent)]">
      <Link href={`/treinos/${id}`} className="group flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-xl font-bold tracking-tight text-foreground">{name}</h3>
          <p className="tabular mt-1 text-sm text-muted-foreground">
            {exerciseCount} exercícios · {estimatedSets} séries · {estimatedTime}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </Link>

      <form action={startWorkoutAction.bind(null, id)} className="mt-5">
        <button
          type="submit"
          className={buttonVariants({
            size: "lg",
            className:
              "h-12 w-full gap-2 rounded-2xl text-base font-semibold shadow-[0_10px_24px_-12px_var(--primary)]",
          })}
        >
          <StartIcon className="h-4 w-4" />
          Começar treino
        </button>
      </form>
    </div>
  );
}
