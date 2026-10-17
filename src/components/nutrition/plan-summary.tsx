import { formatKcal, formatLiters, type ProfilePlan } from "@/lib/nutrition";
import { cn } from "@/lib/utils";

const ACTIVITY_SHORT: Record<string, string> = {
  sedentario: "rotina sentada",
  leve: "rotina leve",
  moderado: "rotina ativa",
  intenso: "rotina pesada",
};

const MACROS = [
  { key: "proteinG", label: "Proteína", kcalPerG: 4, color: "var(--chart-1)" },
  { key: "carbsG", label: "Carboidrato", kcalPerG: 4, color: "var(--chart-2)" },
  { key: "fatG", label: "Gordura", kcalPerG: 9, color: "var(--chart-4)" },
] as const;

function adjustmentLabel(plan: ProfilePlan): string {
  const { goal } = plan.profile;
  const { adjustmentKcal, deficitBlockedReason } = plan.targets;
  if (deficitBlockedReason) return "manutenção, sem déficit por segurança";
  if (adjustmentKcal < 0) return "déficit para perder gordura";
  if (adjustmentKcal > 0) return goal === "ganho-massa" ? "superávit para ganhar massa" : "superávit leve para construir músculo";
  return "manutenção";
}

export function PlanSummary({ plan, className }: { plan: ProfilePlan; className?: string }) {
  const { targets: t, profile: p } = plan;
  const macroKcal = MACROS.map((m) => t[m.key] * m.kcalPerG);
  const macroTotal = macroKcal.reduce((a, b) => a + b, 0) || 1;

  const steps = [
    { label: `Metabolismo basal (${t.bmrFormula === "katch-mcardle" ? "pela massa magra" : "Mifflin-St Jeor"})`, value: formatKcal(t.bmr) },
    { label: `× ${t.activityFactor.toLocaleString("pt-BR")} pela ${ACTIVITY_SHORT[p.activityLevel] ?? "rotina"}`, value: formatKcal(Math.round(t.bmr * t.activityFactor)) },
    {
      label: `+ treinos (${t.exerciseSource === "real" ? "medido nos seus treinos" : `${p.trainingDays}x por semana`})`,
      value: `+${formatKcal(t.exerciseKcalPerDay)}`,
    },
    { label: "Gasto diário", value: formatKcal(t.tdee), strong: true },
    { label: adjustmentLabel(plan), value: `${t.adjustmentKcal >= 0 ? "+" : "−"}${formatKcal(Math.abs(t.adjustmentKcal))}` },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <section className="rounded-3xl border border-border bg-card p-5 shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Sua meta diária</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="tabular text-5xl leading-none font-bold tracking-[-0.04em] text-foreground">
            {formatKcal(t.targetKcal)}
          </span>
          <span className="text-sm font-semibold text-muted-foreground">kcal</span>
        </p>

        <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          {MACROS.map((m, i) => (
            <span key={m.key} style={{ width: `${(macroKcal[i] / macroTotal) * 100}%`, background: m.color }} />
          ))}
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2">
          {MACROS.map((m) => (
            <div key={m.key}>
              <dt className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
                {m.label}
              </dt>
              <dd className="tabular mt-0.5 text-lg font-bold text-foreground">
                {t[m.key]}
                <span className="ml-0.5 text-xs font-medium text-muted-foreground">g</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Água</p>
          <p className="tabular mt-0.5 text-2xl font-bold text-foreground">{formatLiters(t.waterBaseMl)}</p>
        </div>
        <p className="max-w-[55%] text-right text-xs text-muted-foreground">
          +{formatLiters(t.waterTrainingExtraMl)} nos dias de treino
        </p>
      </section>

      <details className="group rounded-2xl border border-border bg-card px-5 py-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
          Como chegamos nesse número
          <span className="ml-1 text-muted-foreground group-open:hidden">›</span>
        </summary>
        <dl className="mt-3 space-y-2 text-sm">
          {steps.map((s) => (
            <div key={s.label} className={cn("flex justify-between gap-4", s.strong && "border-t border-border pt-2 font-semibold")}>
              <dt className="text-muted-foreground">{s.label}</dt>
              <dd className="tabular shrink-0 text-foreground">{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          É uma estimativa. Conforme você registra treinos, o gasto passa a usar o tempo real que você treina. O Treinai
          não substitui o acompanhamento de um nutricionista.
        </p>
      </details>

      {t.deficitBlockedReason && (
        <p className="rounded-2xl border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-foreground/90">
          {t.deficitBlockedReason === "menor-de-idade"
            ? "Para quem tem menos de 18 anos, não aplicamos déficit calórico. Treino e boa alimentação já fazem muita diferença — e vale conversar com um nutricionista."
            : "Por causa da situação de saúde que você informou, mantivemos suas calorias em manutenção. Ajuste o plano com seu nutricionista ou médico."}
        </p>
      )}
    </div>
  );
}
