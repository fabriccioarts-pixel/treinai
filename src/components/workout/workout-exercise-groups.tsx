"use client";

import Image from "next/image";
import { Lightbulb, Link2, Zap } from "lucide-react";
import { RestIcon, SetsIcon, StartIcon } from "@/components/ui/app-icon";
import { buttonVariants } from "@/components/ui/button";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import { MUSCLE_GROUP_COLOR } from "@/lib/muscle-colors";
import { getExerciseDemo } from "@/lib/exercise-demos";
import { supersetLabel, techniqueInfo, toExerciseBlocks } from "@/lib/training-methods";
import type { MuscleGroup } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { workerApi } from "@/lib/worker-api";

type Exercise = Awaited<ReturnType<typeof workerApi.getWorkout>>["workout"]["exercises"][number];

function intensityFor(repsMin: number) {
  if (repsMin <= 6) return { label: "Força", className: "bg-gold/15 text-gold" };
  if (repsMin <= 12) return { label: "Hipertrofia", className: "bg-primary/15 text-primary" };
  return { label: "Resistência", className: "bg-chart-4/15 text-chart-4" };
}

/** Miniatura do movimento (quadro da demonstração) com o número da ordem; sem demonstração, só o número */
function ExerciseThumb({ exercise, order }: { exercise: Exercise; order: number }) {
  const poster = getExerciseDemo(exercise.exercise_id)?.poster;
  return (
    <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
      {poster ? (
        <Image src={poster} alt="" fill sizes="72px" className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xl font-bold text-muted-foreground">{order}</span>
      )}
      {poster && (
        <span className="absolute top-1 left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-background/85 px-1 text-[11px] font-bold text-foreground backdrop-blur">
          {order}
        </span>
      )}
    </div>
  );
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", className)}>
      {children}
    </span>
  );
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
    <div>
      <div className="flex items-center gap-3.5">
        <ExerciseThumb exercise={exercise} order={order} />
        <div className="min-w-0 flex-1">
          <p className="leading-snug font-semibold text-foreground">{exercise.exercise_name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            {MUSCLE_GROUP_LABEL[exercise.muscle_group as MuscleGroup] ?? exercise.muscle_group}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Chip className="bg-muted text-foreground">
              <SetsIcon className="h-3 w-3" />
              {exercise.target_sets} × {exercise.target_reps_min}–{exercise.target_reps_max}
            </Chip>
            {restLabel && (
              <Chip className="bg-muted text-muted-foreground">
                <RestIcon className="h-3 w-3" />
                {restLabel}
              </Chip>
            )}
            <Chip className={intensity.className}>{intensity.label}</Chip>
            {technique && (
              <Chip className="bg-accent/15 text-accent">
                <Zap className="h-3 w-3" />
                {technique.label}
              </Chip>
            )}
          </div>
        </div>
      </div>
      {(technique || exercise.notes) && (
        <div className="mt-3 space-y-1.5 rounded-xl bg-muted/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {technique && <p>{technique.hint}</p>}
          {exercise.notes && (
            <p className="flex gap-2">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{exercise.notes}</span>
            </p>
          )}
        </div>
      )}
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
  let orderCounter = 0;
  const blocks = toExerciseBlocks(exercises).map((block) =>
    block.map((exercise) => ({ exercise, order: ++orderCounter })),
  );

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-foreground">Exercícios</h2>
        <span className="text-xs text-muted-foreground">na ordem de execução</span>
      </div>

      <ol className="space-y-2.5">
        {blocks.map((block) =>
          block.length === 1 ? (
            <li key={block[0].exercise.id} className="rounded-2xl border border-border/60 bg-card p-3.5">
              <ExerciseRow
                exercise={block[0].exercise}
                order={block[0].order}
                restLabel={`${block[0].exercise.rest_time}s`}
              />
            </li>
          ) : (
            <li key={block[0].exercise.id} className="rounded-2xl border border-primary/40 bg-primary/5 p-3.5">
              <p className="mb-3 flex flex-wrap items-center gap-x-1.5 text-xs font-semibold text-primary">
                <Link2 className="h-3.5 w-3.5" />
                {supersetLabel(block.length)}
                <span className="font-normal text-muted-foreground">
                  · sem descanso entre eles, {block.at(-1)!.exercise.rest_time}s ao fim da volta
                </span>
              </p>
              <div className="space-y-3">
                {block.map(({ exercise, order }, i) => (
                  <div key={exercise.id} className={cn(i > 0 && "border-t border-border/60 pt-3")}>
                    <ExerciseRow exercise={exercise} order={order} restLabel={null} />
                  </div>
                ))}
              </div>
            </li>
          ),
        )}
      </ol>

      {/* Fica preso logo acima da barra de baixo enquanto a pessoa rola a lista */}
      <form
        action={startWorkoutAction}
        className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 -mx-4 mt-5 bg-gradient-to-t from-background from-60% to-transparent px-4 pt-6 pb-3"
      >
        <button
          type="submit"
          className={buttonVariants({
            size: "lg",
            className: "group h-14 w-full gap-2 rounded-full text-base font-semibold",
          })}
        >
          <StartIcon className="h-4 w-4" />
          {isResuming ? "Retomar treino" : "Iniciar treino"}
        </button>
      </form>
    </div>
  );
}
