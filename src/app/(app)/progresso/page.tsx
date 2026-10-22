import { redirect } from "next/navigation";
import Link from "next/link";
import { PhotoIcon, PrIcon, TrendIcon } from "@/components/ui/app-icon";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { StreakCard } from "@/components/streak/streak-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { WeeklyVolumeChart } from "@/components/charts/weekly-volume-chart";
import { VolumeHeatmap } from "@/components/charts/volume-heatmap";
import { GoalsSection } from "@/components/goals/goals-section";
import { PrCard } from "@/components/pr/pr-card";
import { ExerciseProgressList } from "@/components/progress/exercise-progress-list";
import { summarizeExercises, topStrengthGains } from "@/lib/exercise-progress";
import { BicepsFlexed, ChevronRight } from "lucide-react";
import { Illustration } from "@/components/ui/illustration";
import { formatDate, formatWeight } from "@/lib/format";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

const DEFAULT_STATS = {
  workoutsThisWeek: 0,
  weeklyVolumeKg: 0,
  recentPRsCount: 0,
  streakDays: 0,
  trainedToday: false,
  streakAtRisk: false,
  lostStreakDays: 0,
  last7Days: [],
  frequencyThisMonth: 0,
  newPRsThisMonth: 0,
  recentPRs: [],
  weeklyVolumeSeries: [],
  dailyVolume: [] as { date: string; volume: number }[],
  topMovers: [],
  loadTrend: null,
};

export default async function ProgressoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const [stats, recentPhotosResult, goalsResult, exercisesResult, prsResult] = await Promise.all([
    workerApi.getStats(userId).catch((err) => {
      console.error("Erro ao carregar stats em /progresso:", err);
      return DEFAULT_STATS;
    }),
    workerApi.listSessions(userId, { limit: 6, withPhoto: true }).catch((err) => {
      console.error("Erro ao carregar fotos em /progresso:", err);
      return { sessions: [] };
    }),
    workerApi.listGoals(userId).catch((err) => {
      console.error("Erro ao carregar metas em /progresso:", err);
      return { goals: [] };
    }),
    workerApi.listExercises(userId).catch((err) => {
      console.error("Erro ao carregar exercícios em /progresso:", err);
      return { exercises: [] };
    }),
    workerApi.listPersonalRecords(userId).catch((err) => {
      console.error("Erro ao carregar PRs em /progresso:", err);
      return { personalRecords: [] };
    }),
  ]);
  const trainedExercises = summarizeExercises(prsResult.personalRecords);
  const strengthGains = topStrengthGains(prsResult.personalRecords);
  const recentPhotos = recentPhotosResult?.sessions ?? [];
  const hasVolume = (stats.weeklyVolumeSeries ?? []).some((w) => w.volume > 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Progresso" subtitle="Sua evolução ao longo do tempo" illustration="progress" />

      <StreakCard
        data={stats}
        footer={
          <>
            <span className="font-semibold text-foreground">{stats.frequencyThisMonth}</span>{" "}
            {stats.frequencyThisMonth === 1 ? "treino" : "treinos"} nos últimos 30 dias ·{" "}
            <span className="font-semibold text-gold">{stats.newPRsThisMonth}</span>{" "}
            {stats.newPRsThisMonth === 1 ? "PR novo" : "PRs novos"}
          </>
        }
      />

      {/* PRs */}
      <section>
        <SectionHeader title="Seus PRs" href="/progresso/prs" linkLabel="Ver todos" />
        {stats.recentPRs.length > 0 ? (
          <div className="space-y-2">
            {stats.recentPRs.slice(0, 3).map((pr) => (
              <PrCard
                key={pr.id}
                exerciseName={pr.exerciseName}
                weight={pr.weight}
                reps={pr.reps}
                date={formatDate(pr.achievedAt.slice(0, 10))}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={PrIcon}
            title="Nenhum PR ainda"
            description="Complete séries nos seus treinos para conquistar seu primeiro recorde."
          />
        )}
      </section>

      {/* Evolução das cargas em cada exercício */}
      {trainedExercises.length > 0 && (
        <section>
          <SectionHeader title="Evolução por exercício" href="/progresso/exercicios" linkLabel="Ver todos" />
          <ExerciseProgressList exercises={trainedExercises.slice(0, 4)} />
        </section>
      )}

      <GoalsSection goals={goalsResult.goals} exercises={exercisesResult.exercises} />

      {/* Weekly Volume */}
      <section>
        <SectionHeader title="Volume semanal" />
        {hasVolume ? (
          <Card className="p-4">
            {/* Worker sem a série diária ainda cai nas barras semanais */}
            {stats.dailyVolume ? (
              <VolumeHeatmap daily={stats.dailyVolume} />
            ) : (
              <WeeklyVolumeChart data={stats.weeklyVolumeSeries} />
            )}
          </Card>
        ) : (
          <EmptyState
            icon={TrendIcon}
            title="Sem volume registrado ainda"
            description="Complete treinos para ver seu volume semanal aqui."
          />
        )}
      </section>

      {/* Fotos do corpo: evolução visual e análise do shape */}
      <Link
        href="/progresso/corpo"
        className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
      >
        <Illustration name="photos" size={56} className="-my-2 -ml-1" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">Fotos do corpo</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Antes e depois, guia de fotos e análise do shape pela IA.
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>

      {/* Photos */}
      <section>
        <SectionHeader title="Fotos dos treinos" href="/progresso/fotos" />
        {recentPhotos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {recentPhotos.map((s) => (
              <Link
                key={s.id}
                href={`/progresso/fotos/${s.id}`}
                className="group/photo aspect-square overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/5 transition-all duration-300 hover:ring-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/sessoes/${s.id}/foto`}
                  alt={`Foto do treino ${s.workout_name}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover/photo:scale-105"
                />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={PhotoIcon}
            title="Nenhuma foto ainda"
            description="Ao finalizar um treino, você pode registrar uma foto."
          />
        )}
      </section>

      {/* Quem mais ganhou carga, em kg reais: "de 45 para 140 kg" diz mais que "+211%" */}
      <section aria-labelledby="ganhos-forca">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BicepsFlexed className="h-5 w-5" aria-hidden />
          </span>
          <h2 id="ganhos-forca" className="text-lg font-semibold tracking-tight text-foreground">
            Exercícios em que você mais evoluiu
          </h2>
        </div>
        {strengthGains.length > 0 ? (
          <Card className="divide-y divide-border/50 p-0">
            {strengthGains.map((g) => (
              <Link
                key={g.exerciseId}
                href={`/progresso/exercicios/${g.exerciseId}`}
                className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-muted/30"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{g.name}</span>
                  <span className="tabular block text-sm text-muted-foreground">
                    de {formatWeight(g.fromKg)} para {formatWeight(g.toKg)}
                  </span>
                </span>
                <span className="tabular shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                  +{formatWeight(g.gainKg)}
                </span>
              </Link>
            ))}
          </Card>
        ) : (
          <EmptyState
            icon={TrendIcon}
            title="Ainda sem histórico suficiente"
            description="Registre séries em mais de um treino no mesmo exercício para ver sua evolução de força."
          />
        )}
      </section>
    </div>
  );
}
