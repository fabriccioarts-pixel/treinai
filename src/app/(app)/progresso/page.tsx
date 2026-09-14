import { CalendarCheck, Trophy, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { WeeklyVolumeChart } from "@/components/charts/weekly-volume-chart";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

export default async function ProgressoPage() {
  const session = await auth();
  const stats = await workerApi.getStats(session!.user.id);
  const hasVolume = stats.weeklyVolumeSeries.some((w) => w.volume > 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Progresso" subtitle="Sua evolução ao longo do tempo" />

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={CalendarCheck}
          label="Frequência (mês)"
          value={`${stats.frequencyThisMonth} treinos`}
        />
        <StatCard icon={Trophy} label="Novos PRs (mês)" value={String(stats.newPRsThisMonth)} />
      </div>

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

      <section>
        <SectionHeader title="Força — exercícios que mais evoluíram" />
        {stats.topMovers.length > 0 ? (
          <Card className="divide-y divide-border p-0">
            {stats.topMovers.map((mover) => (
              <div
                key={mover.exerciseId}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm font-medium text-foreground">{mover.label}</span>
                <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                  <TrendingUp className="h-4 w-4" />+{mover.changePct}%
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
