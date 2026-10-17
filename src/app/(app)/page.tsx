import { ChevronRight } from "lucide-react";
import { WorkoutIcon, ProgressIcon, PrIcon } from "@/components/ui/app-icon";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadTrendChart } from "@/components/charts/load-trend-chart";
import { WeekVolumeHero } from "@/components/home/week-volume-hero";
import { MetricStrip } from "@/components/home/metric-strip";
import { NextWorkout } from "@/components/home/next-workout";
import { RecentPrs } from "@/components/home/recent-prs";
import { ShortcutGrid } from "@/components/home/shortcut-grid";
import { StreakCard } from "@/components/streak/streak-card";
import { NutritionToday } from "@/components/nutrition/nutrition-today";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

const DEFAULT_STATS = {
  workoutsThisWeek: 0,
  weeklyVolumeKg: 0,
  recentPRsCount: 0,
  streakDays: 0,
  trainedToday: false,
  lostStreakDays: 0,
  last7Days: [],
  frequencyThisMonth: 0,
  newPRsThisMonth: 0,
  recentPRs: [],
  weeklyVolumeSeries: [],
  topMovers: [],
  loadTrend: null,
};

const TIME_ZONE = "America/Sao_Paulo";

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: TIME_ZONE }).format(new Date()),
  );
  if (hour < 5) return "Boa noite";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function todayLabel() {
  const label = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TIME_ZONE,
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function Section({
  title,
  href,
  linkLabel = "Ver tudo",
  children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {href && (
          <Link
            href={href}
            className="group flex items-center gap-0.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            {linkLabel}
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default async function InicioPage() {
  const session = await auth();
  // O proxy só confere se há cookie; uma sessão expirada/inválida chega aqui como null
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const firstName = session?.user?.name?.split(" ")[0];
  const [workoutsResult, stats, profileResult, water] = await Promise.all([
    workerApi.listWorkouts(userId).catch((err) => {
      console.error("Erro ao carregar treinos em /:", err);
      return { workouts: [] };
    }),
    workerApi.getStats(userId).catch((err) => {
      console.error("Erro ao carregar stats em /:", err);
      return DEFAULT_STATS;
    }),
    // Nutrição é opcional: worker antigo ou erro não derrubam a home
    workerApi.getProfile(userId).catch(() => null),
    workerApi.getWater(userId).catch(() => null),
  ]);
  const plan = profileResult?.profile ? profileResult : null;
  const workouts = workoutsResult?.workouts ?? [];
  const todayWorkout = workouts[0];

  return (
    <div className="space-y-8">
      <PageHeader
        plainTitle
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        subtitle={todayLabel()}
        illustration="home"
      />

      <ShortcutGrid />

      <WeekVolumeHero series={stats.weeklyVolumeSeries} />

      <Section title="Treino de hoje" href="/treinos" linkLabel="Meus treinos">
        {todayWorkout ? (
          <NextWorkout
            id={todayWorkout.id}
            name={todayWorkout.name}
            exerciseCount={todayWorkout.exercise_count}
            estimatedSets={todayWorkout.exercise_count * 3}
            estimatedTime="45–60 min"
          />
        ) : (
          <EmptyState
            icon={WorkoutIcon}
            title="Nenhum treino ainda"
            description="Crie seu primeiro treino para começar a registrar séries."
            action={
              <Link href="/treinos/novo" className={buttonVariants({ className: "mt-2" })}>
                Criar treino
              </Link>
            }
          />
        )}
      </Section>

      <StreakCard compact data={stats} />

      <NutritionToday plan={plan} water={water} />

      <MetricStrip
        metrics={[
          {
            label: "Na semana",
            value: String(stats.workoutsThisWeek),
            unit: stats.workoutsThisWeek === 1 ? "treino" : "treinos",
            color: "var(--chart-4)",
          },
          {
            label: "PRs no mês",
            value: String(stats.newPRsThisMonth),
            color: "var(--gold)",
          },
        ]}
      />

      <Section title="Evolução" href="/progresso" linkLabel="Progresso">
        {stats.loadTrend && stats.loadTrend.series.length >= 2 ? (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-[inset_0_1px_0_oklch(1_0_0/0.05)]">
            <p className="text-sm font-semibold text-foreground">{stats.loadTrend.exerciseName}</p>
            <p className="mb-2 text-xs text-muted-foreground">Carga ao longo do tempo</p>
            <LoadTrendChart data={stats.loadTrend.series} />
          </div>
        ) : (
          <EmptyState
            icon={ProgressIcon}
            title="Sua evolução aparece aqui"
            description="Registre séries em pelo menos dois treinos para ver o gráfico de carga."
          />
        )}
      </Section>

      <Section title="Recordes recentes" href="/progresso/prs">
        {stats.recentPRs.length > 0 ? (
          <RecentPrs
            prs={stats.recentPRs.map((pr) => ({
              id: pr.id,
              exerciseName: pr.exerciseName,
              weight: pr.weight,
              reps: pr.reps,
              date: formatDate(pr.achievedAt.slice(0, 10)),
            }))}
          />
        ) : (
          <EmptyState
            icon={PrIcon}
            title="Nenhum PR ainda"
            description="Complete séries nos seus treinos para conquistar seu primeiro recorde."
          />
        )}
      </Section>
    </div>
  );
}
