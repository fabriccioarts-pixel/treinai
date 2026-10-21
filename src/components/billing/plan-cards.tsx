"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { startCheckoutAction } from "@/app/actions/billing-actions";
import { dailyCents, formatBRL, monthlyCents, savingsPct } from "@/lib/billing";
import type { Plan, PlanKey } from "@/lib/worker-api";
import { cn } from "@/lib/utils";

export const PLAN_FEATURES = [
  "Théo, seu personal de IA, no chat e por voz",
  "Treino montado pra você, com progressão de carga",
  "Vídeo de execução dos exercícios",
  "Meta de calorias, proteína e água, e refeição por foto",
  "Recordes, sequência e conquistas pra manter a constância",
  "Cancele quando quiser, direto no app",
];

/**
 * Escolha de plano. "trial": quem ainda não tem conta começa o teste grátis (sem cartão) no cadastro;
 * "checkout": quem já tem conta vai para o pagamento na Cakto.
 */
export function PlanCards({
  plans,
  mode,
  trialDays,
  signupHref = "/cadastro",
}: {
  plans: Plan[];
  mode: "trial" | "checkout";
  trialDays: number;
  signupHref?: string;
}) {
  const monthly = plans.find((p) => p.key === "mensal");
  const [selected, setSelected] = useState<PlanKey>("trimestral");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function checkout() {
    setError(null);
    startTransition(async () => {
      const result = await startCheckoutAction(selected);
      if (result?.error) setError(result.error);
    });
  }

  const chosen = plans.find((p) => p.key === selected);

  return (
    <div>
      <div className="grid gap-3" role="radiogroup" aria-label="Planos">
        {plans.map((plan) => {
          const isSelected = plan.key === selected;
          const savings = monthly && plan.key !== "mensal" ? savingsPct(plan, monthly) : 0;
          return (
            <button
              key={plan.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelected(plan.key)}
              className={cn(
                "relative flex items-center gap-4 rounded-2xl border p-4 text-left transition-all active:scale-[0.99]",
                isSelected
                  ? "border-primary/60 bg-primary/10 ring-1 ring-primary/40"
                  : "border-border/60 bg-card hover:border-border hover:bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                  isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                )}
              >
                {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-foreground">{plan.label}</span>
                  {savings > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                      {savings}% off
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {plan.months === 1
                    ? "Cobrado todo mês"
                    : `${formatBRL(plan.amountCents)} a cada ${plan.months} meses`}
                  {" · "}
                  {formatBRL(dailyCents(plan))} por dia
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="tabular block text-lg font-bold text-foreground">{formatBRL(monthlyCents(plan))}</span>
                <span className="block text-[11px] text-muted-foreground">por mês</span>
              </span>
            </button>
          );
        })}
      </div>

      <ul className="mt-5 space-y-2">
        {PLAN_FEATURES.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-foreground/90">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {feature}
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6">
        {mode === "trial" ? (
          <Link
            href={signupHref}
            className={buttonVariants({ size: "lg", className: "cta-shine group h-14 w-full gap-2 rounded-full text-base font-semibold" })}
          >
            {trialDays > 0 ? `Começar meus ${trialDays} dias grátis` : "Criar minha conta"}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        ) : (
          <Button
            type="button"
            size="lg"
            className="cta-shine group h-14 w-full gap-2 rounded-full text-base font-semibold"
            disabled={pending}
            onClick={checkout}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? "Abrindo pagamento…" : `Assinar por ${chosen ? formatBRL(monthlyCents(chosen)) : ""}/mês`}
            {!pending && <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />}
          </Button>
        )}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {mode === "trial"
            ? `Sem cartão agora. Depois do teste, escolha o plano para continuar com o Théo.`
            : "Pagamento seguro pela Cakto. Você tem 7 dias para desistir com reembolso integral."}
        </p>
      </div>
    </div>
  );
}
