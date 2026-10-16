import { TrendingDown } from "lucide-react";
import { TrendIcon } from "@/components/ui/app-icon";
import { cn } from "@/lib/utils";

interface WeekVolumeHeroProps {
  /** Últimas semanas em ordem cronológica; o último item é a semana atual (últimos 7 dias) */
  series: { week: string; volume: number }[];
}

function formatKg(value: number) {
  return Math.round(value).toLocaleString("pt-BR");
}

export function WeekVolumeHero({ series }: WeekVolumeHeroProps) {
  const current = series.at(-1)?.volume ?? 0;
  const previous = series.at(-2)?.volume ?? 0;
  const max = Math.max(...series.map((s) => s.volume), 1);
  const hasData = series.some((s) => s.volume > 0);
  const delta = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

  return (
    <section
      aria-label="Volume da semana"
      className="rounded-3xl border border-border bg-card p-5 shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Volume da semana</h2>
        {delta !== null && (
          <span
            className={cn(
              "tabular inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
              delta >= 0 ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {delta >= 0 ? <TrendIcon className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {delta > 0 ? "+" : ""}
            {delta}% vs anterior
          </span>
        )}
      </div>

      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="tabular text-6xl leading-none font-bold tracking-[-0.04em] text-foreground">
          {formatKg(current)}
        </span>
        <span className="text-lg font-semibold text-muted-foreground">kg</span>
      </p>

      {hasData ? (
        <div className="mt-6">
          <div className="flex h-24 items-end gap-2" role="img" aria-label="Volume por semana nas últimas 6 semanas">
            {series.map((s, i) => {
              const isCurrent = i === series.length - 1;
              const height = Math.max(4, (s.volume / max) * 100);
              return (
                <div key={s.week} className="flex h-full flex-1 items-end">
                  <div
                    title={`${formatKg(s.volume)} kg`}
                    className={cn(
                      "w-full origin-bottom rounded-md motion-safe:animate-[bar-rise_900ms_cubic-bezier(0.16,1,0.3,1)_both]",
                      isCurrent
                        ? "bg-primary shadow-[0_8px_20px_-8px_var(--primary)]"
                        : "bg-foreground/[0.09]",
                    )}
                    style={{ height: `${height}%`, animationDelay: `${i * 60}ms` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2">
            {series.map((s, i) => {
              const isCurrent = i === series.length - 1;
              return (
                <span
                  key={s.week}
                  className={cn(
                    "tabular flex-1 text-center text-[10px]",
                    isCurrent ? "font-semibold text-primary" : "text-muted-foreground",
                  )}
                >
                  {isCurrent ? "Agora" : s.week}
                </span>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Seu volume semanal aparece aqui assim que você registrar as primeiras séries.
        </p>
      )}
    </section>
  );
}
