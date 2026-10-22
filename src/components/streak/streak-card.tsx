import Image from "next/image";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Constância: dias com treino concluído, tolerando 1 dia de folga entre treinos (regra no worker).
 * O Théo muda de expressão conforme o estado — arte em /public/theo/<estado>.jpg (fundo preto,
 * mesclada com `mix-blend-screen` para o fundo sumir e o contorno holográfico brilhar no card).
 */
export type StreakState =
  | "sleeping"
  | "at-risk"
  | "lost"
  | "starting"
  | "warming"
  | "on-fire"
  | "beast"
  | "legendary";

export interface StreakData {
  streakDays: number;
  trainedToday: boolean;
  /** Folga já usada: sem treino hoje, a constância quebra */
  streakAtRisk: boolean;
  lostStreakDays: number;
  last7Days: { date: string; trained: boolean; shielded?: boolean }[];
}

/** Campos novos do worker podem faltar quando o front é publicado antes do worker */
type StreakInput = { streakDays?: number } & Partial<Omit<StreakData, "streakDays">>;

function normalizeStreak(input: StreakInput): StreakData {
  const streakDays = input.streakDays ?? 0;
  // Sem a informação, não acusa "em risco" à toa: assume que a constância está em dia
  const trainedToday = input.trainedToday ?? streakDays > 0;
  return {
    streakDays,
    trainedToday,
    // Worker antigo (sem folga) não manda o campo: qualquer dia sem treino era risco
    streakAtRisk: input.streakAtRisk ?? (streakDays > 0 && !trainedToday),
    lostStreakDays: input.lostStreakDays ?? 0,
    last7Days: Array.isArray(input.last7Days) ? input.last7Days : [],
  };
}

export function getStreakState({ streakDays, streakAtRisk, lostStreakDays }: StreakData): StreakState {
  if (streakDays > 0 && streakAtRisk) return "at-risk";
  if (streakDays === 0) return lostStreakDays >= 2 ? "lost" : "sleeping";
  if (streakDays >= 30) return "legendary";
  if (streakDays >= 14) return "beast";
  if (streakDays >= 7) return "on-fire";
  if (streakDays >= 3) return "warming";
  return "starting";
}

const STATE_COPY: Record<StreakState, (d: StreakData) => string> = {
  sleeping: () => "Um treino hoje começa a contagem.",
  "at-risk": (d) => `Constância de ${d.streakDays} ${d.streakDays === 1 ? "dia" : "dias"} em risco. A folga já foi — treina hoje.`,
  lost: (d) => `Caiu uma constância de ${d.lostStreakDays} dias. Hoje começa de novo.`,
  starting: () => "Dia 1. Amanhã tem mais.",
  warming: () => "Três dias firmes. Não para agora.",
  "on-fire": () => "Uma semana cheia. Está pegando.",
  beast: () => "Duas semanas. Virou rotina.",
  legendary: () => "Um mês de constância. Isso é disciplina.",
};

const WEEKDAY_INITIAL = ["D", "S", "T", "Q", "Q", "S", "S"];

export function StreakCard({
  data: input,
  compact = false,
  footer,
  shields,
}: {
  data: StreakInput;
  compact?: boolean;
  footer?: React.ReactNode;
  /** Escudos guardados; ausente quando a gamificação não carregou */
  shields?: number;
}) {
  const data = normalizeStreak(input);
  const state = getStreakState(data);
  const isGold = state === "legendary";
  const isCold = state === "sleeping" || state === "lost";
  const shownDays = data.streakDays;
  const art = compact ? 104 : 136;

  return (
    <section
      aria-label="Constância de treinos"
      className={cn(
        "relative overflow-hidden rounded-3xl border bg-card shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]",
        isGold ? "border-gold/40" : state === "at-risk" ? "border-gold/25" : "border-border",
      )}
    >
      <div className="flex items-end gap-1">
        <Image
          src={`/theo/${state}.jpg`}
          alt=""
          aria-hidden
          width={art}
          height={art}
          className="shrink-0 select-none mix-blend-screen"
          style={{
            width: art,
            height: art,
            maskImage: "linear-gradient(to bottom, black 72%, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, black 72%, transparent)",
          }}
          priority
        />

        <div className={cn("min-w-0 flex-1 pr-4", compact ? "py-3.5" : "py-5")}>
          <p className="flex items-baseline gap-1.5">
            <span
              className={cn(
                "tabular leading-none font-bold tracking-[-0.04em]",
                compact ? "text-4xl" : "text-5xl",
                isGold ? "text-gold" : isCold ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {shownDays}
            </span>
            <span className="text-sm font-semibold text-muted-foreground">
              {shownDays === 1 ? "dia de constância" : "dias de constância"}
            </span>
            {shields !== undefined && shields > 0 && (
              <span
                className="tabular ml-auto inline-flex items-center gap-1 self-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
                title={`${shields} ${shields === 1 ? "escudo guardado" : "escudos guardados"}`}
              >
                <Shield className="h-3.5 w-3.5 fill-primary/25" aria-hidden />
                {shields}
              </span>
            )}
          </p>
          <p className={cn("mt-1.5 text-sm leading-snug text-foreground/90", compact && "line-clamp-2")}>
            {STATE_COPY[state](data)}
          </p>

          {data.last7Days.length > 0 && (
          <ol className="mt-3 flex gap-1.5" aria-label="Últimos 7 dias">
            {data.last7Days.map((day, i) => {
              const isToday = i === data.last7Days.length - 1;
              const weekday = WEEKDAY_INITIAL[new Date(`${day.date}T12:00:00Z`).getUTCDay()];
              return (
                <li key={day.date} className="flex flex-col items-center gap-1">
                  {day.shielded && !day.trained ? (
                    <Shield
                      aria-label={`${day.date}: protegido por escudo`}
                      className="h-2.5 w-2.5 fill-primary/40 text-primary"
                    />
                  ) : (
                  <span
                    aria-label={`${day.date}: ${day.trained ? "treinou" : "sem treino"}`}
                    className={cn(
                      "block h-2.5 w-2.5 rounded-full",
                      day.trained
                        ? isGold
                          ? "bg-gold shadow-[0_2px_8px_-2px_var(--gold)]"
                          : "bg-primary shadow-[0_2px_8px_-2px_var(--primary)]"
                        : isToday
                          ? "ring-1 ring-muted-foreground ring-inset"
                          : "bg-muted",
                    )}
                  />
                  )}
                  <span
                    className={cn(
                      "text-[11px] leading-none",
                      isToday ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {weekday}
                  </span>
                </li>
              );
            })}
          </ol>
          )}
        </div>
      </div>

      {footer && (
        <div className="tabular border-t border-border px-4 py-2.5 text-xs text-muted-foreground">{footer}</div>
      )}
    </section>
  );
}
