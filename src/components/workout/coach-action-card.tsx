import Link from "next/link";
import { ArrowRight, CheckCircle2, Droplet, UtensilsCrossed } from "lucide-react";
import type { CoachAction } from "@/lib/worker-api";

/*
 * Cartão do que o Théo fez numa resposta do chat: treino criado/alterado, refeição ou água registrada.
 * Treino leva para o treino; refeição e água levam para a tela inicial, onde dá para corrigir ou apagar.
 */

const MEAL_LABEL: Record<string, string> = { cafe: "Café da manhã", almoco: "Almoço", lanche: "Lanche", jantar: "Jantar" };

const liters = (ml: number) => `${(ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L`;

export function CoachActionCard({ action }: { action: CoachAction }) {
  const content = describe(action);
  return (
    <div className="group/action flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 transition-all hover:border-primary/50 hover:bg-primary/10">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
          <content.icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-bold tracking-wider text-primary uppercase">{content.label}</span>
          <h4 className="truncate text-sm font-semibold text-foreground">{content.title}</h4>
          {content.detail && <p className="truncate text-xs text-muted-foreground">{content.detail}</p>}
          {content.progress !== undefined && (
            <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.min(100, content.progress * 100)}%` }} />
            </div>
          )}
        </div>
      </div>
      <Link
        href={content.href}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25"
      >
        <span>{content.cta}</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function describe(action: CoachAction) {
  switch (action.type) {
    case "meal_logged":
      return {
        icon: UtensilsCrossed,
        label: `Refeição registrada · ${MEAL_LABEL[action.mealType] ?? "Refeição"}`,
        title: `${action.kcal.toLocaleString("pt-BR")} kcal · ${action.proteinG} g de proteína`,
        detail: action.items.join(", "),
        href: "/",
        cta: "Ver no dia",
        progress: undefined,
      };
    case "water_logged":
      return {
        icon: Droplet,
        label: "Água registrada",
        title: `+${action.amountMl} ml`,
        detail: action.targetMl
          ? `Hoje: ${liters(action.totalMl)} de ${liters(action.targetMl)}`
          : `Hoje: ${liters(action.totalMl)}`,
        href: "/",
        cta: "Ver no dia",
        progress: action.targetMl ? action.totalMl / action.targetMl : undefined,
      };
    default:
      return {
        icon: CheckCircle2,
        label: action.type === "workout_created" ? "Treino criado" : "Treino atualizado",
        title: action.name,
        detail: undefined,
        href: `/treinos/${action.workoutId}`,
        cta: "Ver treino",
        progress: undefined,
      };
  }
}
