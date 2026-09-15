"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Dumbbell, Plus } from "lucide-react";
import { WorkoutCard } from "./workout-card";
import { buttonVariants } from "@/components/ui/button";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import { cn } from "@/lib/utils";
import type { MuscleGroup } from "@/lib/types";

interface WorkoutSummary {
  id: string;
  name: string;
  exerciseCount: number;
  muscleGroups: MuscleGroup[];
}

const QUICK_START_TEMPLATES = ["Push / Pull / Legs", "Full Body", "Upper / Lower"];

export function WorkoutsBrowser({ workouts }: { workouts: WorkoutSummary[] }) {
  const groups = useMemo(
    () => Array.from(new Set(workouts.flatMap((w) => w.muscleGroups))),
    [workouts]
  );
  const [filter, setFilter] = useState<MuscleGroup | "todos">("todos");

  if (workouts.length === 0) {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-card to-card p-8 text-center ring-1 ring-foreground/10">
        <div className="relative mx-auto mb-5 h-16 w-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/25">
            <Dumbbell className="h-7 w-7 text-primary" strokeWidth={1.75} />
          </div>
          <div className="absolute -right-1 -top-1 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gold ring-4 ring-background">
            <Plus className="h-3 w-3 text-gold-foreground" strokeWidth={3} />
          </div>
        </div>
        <p className="text-[17px] font-semibold text-foreground">Monte seu primeiro treino</p>
        <p className="mx-auto mt-2 max-w-[27ch] text-sm text-muted-foreground">
          Escolha um modelo pronto ou comece do zero — leva menos de 2 minutos.
        </p>
        <Link
          href="/treinos/novo"
          className={buttonVariants({ className: "mt-5 h-12 w-full gap-2 text-base font-semibold" })}
        >
          <Plus className="h-4 w-4" />
          Criar treino do zero
        </Link>
        <p className="mb-2.5 mt-5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          ou comece com um modelo
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {QUICK_START_TEMPLATES.map((label) => (
            <span
              key={label}
              className="flex h-[34px] items-center rounded-4xl px-3.5 text-sm font-medium text-foreground ring-1 ring-border"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  const filtered = filter === "todos" ? workouts : workouts.filter((w) => w.muscleGroups.includes(filter));

  return (
    <div>
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => setFilter("todos")}
          className={cn(
            "h-[30px] shrink-0 rounded-4xl px-3.5 text-[13px] font-medium",
            filter === "todos" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
          )}
        >
          Todos
        </button>
        {groups.map((group) => (
          <button
            type="button"
            key={group}
            onClick={() => setFilter(group)}
            className={cn(
              "h-[30px] shrink-0 rounded-4xl px-3.5 text-[13px] font-medium",
              filter === group ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            )}
          >
            {MUSCLE_GROUP_LABEL[group]}
          </button>
        ))}
      </div>

      <h2 className="mb-3 text-[15px] font-semibold text-foreground">Todos os treinos</h2>

      <div className="flex flex-col gap-3">
        {filtered.map((workout) => (
          <WorkoutCard key={workout.id} {...workout} />
        ))}
      </div>
    </div>
  );
}
