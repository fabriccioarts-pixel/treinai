import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Illustration, MUSCLE_ILLUSTRATION } from "@/components/ui/illustration";
import { getExerciseDemo } from "@/lib/exercise-demos";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import { formatDate, formatWeight } from "@/lib/format";
import type { ExerciseSummary } from "@/lib/exercise-progress";

export function ExerciseThumb({ exerciseId, muscleGroup, size = 48 }: Pick<ExerciseSummary, "exerciseId" | "muscleGroup"> & { size?: number }) {
  const poster = getExerciseDemo(exerciseId)?.poster;
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl bg-black ring-1 ring-white/5"
      style={{ width: size, height: size }}
    >
      {poster ? (
        <Image src={poster} alt="" aria-hidden fill sizes={`${size}px`} className="scale-125 object-cover" />
      ) : (
        <Illustration
          name={MUSCLE_ILLUSTRATION[muscleGroup] ?? "workouts"}
          size={size}
          className="absolute inset-0"
        />
      )}
    </div>
  );
}

export function ExerciseProgressList({ exercises }: { exercises: ExerciseSummary[] }) {
  return (
    <Card className="divide-y divide-border/50 p-0">
      {exercises.map((e) => (
        <Link
          key={e.exerciseId}
          href={`/progresso/exercicios/${e.exerciseId}`}
          className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
        >
          <ExerciseThumb exerciseId={e.exerciseId} muscleGroup={e.muscleGroup} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{e.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {MUSCLE_GROUP_LABEL[e.muscleGroup] ?? e.muscleGroup} · recorde em{" "}
              {formatDate(e.lastRecordAt.slice(0, 10))}
            </p>
          </div>
          <span className="tabular text-sm font-semibold text-foreground">{formatWeight(e.bestWeight)}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      ))}
    </Card>
  );
}
