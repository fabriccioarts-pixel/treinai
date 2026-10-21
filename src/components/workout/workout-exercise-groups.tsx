"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Link2, Zap } from "lucide-react";
import { RestIcon, SetsIcon, StartIcon } from "@/components/ui/app-icon";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import { MUSCLE_GROUP_COLOR } from "@/lib/muscle-colors";
import { supersetLabel, techniqueInfo, toExerciseBlocks } from "@/lib/training-methods";
import type { MuscleGroup } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { workerApi } from "@/lib/worker-api";

type Exercise = Awaited<ReturnType<typeof workerApi.getWorkout>>["workout"]["exercises"][number];

const COLLAPSED_HEIGHT = 340;

function intensityFor(repsMin: number) {
  if (repsMin <= 6) return { label: "Força", className: "bg-gold/15 text-gold" };
  if (repsMin <= 12) return { label: "Hipertrofia", className: "bg-primary/15 text-primary" };
  return { label: "Resistência", className: "bg-chart-4/15 text-chart-4" };
}

function ExerciseRow({
  exercise,
  order,
  restLabel,
}: {
  exercise: Exercise;
  order: number;
  /** Texto do descanso; no meio de um conjugado não há descanso */
  restLabel: string | null;
}) {
  const intensity = intensityFor(exercise.target_reps_min);
  const technique = techniqueInfo(exercise.technique);
  const color = MUSCLE_GROUP_COLOR[exercise.muscle_group as MuscleGroup] ?? "var(--muted-foreground)";
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
        {order}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{exercise.exercise_name}</p>
        <p className="text-xs font-medium" style={{ color }}>
          {MUSCLE_GROUP_LABEL[exercise.muscle_group as MuscleGroup] ?? exercise.muscle_group}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <SetsIcon className="h-3.5 w-3.5" />
            {exercise.target_sets}x {exercise.target_reps_min}–{exercise.target_reps_max}
          </span>
          {restLabel && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <RestIcon className="h-3.5 w-3.5" />
              {restLabel}
            </span>
          )}
          <span className={cn("rounded-4xl px-2 py-0.5 text-[11px] font-semibold", intensity.className)}>
            {intensity.label}
          </span>
          {technique && (
            <span className="flex items-center gap-1 rounded-4xl bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
              <Zap className="h-3 w-3" />
              {technique.label}
            </span>
          )}
        </div>
        {technique && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{technique.hint}</p>}
        {exercise.notes && <p className="mt-1.5 text-xs text-muted-foreground italic">{exercise.notes}</p>}
      </div>
    </div>
  );
}

/** Exercícios na ordem de execução; os conjugados aparecem juntos num mesmo cartão */
export function WorkoutExerciseGroups({
  exercises,
  startWorkoutAction,
  isResuming = false,
}: {
  exercises: Exercise[];
  startWorkoutAction: () => Promise<void>;
  isResuming?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(true);

  let orderCounter = 0;
  const blocks = toExerciseBlocks(exercises).map((block) =>
    block.map((exercise) => ({ exercise, order: ++orderCounter })),
  );

  return (
    <div>
      <div className="relative">
        <div
          className="space-y-2 overflow-hidden transition-[max-height] duration-300 ease-out"
          style={{ maxHeight: collapsed ? COLLAPSED_HEIGHT : 6000 }}
        >
          {blocks.map((block) =>
            block.length === 1 ? (
              <Card key={block[0].exercise.id} className="p-3.5">
                <ExerciseRow
                  exercise={block[0].exercise}
                  order={block[0].order}
                  restLabel={`${block[0].exercise.rest_time}s`}
                />
              </Card>
            ) : (
              <Card key={block[0].exercise.id} className="gap-3 p-3.5 ring-primary/40">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Link2 className="h-3.5 w-3.5" />
                  {supersetLabel(block.length)}
                  <span className="font-normal text-muted-foreground">
                    · sem descanso entre eles, {block.at(-1)!.exercise.rest_time}s ao fim da volta
                  </span>
                </p>
                {block.map(({ exercise, order }, i) => (
                  <div key={exercise.id} className={cn(i > 0 && "border-t border-border/60 pt-3")}>
                    <ExerciseRow exercise={exercise} order={order} restLabel={null} />
                  </div>
                ))}
              </Card>
            ),
          )}
        </div>

        {collapsed && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        className="mt-2 w-full gap-1.5"
      >
        {collapsed ? (
          <>
            <ChevronDown className="h-3.5 w-3.5" />
            Expandir
          </>
        ) : (
          <>
            <ChevronUp className="h-3.5 w-3.5" />
            Encolher
          </>
        )}
      </Button>

      <form action={startWorkoutAction} className="mt-3">
        <button
          type="submit"
          className={buttonVariants({
            size: "lg",
            className: "h-12 w-full gap-2 text-base font-semibold",
          })}
        >
          <StartIcon className="h-4 w-4" />
          {isResuming ? "Retomar treino" : "Iniciar treino"}
        </button>
      </form>
    </div>
  );
}
