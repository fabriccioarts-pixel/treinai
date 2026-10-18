import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TrendIcon } from "@/components/ui/app-icon";
import { SubpageHeader } from "@/components/shared/subpage-header";
import { ExerciseDemo } from "@/components/workout/exercise-demo";
import { ExerciseThumb } from "@/components/progress/exercise-progress-list";
import { Card } from "@/components/ui/card";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import { EQUIPMENT_LABEL, EXERCISE_TYPE_HINT, EXERCISE_TYPE_LABEL } from "@/lib/exercise-labels";
import { getExerciseDemo } from "@/lib/exercise-demos";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";
import type { Equipment, ExerciseType, MuscleGroup } from "@/lib/types";

export default async function ExercicioBibliotecaPage({ params }: { params: Promise<{ exerciseId: string }> }) {
  const { exerciseId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [{ exercises }, history] = await Promise.all([
    workerApi.listExercises(userId),
    // Basta saber se existe alguma série para oferecer o atalho da evolução
    workerApi.listExerciseSets(userId, exerciseId, 1).catch(() => ({ sets: [] })),
  ]);
  const exercise = exercises.find((e) => e.id === exerciseId);
  if (!exercise) notFound();

  const muscleGroup = exercise.muscle_group as MuscleGroup;
  const type = exercise.type as ExerciseType;
  const hasDemo = Boolean(getExerciseDemo(exerciseId));
  const details = [
    { label: "Grupo muscular", value: MUSCLE_GROUP_LABEL[muscleGroup] ?? exercise.muscle_group },
    { label: "Aparelho", value: EQUIPMENT_LABEL[exercise.equipment as Equipment] ?? exercise.equipment },
    { label: "Tipo", value: EXERCISE_TYPE_LABEL[type] ?? exercise.type, hint: EXERCISE_TYPE_HINT[type] },
  ];

  return (
    <div className="space-y-6">
      <SubpageHeader
        title={exercise.name}
        subtitle={exercise.is_custom === 1 ? "Exercício personalizado" : undefined}
        fallbackHref="/perfil/exercicios"
      />

      {hasDemo ? (
        <ExerciseDemo exerciseId={exerciseId} exerciseName={exercise.name} />
      ) : (
        <Card className="flex-row items-center gap-4 p-4">
          <ExerciseThumb exerciseId={exerciseId} muscleGroup={muscleGroup} size={64} />
          <p className="text-sm text-muted-foreground">Este exercício ainda não tem vídeo de demonstração.</p>
        </Card>
      )}

      <Card className="p-0">
        <dl className="divide-y divide-border/50">
          {details.map((d) => (
            <div key={d.label} className="px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted-foreground">{d.label}</dt>
                <dd className="text-right text-sm font-semibold text-foreground">{d.value}</dd>
              </div>
              {d.hint && <p className="mt-1 text-sm text-muted-foreground">{d.hint}</p>}
            </div>
          ))}
        </dl>
      </Card>

      {history.sets.length > 0 ? (
        <Link
          href={`/progresso/exercicios/${exerciseId}`}
          className="group flex items-center gap-3.5 rounded-xl bg-card px-4 py-3.5 ring-1 ring-foreground/10 transition-colors hover:bg-muted/30"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrendIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Minha evolução</p>
            <p className="text-sm text-muted-foreground">Cargas, recordes e histórico de séries</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      ) : (
        <p className="px-1 text-sm text-muted-foreground">
          Você ainda não fez este exercício. Quando registrar séries dele num treino, a evolução aparece aqui.
        </p>
      )}
    </div>
  );
}
