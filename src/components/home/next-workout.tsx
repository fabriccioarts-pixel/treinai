import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StartIcon } from "@/components/ui/app-icon";
import { buttonVariants } from "@/components/ui/button";
import { Illustration, MUSCLE_ILLUSTRATION } from "@/components/ui/illustration";
import { startWorkoutAction } from "@/app/actions/session-actions";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@/lib/types";

const MAX_THUMBS = 4;

interface NextWorkoutProps {
  id: string;
  name: string;
  exerciseCount: number;
  estimatedSets: number;
  estimatedTime: string;
  muscleGroups?: MuscleGroup[];
  /** Capas dos exercícios (silhueta com o músculo em destaque), na ordem do treino */
  posters?: string[];
}

export function NextWorkout({
  id,
  name,
  exerciseCount,
  estimatedSets,
  estimatedTime,
  muscleGroups = [],
  posters = [],
}: NextWorkoutProps) {
  const groups = [...new Set(muscleGroups)].filter((g) => MUSCLE_GROUP_LABEL[g]);
  // Com mais exercícios do que cabem, o último quadro vira o contador "+N"
  const overflow = exerciseCount > MAX_THUMBS && posters.length >= MAX_THUMBS;
  const thumbs = posters.slice(0, overflow ? MAX_THUMBS - 1 : MAX_THUMBS);
  const remaining = exerciseCount - thumbs.length;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-card p-5">
      <Link href={`/treinos/${id}`} className="group relative block">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {groups.length > 0 && (
              <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                {groups.map((g) => MUSCLE_GROUP_LABEL[g]).join(" · ")}
              </p>
            )}
            <h3 className="mt-1 line-clamp-2 text-xl font-bold tracking-tight text-foreground">{name}</h3>
            <p className="tabular mt-1.5 text-sm text-muted-foreground">
              {exerciseCount} exercícios · {estimatedSets} séries · {estimatedTime}
            </p>
          </div>
          {thumbs.length === 0 && groups[0] ? (
            <Illustration name={MUSCLE_ILLUSTRATION[groups[0]]} size={72} className="-mr-1 -mt-1" />
          ) : (
            <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          )}
        </div>

        {/* Prévia dos exercícios: silhuetas com o músculo trabalhado em destaque */}
        {thumbs.length > 0 && (
          <div className="mt-4 grid grid-cols-4 gap-2">
            {thumbs.map((src) => (
              <div
                key={src}
                className="relative aspect-square overflow-hidden rounded-2xl bg-black ring-1 ring-white/5"
              >
                <Image
                  src={src}
                  alt=""
                  aria-hidden
                  fill
                  sizes="96px"
                  className="scale-125 object-cover transition-transform duration-500 group-hover:scale-[1.35]"
                />
              </div>
            ))}
            {overflow && (
              <div className="flex aspect-square flex-col items-center justify-center rounded-2xl bg-muted/60 ring-1 ring-white/5">
                <span className="tabular text-lg font-bold text-foreground">+{remaining}</span>
                <span className="text-[11px] text-muted-foreground">exercícios</span>
              </div>
            )}
          </div>
        )}
      </Link>

      <form action={startWorkoutAction.bind(null, id)} className="relative mt-5">
        <button
          type="submit"
          className={buttonVariants({
            size: "lg",
            className:
              "h-12 w-full gap-2 rounded-2xl text-base font-semibold",
          })}
        >
          <StartIcon className="h-4 w-4" />
          Começar treino
        </button>
      </form>
    </div>
  );
}
