import Link from "next/link";
import { CalendarCheck, Camera, Trophy, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { WeeklyVolumeChart } from "@/components/charts/weekly-volume-chart";
import { GoalsSection } from "@/components/goals/goals-section";
import { PrCard } from "@/components/pr/pr-card";
import { formatDate } from "@/lib/format";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

const DEFAULT_STATS = {
  workoutsThisWeek: 0,
  weeklyVolumeKg: 0,
  recentPRsCount: 0,
  streakDays: 0,
  frequencyThisMonth: 0,
  newPRsThisMonth: 0,
  recentPRs: [],
  weeklyVolumeSeries: [],
  topMovers: [],
  loadTrend: null,
};

export default async function ProgressoPage() {
  const session = await auth();
  const userId = session!.user.id;
  const [stats, recentPhotosResult, goalsResult, exercisesResult] = await Promise.all([
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
  ]);
  const recentPhotos = recentPhotosResult?.sessions ?? [];
  const hasVolume = (stats.weeklyVolumeSeries ?? []).some((w) => w.volume > 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Progresso" subtitle="Sua evolução ao longo do tempo" />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={CalendarCheck}
          label="Frequência (mês)"
          value={`${stats.frequencyThisMonth} treinos`}
          accentColor="var(--chart-1)"
        />
        <StatCard
          icon={Trophy}
          label="Novos PRs (mês)"
          value={String(stats.newPRsThisMonth)}
          accentColor="var(--chart-3)"
        />
      </div>

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
            icon={Trophy}
            title="Nenhum PR ainda"
            description="Complete séries nos seus treinos para conquistar seu primeiro recorde."
          />
        )}
      </section>

      <GoalsSection goals={goalsResult.goals} exercises={exercisesResult.exercises} />

      {/* Weekly Volume */}
      <section>
        <SectionHeader title="Volume semanal" />
        {hasVolume ? (
          <Card className="p-4">
            <WeeklyVolumeChart data={stats.weeklyVolumeSeries} />
          </Card>
        ) : (
          <EmptyState
            icon={TrendingUp}
            title="Sem volume registrado ainda"
            description="Complete treinos para ver seu volume semanal aqui."
          />
        )}
      </section>

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
            icon={Camera}
            title="Nenhuma foto ainda"
            description="Ao finalizar um treino, você pode registrar uma foto."
          />
        )}
      </section>

      {/* Top movers */}
      <section>
        <SectionHeader title="Força — exercícios que mais evoluíram" />
        {stats.topMovers.length > 0 ? (
          <Card className="divide-y divide-border/50 p-0">
            {stats.topMovers.map((mover) => (
              <div
                key={mover.exerciseId}
                className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-muted/30"
              >
                <span className="text-sm font-medium text-foreground">{mover.label}</span>
                <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  <TrendingUp className="h-3.5 w-3.5" />+{mover.changePct}%
                </span>
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState
            icon={TrendingUp}
            title="Ainda sem histórico suficiente"
            description="Registre séries em mais de um treino no mesmo exercício para ver sua evolução de força."
          />
        )}
      </section>
    </div>
  );
}
