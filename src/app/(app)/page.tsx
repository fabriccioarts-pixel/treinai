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
import { EnableNotificationsPrompt } from "@/components/home/enable-notifications-prompt";
import { InstallAppPrompt } from "@/components/install/install-app-prompt";
import { WeeklyMissions } from "@/components/gamification/weekly-missions";
import { CelebrationToast } from "@/components/gamification/celebration-toast";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";
import { getExerciseDemo } from "@/lib/exercise-demos";
import { getDailyMotivation } from "@/lib/daily-motivation";
import type { MuscleGroup } from "@/lib/types";

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
  topMovers: [],
  loadTrend: null,
};

const TIME_ZONE = "America/Sao_Paulo";
const SESSION_HISTORY_LIMIT = 50;
// Tempo médio de execução de uma série, somado ao descanso, quando ainda não há sessões para tirar a média
const SECONDS_PER_SET = 45;

type WorkoutSummary = { id: string; name: string; exercise_count: number };
type FinishedSession = { workout_id: string; started_at: string; duration_seconds: number | null };

/**
 * Próximo treino do ciclo: um que nunca foi feito (na ordem da lista) ou,
 * se todos já foram, o que foi feito há mais tempo. Assim uma divisão A/B/C gira sozinha.
 */
function pickNextWorkout<W extends WorkoutSummary>(workouts: W[], sessions: FinishedSession[]): W | undefined {
  const lastDone = new Map<string, string>();
  for (const s of sessions) {
    const prev = lastDone.get(s.workout_id);
    if (!prev || s.started_at > prev) lastDone.set(s.workout_id, s.started_at);
  }
  const neverDone = workouts.find((w) => !lastDone.has(w.id));
  if (neverDone) return neverDone;
  return [...workouts].sort((a, b) => lastDone.get(a.id)!.localeCompare(lastDone.get(b.id)!))[0];
}

/** Séries reais do treino e duração: média das últimas sessões ou, sem histórico, séries × (execução + descanso) */
async function estimateWorkout(workoutId: string, sessions: FinishedSession[]) {
  const { workout } = await workerApi.getWorkout(workoutId);
  const sets = workout.exercises.reduce((sum, e) => sum + e.target_sets, 0);

  const durations = sessions
    .filter((s) => s.workout_id === workoutId && s.duration_seconds && s.duration_seconds > 0)
    .slice(0, 5)
    .map((s) => s.duration_seconds!);
  const seconds =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : workout.exercises.reduce((sum, e) => sum + e.target_sets * (SECONDS_PER_SET + e.rest_time), 0);
  const minutes = Math.max(5, Math.round(seconds / 60 / 5) * 5);

  // Capas dos primeiros exercícios com demonstração, para ilustrar o card
  const posters = [...new Set(workout.exercises.map((e) => e.exercise_id))]
    .map((exerciseId) => getExerciseDemo(exerciseId)?.poster)
    .filter((poster): poster is string => Boolean(poster))
    .slice(0, 4);

  return { sets, time: `~${minutes} min`, posters };
}

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
  tour,
  children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  /** Marca a seção para o tour de boas-vindas destacar */
  tour?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3" data-tour={tour}>
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
  const motivation = getDailyMotivation(userId, TIME_ZONE);
  const [workoutsResult, sessionsResult, stats, profileResult, water, meals, gamification] = await Promise.all([
    workerApi.listWorkouts(userId).catch((err) => {
      console.error("Erro ao carregar treinos em /:", err);
      return { workouts: [] };
    }),
    // Só serve para escolher o próximo treino do ciclo; sem ele a home cai no primeiro treino
    workerApi.listSessions(userId, { limit: SESSION_HISTORY_LIMIT }).catch(() => ({ sessions: [] })),
    workerApi.getStats(userId).catch((err) => {
      console.error("Erro ao carregar stats em /:", err);
      return DEFAULT_STATS;
    }),
    // Nutrição é opcional: worker antigo ou erro não derrubam a home
    workerApi.getProfile(userId).catch(() => null),
    workerApi.getWater(userId).catch(() => null),
    workerApi.getMealsToday(userId).catch(() => null),
    // Gamificação também é opcional: sem ela a home só não mostra as missões
    workerApi.getGamification(userId).catch(() => null),
  ]);
  const plan = profileResult?.profile ? profileResult : null;
  const workouts = workoutsResult?.workouts ?? [];
  const finishedSessions = (sessionsResult?.sessions ?? []).filter((s) => s.finished_at);
  const todayWorkout = pickNextWorkout(workouts, finishedSessions);
  const todayEstimate = todayWorkout
    ? await estimateWorkout(todayWorkout.id, finishedSessions).catch(() => null)
    : null;
  // Antes de treinar, começar o treino é a ação do dia; depois, o registro de refeição e água volta para o topo
  const workoutFirst = Boolean(todayWorkout) && !stats.trainedToday;

  const workoutSection = (
    <Section
      title={stats.trainedToday ? "Próximo treino" : "Treino de hoje"}
      href="/treinos"
      linkLabel="Meus treinos"
      tour="treino-hoje"
    >
      {todayWorkout ? (
        <NextWorkout
          id={todayWorkout.id}
          name={todayWorkout.name}
          exerciseCount={todayWorkout.exercise_count}
          estimatedSets={todayEstimate?.sets ?? todayWorkout.exercise_count * 3}
          estimatedTime={todayEstimate?.time ?? "45–60 min"}
          muscleGroups={(todayWorkout.muscle_groups?.split(",").filter(Boolean) as MuscleGroup[]) ?? []}
          posters={todayEstimate?.posters ?? []}
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
  );

  return (
    <div className="space-y-8">
      <PageHeader
        plainTitle
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        subtitle={todayLabel()}
        illustration="home"
        note={
          <p className="mt-4 border-l-2 border-primary/70 pl-3 text-[15px] leading-snug text-foreground/85">
            {motivation.text}
            {motivation.author && (
              <span className="mt-1 block text-xs text-muted-foreground">— {motivation.author}</span>
            )}
          </p>
        }
      />

      {/* Some quando o app já está instalado; no computador sem suporte nem aparece */}
      <InstallAppPrompt />

      {workoutFirst && workoutSection}

      {/* Registro rápido: refeição e água sem precisar navegar */}
      <NutritionToday plan={plan} meals={meals} water={water} />

      {/* Some sozinho quando o navegador já perguntou (permitido ou bloqueado) */}
      <EnableNotificationsPrompt />

      <ShortcutGrid />

      {!workoutFirst && workoutSection}

      {gamification && (
        <>
          <CelebrationToast
            missions={gamification.missions.justCompleted}
            badges={gamification.newBadges}
            shieldsUsed={gamification.shields.justUsed}
          />
          <WeeklyMissions data={gamification} />
        </>
      )}

      <WeekVolumeHero series={stats.weeklyVolumeSeries} />

      <StreakCard compact data={stats} shields={gamification?.shields.available} />

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
