import Link from "next/link";
import Image from "next/image";
import { CalendarCheck, Camera, Trophy, TrendingUp, ChevronRight } from "lucide-react";
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
  const userId = session!.user.id;
  const [stats, { sessions: recentPhotos }] = await Promise.all([
    workerApi.getStats(userId),
    workerApi.listSessions(userId, { limit: 6, withPhoto: true }),
  ]);
  const hasVolume = stats.weeklyVolumeSeries.some((w) => w.volume > 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Progresso" subtitle="Sua evolução ao longo do tempo" />

      <Link href="/progresso/assistente">
        <Card className="flex-row items-center gap-3 border-none bg-gradient-to-br from-primary/15 via-card to-card p-4 ring-1 ring-primary/20">
          <Image
            src="/ai-coach-avatar.png"
            alt="Personal trainer IA"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-full ring-1 ring-primary/30"
          />
          <div className="flex-1">
            <p className="font-medium text-foreground">Personal trainer IA</p>
            <p className="text-xs text-muted-foreground">
              Analisa sua evolução, sugere ajustes e adapta seus treinos
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Card>
      </Link>

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
        <SectionHeader title="Fotos dos treinos" href="/progresso/fotos" />
        {recentPhotos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {recentPhotos.map((s) => (
              <Link
                key={s.id}
                href={`/progresso/fotos/${s.id}`}
                className="aspect-square overflow-hidden rounded-lg bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/sessoes/${s.id}/foto`}
                  alt={`Foto do treino ${s.workout_name}`}
                  loading="lazy"
                  className="h-full w-full object-cover"
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
