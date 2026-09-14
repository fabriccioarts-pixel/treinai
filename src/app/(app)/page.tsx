import { CalendarCheck, Weight, Trophy, Flame, Dumbbell } from "lucide-react";
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
import { mockWeeklyStats, mockRecentPRs, mockLoadTrend, exerciseName } from "@/lib/mock-data";
import { formatDate } from "@/lib/format";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

export default async function InicioPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0];
  const { workouts } = await workerApi.listWorkouts(session!.user.id);
  const todayWorkout = workouts[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Olá${firstName ? `, ${firstName}` : ""}! 👋`}
        subtitle="Pronto para treinar hoje?"
      />

      {todayWorkout ? (
        <WorkoutTodayCard
          name={todayWorkout.name}
          exerciseCount={todayWorkout.exercise_count}
          estimatedSets={todayWorkout.exercise_count * 3}
          estimatedTime="45–60 min"
          href={`/treinos/${todayWorkout.id}`}
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
            value={String(mockWeeklyStats.workoutsThisWeek)}
          />
          <StatCard
            icon={Weight}
            label="Volume da semana"
            value={`${mockWeeklyStats.weeklyVolumeKg.toLocaleString("pt-BR")} kg`}
          />
          <StatCard
            icon={Trophy}
            label="PRs recentes"
            value={String(mockWeeklyStats.recentPRs)}
          />
          <StatCard
            icon={Flame}
            label="Sequência de treinos"
            value={`${mockWeeklyStats.streakDays} dias`}
          />
        </div>
      </section>

      <section>
        <SectionHeader title="Evolução" href="/progresso" linkLabel="Ver progresso" />
        <Card className="p-4">
          <p className="mb-1 text-xs text-muted-foreground">
            Supino máquina — carga ao longo do tempo
          </p>
          <LoadTrendChart data={mockLoadTrend} />
        </Card>
      </section>

      <section>
        <SectionHeader title="PRs recentes" href="/prs" />
        <div className="space-y-2">
          {mockRecentPRs.map((pr) => (
            <PrCard
              key={pr.id}
              exerciseName={exerciseName(pr.exerciseId)}
              weight={pr.weight}
              reps={pr.reps}
              date={formatDate(pr.achievedAt)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
