import { notFound, redirect } from "next/navigation";
import { ArrowDown, ArrowUp, CalendarDays, Minus, TrendingUp } from "lucide-react";
import { PrIcon, TrendIcon } from "@/components/ui/app-icon";
import { SectionHeader } from "@/components/shared/section-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BackButton } from "@/components/shared/back-button";
import { Card } from "@/components/ui/card";
import { ExerciseLoadChart } from "@/components/charts/exercise-load-chart";
import { ExerciseThumb } from "@/components/progress/exercise-progress-list";
import { groupSetsBySession, type ExerciseSession } from "@/lib/exercise-progress";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import { cn } from "@/lib/utils";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";
import type { MuscleGroup } from "@/lib/types";

// Séries buscadas por exercício: cobre bem mais de um ano de treinos
const SET_HISTORY_LIMIT = 500;
const TIME_ZONE = "America/Sao_Paulo";

function kg(n: number) {
  return `${n.toLocaleString("pt-BR")} kg`;
}

/** "seg., 13 de out." — com o ano só quando não é o atual */
function longDate(iso: string) {
  const date = new Date(iso);
  const sameYear =
    date.toLocaleDateString("pt-BR", { year: "numeric", timeZone: TIME_ZONE }) ===
    new Date().toLocaleDateString("pt-BR", { year: "numeric", timeZone: TIME_ZONE });
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: TIME_ZONE,
  });
}

/** Sessões que bateram a maior carga de todas as anteriores (a primeira não conta: não há com o que comparar) */
function recordSessionIds(sessions: ExerciseSession[]) {
  const ids = new Set<string>();
  let best = -Infinity;
  sessions.forEach((s, i) => {
    if (i > 0 && s.maxWeight > best) ids.add(s.sessionId);
    best = Math.max(best, s.maxWeight);
  });
  return ids;
}

export default async function ExercicioProgressoPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [{ exercises }, { sets }] = await Promise.all([
    workerApi.listExercises(userId),
    workerApi.listExerciseSets(userId, exerciseId, SET_HISTORY_LIMIT),
  ]);
  const exercise = exercises.find((e) => e.id === exerciseId);
  if (!exercise) notFound();
  const muscleGroup = exercise.muscle_group as MuscleGroup;

  const sessions = groupSetsBySession(sets);
  const first = sessions[0];
  const last = sessions.at(-1);
  const best = sessions.reduce<ExerciseSession | undefined>(
    (top, s) => (!top || s.maxWeight >= top.maxWeight ? s : top),
    undefined,
  );
  const changeKg = first && last ? last.maxWeight - first.maxWeight : 0;
  const changePct = first && first.maxWeight > 0 ? Math.round((changeKg / first.maxWeight) * 100) : 0;
  const records = recordSessionIds(sessions);

  const chartSummary =
    first && last && sessions.length > 1
      ? `Carga máxima por treino: de ${kg(first.maxWeight)} em ${first.date} para ${kg(last.maxWeight)} em ${last.date}, em ${sessions.length} treinos.`
      : "";

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <BackButton fallbackHref="/progresso/exercicios" className="-ml-2" />
        <ExerciseThumb exerciseId={exerciseId} muscleGroup={muscleGroup} size={52} />
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            {MUSCLE_GROUP_LABEL[muscleGroup] ?? muscleGroup}
          </p>
          <h1 className="text-xl leading-tight font-bold tracking-tight text-balance text-foreground">
            {exercise.name}
          </h1>
        </div>
      </header>

      {sessions.length === 0 || !best || !first || !last ? (
        <EmptyState
          icon={TrendIcon}
          title="Sem séries registradas"
          description="Faça este exercício em um treino para começar a acompanhar a evolução."
        />
      ) : (
        <>
          {/* O recorde é o número que a pessoa veio ver: ele lidera, o resto apoia em texto */}
          <Card className="gap-4 p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Maior carga</p>
              <p className="tabular mt-1 flex items-baseline gap-1.5">
                <span className="text-5xl leading-none font-bold tracking-[-0.03em] text-foreground">
                  {best.maxWeight.toLocaleString("pt-BR")}
                </span>
                <span className="text-xl font-semibold text-muted-foreground">kg</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">em {longDate(best.startedAt)}</p>
            </div>

            <ul className="space-y-2 border-t border-border/60 pt-4 text-sm">
              {sessions.length > 1 && (
                <li className="flex items-start gap-2.5">
                  <TrendingUp
                    className={cn("mt-0.5 h-4 w-4 shrink-0", changeKg > 0 ? "text-primary" : "text-muted-foreground")}
                    aria-hidden
                  />
                  <span className="text-foreground">
                    <span className="tabular font-semibold">
                      {changeKg > 0 ? "+" : ""}
                      {kg(changeKg)} ({changePct > 0 ? "+" : ""}
                      {changePct}%)
                    </span>{" "}
                    <span className="text-muted-foreground">desde o primeiro treino, em {first.date.slice(0, 5)}</span>
                  </span>
                </li>
              )}
              <li className="flex items-start gap-2.5">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="text-foreground">
                  <span className="tabular font-semibold">
                    {sessions.length} {sessions.length === 1 ? "treino" : "treinos"}
                  </span>{" "}
                  <span className="text-muted-foreground">· último em {longDate(last.startedAt)}</span>
                </span>
              </li>
            </ul>
          </Card>

          <section>
            <SectionHeader title="Evolução da carga" />
            <Card className="p-4">
              <p className="mb-2 text-sm text-muted-foreground">Maior carga de cada treino</p>
              {sessions.length > 1 ? (
                <ExerciseLoadChart
                  data={sessions.map((s) => ({ date: s.shortDate, weight: s.maxWeight }))}
                  summary={chartSummary}
                />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Faça este exercício em mais um treino para ver o gráfico de evolução.
                </p>
              )}
            </Card>
          </section>

          <section>
            <SectionHeader title="Histórico" />
            <ol className="space-y-3">
              {[...sessions].reverse().map((s, i, list) => {
                const previous = list[i + 1];
                const diff = previous ? s.maxWeight - previous.maxWeight : null;
                const isRecord = records.has(s.sessionId);
                const topSetIndex = s.sets.findIndex((set) => set.weight === s.maxWeight);
                const DiffIcon = diff === null ? null : diff > 0 ? ArrowUp : diff < 0 ? ArrowDown : Minus;

                return (
                  <li key={s.sessionId}>
                    <Card className="gap-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-foreground first-letter:uppercase">
                            {longDate(s.startedAt)}
                          </p>
                          {DiffIcon && diff !== null && (
                            <p
                              className={cn(
                                "tabular mt-0.5 flex items-center gap-1 text-sm",
                                diff > 0 ? "text-primary" : "text-muted-foreground",
                              )}
                            >
                              <DiffIcon className="h-3.5 w-3.5" aria-hidden />
                              {diff === 0
                                ? "Mesma carga do treino anterior"
                                : `${kg(Math.abs(diff))} ${diff > 0 ? "a mais" : "a menos"} que o anterior`}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="tabular text-lg leading-tight font-bold text-foreground">{kg(s.maxWeight)}</p>
                          {isRecord && (
                            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">
                              <PrIcon className="h-3 w-3" aria-hidden />
                              Recorde
                            </p>
                          )}
                        </div>
                      </div>

                      <ol aria-label="Séries" className="flex flex-wrap gap-1.5">
                        {s.sets.map((set, n) => (
                          <li
                            key={n}
                            className={cn(
                              "tabular flex items-baseline gap-1.5 rounded-lg px-2.5 py-1.5 text-sm",
                              n === topSetIndex
                                ? "bg-primary/12 font-semibold text-foreground ring-1 ring-primary/40"
                                : "bg-muted text-foreground",
                            )}
                          >
                            <span className="text-xs font-normal text-muted-foreground" aria-label={`Série ${n + 1}:`}>
                              {n + 1}
                            </span>
                            {set.weight.toLocaleString("pt-BR")} kg × {set.reps}
                          </li>
                        ))}
                      </ol>
                    </Card>
                  </li>
                );
              })}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
