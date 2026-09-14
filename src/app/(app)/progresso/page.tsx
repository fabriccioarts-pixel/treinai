import { CalendarCheck, Trophy, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card } from "@/components/ui/card";
import { WeeklyVolumeChart } from "@/components/charts/weekly-volume-chart";
import {
  mockTopMovers,
  mockWeeklyVolumeSeries,
  mockProgressStats,
} from "@/lib/mock-data";

export default function ProgressoPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Progresso" subtitle="Sua evolução ao longo do tempo" />

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={CalendarCheck}
          label="Frequência (mês)"
          value={`${mockProgressStats.frequencyThisMonth} treinos`}
        />
        <StatCard
          icon={Trophy}
          label="Novos PRs (mês)"
          value={String(mockProgressStats.newPRsThisMonth)}
        />
      </div>

      <section>
        <SectionHeader title="Volume semanal" />
        <Card className="p-4">
          <WeeklyVolumeChart data={mockWeeklyVolumeSeries} />
        </Card>
      </section>

      <section>
        <SectionHeader title="Força — exercícios que mais evoluíram" />
        <Card className="divide-y divide-border p-0">
          {mockTopMovers.map((mover) => (
            <div
              key={mover.exerciseId}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="text-sm font-medium text-foreground">
                {mover.label}
              </span>
              <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                <TrendingUp className="h-4 w-4" />+{mover.changePct}%
              </span>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
