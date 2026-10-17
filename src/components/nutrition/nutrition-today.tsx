import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import { formatKcal, type ProfilePlan } from "@/lib/nutrition";

interface WaterToday {
  targetMl: number;
  entries: { id: string; amountMl: number }[];
}

/** Bloco da home: meta de calorias/macros + água, ou convite para montar o plano */
export function NutritionToday({ plan, water }: { plan: ProfilePlan | null; water: WaterToday | null }) {
  if (!plan) {
    return (
      <Link
        href="/perfil/plano"
        className="group flex items-center gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Monte seu plano de nutrição</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Peso, altura e rotina — e o Théo calcula suas calorias, macros e meta de água.
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
      </Link>
    );
  }

  const { targets: t } = plan;

  return (
    <div className="space-y-3">
      <Link
        href="/perfil/plano"
        className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-[inset_0_1px_0_oklch(1_0_0/0.05)] transition-colors hover:bg-muted/30"
      >
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Meta de hoje</p>
          <p className="tabular text-2xl font-bold tracking-tight text-foreground">
            {formatKcal(t.targetKcal)}
            <span className="ml-1 text-xs font-medium text-muted-foreground">kcal</span>
          </p>
        </div>
        <dl className="tabular flex gap-3 text-right text-xs">
          {[
            ["P", t.proteinG],
            ["C", t.carbsG],
            ["G", t.fatG],
          ].map(([label, grams]) => (
            <div key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-semibold text-foreground">{grams}g</dd>
            </div>
          ))}
        </dl>
      </Link>

      <WaterTracker entries={water?.entries ?? []} targetMl={water?.targetMl ?? plan.waterTodayMl} />
    </div>
  );
}
