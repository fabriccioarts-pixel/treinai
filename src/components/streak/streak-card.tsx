import Image from "next/image";
import { cn } from "@/lib/utils";

/*
 * Ofensiva: dias consecutivos com treino concluído (sem folga).
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
  lostStreakDays: number;
  last7Days: { date: string; trained: boolean }[];
}

export function getStreakState({ streakDays, trainedToday, lostStreakDays }: StreakData): StreakState {
  if (streakDays > 0 && !trainedToday) return "at-risk";
  if (streakDays === 0) return lostStreakDays >= 2 ? "lost" : "sleeping";
  if (streakDays >= 30) return "legendary";
  if (streakDays >= 14) return "beast";
  if (streakDays >= 7) return "on-fire";
  if (streakDays >= 3) return "warming";
  return "starting";
}

const STATE_COPY: Record<StreakState, (d: StreakData) => string> = {
  sleeping: () => "Bora acordar esse monstro? Um treino hoje e a ofensiva começa.",
  "at-risk": (d) => `Ofensiva de ${d.streakDays} ${d.streakDays === 1 ? "dia" : "dias"} em risco! Treina hoje que ainda dá tempo.`,
  lost: (d) => `Perdemos uma ofensiva de ${d.lostStreakDays} dias… Bora começar outra hoje?`,
  starting: () => "Começou! Amanhã tem mais, parceiro.",
  warming: () => "Tá aquecendo. Não para agora!",
  "on-fire": () => "Pegando fogo! O ferro não mente.",
  beast: () => "Modo monstro ativado. Tá saindo da jaula!",
  legendary: () => "Lendário. Nem em 2091 eu vi uma ofensiva dessas.",
};

const WEEKDAY_INITIAL = ["D", "S", "T", "Q", "Q", "S", "S"];

export function StreakCard({
  data,
  compact = false,
  footer,
}: {
  data: StreakData;
  compact?: boolean;
  footer?: React.ReactNode;
}) {
  const state = getStreakState(data);
  const isGold = state === "legendary";
  const isCold = state === "sleeping" || state === "lost";
  const shownDays = data.streakDays;
  const art = compact ? 104 : 136;

  return (
    <section
      aria-label="Ofensiva de treinos"
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
              {shownDays === 1 ? "dia de ofensiva" : "dias de ofensiva"}
            </span>
          </p>
          <p className={cn("mt-1.5 text-sm leading-snug text-foreground/90", compact && "line-clamp-2")}>
            {STATE_COPY[state](data)}
          </p>

          <ol className="mt-3 flex gap-1.5" aria-label="Últimos 7 dias">
            {data.last7Days.map((day, i) => {
              const isToday = i === data.last7Days.length - 1;
              const weekday = WEEKDAY_INITIAL[new Date(`${day.date}T12:00:00Z`).getUTCDay()];
              return (
                <li key={day.date} className="flex flex-col items-center gap-1">
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
                  <span
                    className={cn(
                      "text-[10px] leading-none",
                      isToday ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {weekday}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {footer && (
        <div className="tabular border-t border-border px-4 py-2.5 text-xs text-muted-foreground">{footer}</div>
      )}
    </section>
  );
}
