"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, Layers, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { workerApi } from "@/lib/worker-api";

type Exercise = Awaited<ReturnType<typeof workerApi.getWorkout>>["workout"]["exercises"][number];

interface ExerciseGroup {
  key: string;
  label: string;
  color: string;
  sets: number;
  exercises: Exercise[];
}

const COLLAPSED_HEIGHT = 340;

function intensityFor(repsMin: number) {
  if (repsMin <= 6) return { label: "Força", className: "bg-gold/15 text-gold" };
  if (repsMin <= 12) return { label: "Hipertrofia", className: "bg-primary/15 text-primary" };
  return { label: "Resistência", className: "bg-chart-4/15 text-chart-4" };
}

export function WorkoutExerciseGroups({
  groupList,
  startWorkoutAction,
}: {
  groupList: ExerciseGroup[];
  startWorkoutAction: () => Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState(true);

  let orderCounter = 0;
  const numberedGroups = groupList.map((group) => ({
    ...group,
    exercises: group.exercises.map((exercise) => ({ exercise, order: ++orderCounter })),
  }));

  return (
    <div>
      <div className="relative">
        <div
          className="space-y-6 overflow-hidden transition-[max-height] duration-300 ease-out"
          style={{ maxHeight: collapsed ? COLLAPSED_HEIGHT : 4000 }}
        >
          {numberedGroups.map((group) => (
            <div key={group.key}>
              <div className="mb-2.5 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: group.color }}
                />
                <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
                <span className="text-xs text-muted-foreground">({group.exercises.length})</span>
              </div>

              <div className="space-y-2">
                {group.exercises.map(({ exercise, order }) => {
                  const intensity = intensityFor(exercise.target_reps_min);
                  return (
                    <Card key={exercise.id} className="flex-row items-start gap-3 p-3.5">
                      <span className="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                        {order}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{exercise.exercise_name}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Layers className="h-3.5 w-3.5" />
                            {exercise.target_sets}x {exercise.target_reps_min}–{exercise.target_reps_max}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {exercise.rest_time}s
                          </span>
                          <span
                            className={cn(
                              "rounded-4xl px-2 py-0.5 text-[10px] font-semibold",
                              intensity.className
                            )}
                          >
                            {intensity.label}
                          </span>
                        </div>
                        {exercise.notes && (
                          <p className="mt-1.5 text-xs text-muted-foreground italic">{exercise.notes}</p>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
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
          <Play className="h-4 w-4 fill-current" />
          Iniciar treino
        </button>
      </form>
    </div>
  );
}
