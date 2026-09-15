import { CalendarCheck, Weight, Trophy, Flame, Dumbbell, LineChart } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { WorkoutTodayCard } from "@/components/workout/workout-today-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PrCard } from "@/components/pr/pr-card";
import { LoadTrendChart } from "@/components/charts/load-trend-chart";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
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

export default async function InicioPage() {
  const session = await auth();
  const userId = session!.user.id;
  const firstName = session?.user?.name?.split(" ")[0];
  const [workoutsResult, stats] = await Promise.all([
    workerApi.listWorkouts(userId).catch((err) => {
      console.error("Erro ao carregar treinos em /:", err);
      return { workouts: [] };
    }),
    workerApi.getStats(userId).catch((err) => {
      console.error("Erro ao carregar stats em /:", err);
      return DEFAULT_STATS;
    }),
  ]);
  const workouts = workoutsResult?.workouts ?? [];
  const todayWorkout = workouts[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Olá${firstName ? `, ${firstName}` : ""}! 👋`}
        subtitle="Pronto para treinar hoje?"
      />

      {todayWorkout ? (
        <WorkoutTodayCard
          id={todayWorkout.id}
          name={todayWorkout.name}
          exerciseCount={todayWorkout.exercise_count}
          estimatedSets={todayWorkout.exercise_count * 3}
          estimatedTime="45–60 min"
        />
      ) : (
        <EmptyState
          icon={Dumbbell}
          title="Nenhum treino ainda"
          description="Crie seu primeiro treino para começar a registrar séries."
          action={
            <Link href="/treinos/novo" className={buttonVariants({ className: "mt-2" })}>
              Criar treino
            </Link>
          }
        />
      )}

      <section>
        <SectionHeader title="Estatísticas" />
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={CalendarCheck}
            label="Treinos esta semana"
            value={String(stats.workoutsThisWeek)}
          />
          <StatCard
            icon={Weight}
            label="Volume da semana"
            value={`${stats.weeklyVolumeKg.toLocaleString("pt-BR")} kg`}
          />
          <StatCard icon={Trophy} label="PRs recentes" value={String(stats.recentPRsCount)} />
          <StatCard
            icon={Flame}
            label="Sequência de treinos"
            value={`${stats.streakDays} dia${stats.streakDays === 1 ? "" : "s"}`}
          />
        </div>
      </section>

      <section>
        <SectionHeader title="Evolução" href="/progresso" linkLabel="Ver progresso" />
        {stats.loadTrend && stats.loadTrend.series.length >= 2 ? (
          <Card className="p-4">
            <p className="mb-1 text-xs text-muted-foreground">
              {stats.loadTrend.exerciseName} — carga ao longo do tempo
            </p>
            <LoadTrendChart data={stats.loadTrend.series} />
          </Card>
        ) : (
          <EmptyState
            icon={LineChart}
            title="Sua evolução aparece aqui"
            description="Registre séries em pelo menos dois treinos para ver o gráfico de carga."
          />
        )}
      </section>

      <section>
        <SectionHeader title="PRs recentes" href="/progresso/prs" />
        {stats.recentPRs.length > 0 ? (
          <div className="space-y-2">
            {stats.recentPRs.map((pr) => (
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
    </div>
  );
}
