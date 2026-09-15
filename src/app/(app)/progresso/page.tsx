import Link from "next/link";
import { CalendarCheck, Camera, Trophy, TrendingUp, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { WeeklyVolumeChart } from "@/components/charts/weekly-volume-chart";
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
  const [stats, recentPhotosResult] = await Promise.all([
    workerApi.getStats(userId).catch((err) => {
      console.error("Erro ao carregar stats em /progresso:", err);
      return DEFAULT_STATS;
    }),
    workerApi.listSessions(userId, { limit: 6, withPhoto: true }).catch((err) => {
      console.error("Erro ao carregar fotos em /progresso:", err);
      return { sessions: [] };
    }),
  ]);
  const recentPhotos = recentPhotosResult?.sessions ?? [];
  const hasVolume = (stats.weeklyVolumeSeries ?? []).some((w) => w.volume > 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Progresso" subtitle="Sua evolução ao longo do tempo" />

      {/* Personal Trainer Card — Minimalist & Refined */}
      <Link
        href="/progresso/assistente"
        className="group relative block overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-xl transition-all duration-300 hover:border-primary/30 hover:bg-card/90 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12),0_0_20px_-4px_rgba(var(--primary),0.12)]"
      >
        {/* Subtle ambient gradient highlight on hover */}
        <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Delicate top specular line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="relative flex items-center gap-3.5">
          {/* Coach Identity Avatar */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-gradient-to-b from-primary/15 to-primary/5 text-primary shadow-xs transition-transform duration-300 group-hover:scale-105">
            <span className="text-base font-bold tracking-tight text-primary">T</span>
            {/* Active presence status dot */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 duration-1000" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
            </span>
          </div>

          {/* Coach Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                Théo
              </h3>
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-primary">
                Personal Trainer
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
              Analisa sua evolução, sugere ajustes e adapta seus treinos
            </p>
          </div>

          {/* Action indicator */}
          <div className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground/80 transition-colors group-hover:text-primary">
            <span className="hidden text-[11px] font-medium tracking-tight sm:inline-block">
              Conversar
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>

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
