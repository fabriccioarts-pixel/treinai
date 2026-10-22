import Link from "next/link";
import { ChevronRight, UtensilsCrossed } from "lucide-react";
import { MealLogger } from "@/components/nutrition/meal-logger";
import { MealList } from "@/components/nutrition/meal-list";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import { formatKcal, type MealsToday, type ProfilePlan } from "@/lib/nutrition";

interface WaterToday {
  targetMl: number;
  entries: { id: string; amountMl: number }[];
}

const MACROS = [
  { key: "proteinG", label: "Proteína", color: "var(--chart-1)" },
  { key: "carbsG", label: "Carbo", color: "var(--chart-2)" },
  { key: "fatG", label: "Gordura", color: "var(--chart-4)" },
] as const;

/**
 * Primeiro bloco da home: registrar refeição (foto ou texto) e água em um toque,
 * com o quanto já foi consumido em relação à meta do dia.
 */
export function NutritionToday({
  plan,
  meals,
  water,
}: {
  plan: ProfilePlan | null;
  meals: MealsToday | null;
  water: WaterToday | null;
}) {
  const eaten = meals?.totals ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  const target = plan?.targets;
  const kcalPct = target ? Math.min(100, (eaten.kcal / target.targetKcal) * 100) : 0;
  const remaining = target ? target.targetKcal - eaten.kcal : null;

  return (
    <section aria-label="Registro de hoje" className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[inset_0_1px_0_oklch(1_0_0/0.05)]">
        <div className="flex items-baseline justify-between gap-3">
          <p className="tabular text-2xl font-bold tracking-tight text-foreground">
            {formatKcal(eaten.kcal)}
            {target && (
              <span className="ml-1 text-sm font-medium text-muted-foreground">/ {formatKcal(target.targetKcal)} kcal</span>
            )}
            {!target && <span className="ml-1 text-sm font-medium text-muted-foreground">kcal hoje</span>}
          </p>
          {remaining !== null && (
            <p className="tabular shrink-0 text-xs text-muted-foreground">
              {remaining >= 0 ? `faltam ${formatKcal(remaining)}` : `${formatKcal(-remaining)} acima`}
            </p>
          )}
        </div>

        {target && (
          <>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div
                className={remaining !== null && remaining < 0 ? "h-full rounded-full bg-gold" : "h-full rounded-full bg-primary"}
                style={{ width: `${kcalPct}%` }}
              />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
              {MACROS.map((m) => (
                <div key={m.key}>
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
                    {m.label}
                  </dt>
                  <dd className="tabular mt-0.5 font-semibold text-foreground">
                    {eaten[m.key]}
                    <span className="font-normal text-muted-foreground">/{target[m.key]}g</span>
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}

        <div className="mt-4">
          <MealLogger />
        </div>

        {meals && meals.meals.length > 0 && (
          <div className="mt-2">
            <MealList meals={meals.meals} />
          </div>
        )}
      </div>

      <WaterTracker entries={water?.entries ?? []} targetMl={water?.targetMl ?? plan?.waterTodayMl ?? 2000} />

      {plan && (
        <Link
          href="/cardapio"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <UtensilsCrossed className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Cardápio da semana</p>
            <p className="mt-0.5 text-xs text-muted-foreground">O que comer em cada dia, com trocas e lista de compras.</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      {!plan && (
        <Link
          href="/perfil/plano"
          className="group flex items-center gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Monte seu plano de nutrição</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Peso, altura e rotina — e o Théo calcula suas metas de calorias, macros e água.
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </section>
  );
}
