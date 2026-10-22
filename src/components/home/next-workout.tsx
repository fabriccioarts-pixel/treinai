import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Clock, Dumbbell, Layers } from "lucide-react";
import { StartIcon } from "@/components/ui/app-icon";
import { buttonVariants } from "@/components/ui/button";
import { Illustration, MUSCLE_ILLUSTRATION } from "@/components/ui/illustration";
import { startWorkoutAction } from "@/app/actions/session-actions";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Quantos exercícios aparecem na prévia antes do "+N exercícios" */
const PREVIEW_LIMIT = 3;
/** Com tantos grupos, o treino é de corpo todo: listar todos só polui */
const FULL_BODY_GROUPS = 5;
const MAX_GROUP_LABELS = 3;

export interface NextWorkoutExercise {
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
}

interface NextWorkoutProps {
  id: string;
  name: string;
  exerciseCount: number;
  estimatedSets: number;
  estimatedTime: string;
  muscleGroups?: MuscleGroup[];
  /** Demonstração 16:9 do primeiro exercício que tem uma; vira a capa do card */
  cover?: string | null;
  /** Primeiros exercícios do treino, na ordem */
  exercises?: NextWorkoutExercise[];
}

function musclesLabel(groups: MuscleGroup[]) {
  if (groups.length >= FULL_BODY_GROUPS) return "Corpo todo";
  const shown = groups.slice(0, MAX_GROUP_LABELS).map((g) => MUSCLE_GROUP_LABEL[g]);
  const extra = groups.length - shown.length;
  return extra > 0 ? `${shown.join(", ")} +${extra}` : shown.join(", ");
}

function setsLabel({ sets, repsMin, repsMax }: NextWorkoutExercise) {
  return repsMin === repsMax ? `${sets}×${repsMin}` : `${sets}×${repsMin}–${repsMax}`;
}

export function NextWorkout({
  id,
  name,
  exerciseCount,
  estimatedSets,
  estimatedTime,
  muscleGroups = [],
  cover,
  exercises = [],
}: NextWorkoutProps) {
  const groups = [...new Set(muscleGroups)].filter((g) => MUSCLE_GROUP_LABEL[g]);
  const muscles = groups.length > 0 ? musclesLabel(groups) : null;
  const preview = exercises.slice(0, PREVIEW_LIMIT);
  const remaining = exerciseCount - preview.length;

  const stats = [
    { icon: Dumbbell, label: `${exerciseCount} ${exerciseCount === 1 ? "exercício" : "exercícios"}` },
    { icon: Layers, label: `${estimatedSets} séries` },
    { icon: Clock, label: estimatedTime },
  ];

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]">
      <Link href={`/treinos/${id}`} className="group block">
        {cover && (
          // Capa no formato da demonstração (16:9), inteira e sem texto por cima
          <div className="relative aspect-video overflow-hidden bg-black">
            <Image
              src={cover}
              alt=""
              aria-hidden
              fill
              sizes="(min-width: 1024px) 720px, 100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            {/* Só a borda de baixo funde com o card */}
            <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-card to-transparent" aria-hidden />
          </div>
        )}

        <div className={cn("flex items-start justify-between gap-3 px-5", cover ? "pt-2" : "pt-5")}>
          <div className="min-w-0">
            {muscles && <p className="text-xs font-medium text-muted-foreground">{muscles}</p>}
            <h3 className="mt-0.5 line-clamp-2 text-2xl font-bold tracking-tight text-foreground">{name}</h3>
          </div>
          {!cover && groups[0] ? (
            <Illustration name={MUSCLE_ILLUSTRATION[groups[0]]} size={72} className="-mr-1 -mt-2" />
          ) : (
            <ChevronRight className="mt-5 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          )}
        </div>

        <div className="px-5 pt-4">
          <ul className="flex flex-wrap gap-2" aria-label="Resumo do treino">
            {stats.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="tabular inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground/85"
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {label}
              </li>
            ))}
          </ul>

          {preview.length > 0 && (
            <ol className="mt-4 divide-y divide-border/50" aria-label="Primeiros exercícios">
              {preview.map((exercise, i) => (
                <li key={`${exercise.name}-${i}`} className="flex items-center gap-3 py-2.5">
                  <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{exercise.name}</span>
                  <span className="tabular shrink-0 text-xs text-muted-foreground">{setsLabel(exercise)}</span>
                </li>
              ))}
              {remaining > 0 && (
                <li className="py-2.5 pl-9 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                  +{remaining} {remaining === 1 ? "exercício" : "exercícios"}
                </li>
              )}
            </ol>
          )}
        </div>
      </Link>

      <form action={startWorkoutAction.bind(null, id)} className="px-5 pb-5 pt-3">
        <button
          type="submit"
          className={buttonVariants({
            size: "lg",
            className: "h-12 w-full gap-2 rounded-2xl text-base font-semibold",
          })}
        >
          <StartIcon className="h-4 w-4" />
          Começar treino
        </button>
      </form>
    </div>
  );
}
