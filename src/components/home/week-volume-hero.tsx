import { TrendingDown } from "lucide-react";
import { TrendIcon } from "@/components/ui/app-icon";
import { Illustration } from "@/components/ui/illustration";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@/lib/types";
import { cn } from "@/lib/utils";

interface WeekVolumeHeroProps {
  /** Séries concluídas por grupo muscular nos últimos 7 dias; ausente se o worker ainda não manda */
  muscleSets?: { muscle: string; sets: number }[];
  /** Tonelagem das últimas semanas em ordem cronológica; o último item é a semana atual (últimos 7 dias) */
  series: { week: string; volume: number }[];
}

/**
 * Faixa de séries por semana em que cada grupo cresce bem (referência de hipertrofia, ~10–20 por músculo).
 * Pernas juntam quadríceps, posteriores, glúteos e panturrilha; bíceps e tríceps já trabalham nos compostos.
 */
const WEEKLY_RANGE: { muscle: MuscleGroup; min: number; max: number }[] = [
  { muscle: "peito", min: 10, max: 20 },
  { muscle: "costas", min: 10, max: 20 },
  { muscle: "pernas", min: 12, max: 24 },
  { muscle: "ombros", min: 8, max: 16 },
  { muscle: "biceps", min: 6, max: 14 },
  { muscle: "triceps", min: 6, max: 14 },
  { muscle: "abdomen", min: 4, max: 12 },
];

function formatKg(value: number) {
  return Math.round(value).toLocaleString("pt-BR");
}

function status(sets: number, min: number, max: number) {
  if (sets === 0) return { label: "sem séries", tone: "text-muted-foreground" };
  if (sets < min) return { label: `faltam ${min - sets}`, tone: "text-muted-foreground" };
  if (sets <= max) return { label: "na faixa", tone: "text-primary" };
  return { label: "acima", tone: "text-gold" };
}

export function WeekVolumeHero({ muscleSets, series }: WeekVolumeHeroProps) {
  const counts = new Map((muscleSets ?? []).map((m) => [m.muscle, m.sets]));
  const totalSets = (muscleSets ?? []).reduce((sum, m) => sum + m.sets, 0);
  const inRange = WEEKLY_RANGE.filter(({ muscle, min }) => (counts.get(muscle) ?? 0) >= min).length;

  const current = series.at(-1)?.volume ?? 0;
  const previous = series.at(-2)?.volume ?? 0;
  const maxVolume = Math.max(...series.map((s) => s.volume), 1);
  const hasVolume = series.some((s) => s.volume > 0);
  const delta = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

  return (
    <section
      aria-label="Volume da semana"
      className="rounded-3xl border border-border bg-card p-5 shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium text-muted-foreground">Volume da semana</h2>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-2">
            <span className="tabular text-5xl leading-none font-bold tracking-[-0.04em] text-foreground">
              {totalSets}
            </span>
            <span className="text-base font-semibold text-muted-foreground">
              {totalSets === 1 ? "série" : "séries"}
            </span>
            {muscleSets && totalSets > 0 && (
              <span className="tabular ml-1 rounded-full bg-primary/12 px-2 py-0.5 text-xs font-semibold text-primary">
                {inRange} de {WEEKLY_RANGE.length} na faixa
              </span>
            )}
          </p>
        </div>
        {/* No canto direito, como a garrafa do card de água */}
        <Illustration name="volume" size={84} className="-my-3 -mr-2" />
      </div>

      {muscleSets && (
        <ul className="mt-5 space-y-3" aria-label="Séries por grupo muscular">
          {WEEKLY_RANGE.map(({ muscle, min, max }, i) => {
            const sets = counts.get(muscle) ?? 0;
            const s = status(sets, min, max);
            // A barra vai até um pouco além do máximo; a faixa recomendada aparece como trilho mais claro
            const scale = max * 1.25;
            const fill = Math.min(100, (sets / scale) * 100);
            return (
              <li key={muscle}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-medium text-foreground/90">{MUSCLE_GROUP_LABEL[muscle]}</span>
                  <span className="tabular text-muted-foreground">
                    <span className="font-semibold text-foreground">{sets}</span> / {min}–{max}
                    <span className={cn("ml-1.5", s.tone)}>· {s.label}</span>
                  </span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-muted/60" role="presentation">
                  <div
                    className="absolute inset-y-0 bg-primary/15"
                    style={{ left: `${(min / scale) * 100}%`, width: `${((max - min) / scale) * 100}%` }}
                  />
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 origin-left rounded-full motion-safe:animate-[bar-rise-x_700ms_cubic-bezier(0.16,1,0.3,1)_both]",
                      sets > max ? "bg-gold" : sets >= min ? "bg-primary" : "bg-foreground/35",
                    )}
                    style={{ width: `${fill}%`, animationDelay: `${i * 50}ms` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {muscleSets && totalSets === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          Conclua séries nos treinos para ver quanto cada músculo trabalhou na semana.
        </p>
      )}

      {/* Tonelagem (carga × repetições) em segundo plano: o número grande que alguns gostam de ver subir */}
      {hasVolume && (
        <div className="mt-5 flex items-end justify-between gap-4 border-t border-border/60 pt-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground">Tonelagem (carga × repetições)</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="tabular text-base font-semibold text-foreground">{formatKg(current)} kg</span>
              {delta !== null && (
                <span
                  className={cn(
                    "tabular inline-flex items-center gap-1 text-xs font-medium",
                    delta >= 0 ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {delta >= 0 ? <TrendIcon className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {delta > 0 ? "+" : ""}
                  {delta}% vs anterior
                </span>
              )}
            </p>
          </div>
          <div className="flex h-8 w-24 shrink-0 items-end gap-1" role="img" aria-label="Tonelagem nas últimas 6 semanas">
            {series.map((w, i) => (
              <div
                key={w.week}
                title={`${formatKg(w.volume)} kg`}
                className={cn(
                  "flex-1 rounded-sm",
                  i === series.length - 1 ? "bg-primary" : "bg-foreground/15",
                )}
                style={{ height: `${Math.max(8, (w.volume / maxVolume) * 100)}%` }}
              />
            ))}
          </div>
        </div>
      )}

      {!muscleSets && !hasVolume && (
        <p className="mt-4 text-sm text-muted-foreground">
          Seu volume semanal aparece aqui assim que você registrar as primeiras séries.
        </p>
      )}
    </section>
  );
}
