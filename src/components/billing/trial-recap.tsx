import { Check, Droplet, Dumbbell, Flame, MessageCircle, Trophy, UtensilsCrossed, X } from "lucide-react";
import { goalProjection, monthYear } from "@/lib/diagnostico";
import type { TrialRecap as Recap } from "@/lib/worker-api";

/*
 * Topo da tela de planos no fim do teste: o que a pessoa já fez (ou o que já está pronto para ela),
 * a meta com a data prevista, e o que continua salvo versus o que para sem assinatura.
 * Perder o que já é seu pesa mais que uma lista de recursos.
 */

const liters = (ml: number) => `${(ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L`;

const KEEPS = ["Seus treinos e todo o histórico", "Recordes, constância e conquistas", "Refeições e água já registradas"];
const STOPS = [
  "Conversar com o Théo, por texto e por voz",
  "Registrar refeição pela foto do prato",
  "Montar o cardápio da semana",
  "Análise do corpo por foto",
];

export function TrialRecap({ recap, expired }: { recap: Recap; expired: boolean }) {
  const done = [
    { icon: Dumbbell, value: recap.workoutsDone, label: recap.workoutsDone === 1 ? "treino concluído" : "treinos concluídos" },
    { icon: Trophy, value: recap.records, label: recap.records === 1 ? "recorde batido" : "recordes batidos" },
    { icon: Flame, value: recap.streakDays, label: recap.streakDays === 1 ? "dia de constância" : "dias de constância" },
    { icon: UtensilsCrossed, value: recap.meals, label: recap.meals === 1 ? "refeição registrada" : "refeições registradas" },
    { icon: Droplet, value: recap.waterMl, text: liters(recap.waterMl), label: "de água registrados" },
    { icon: MessageCircle, value: recap.coachMessages, label: recap.coachMessages === 1 ? "conversa com o Théo" : "conversas com o Théo" },
  ].filter((s) => s.value > 0);

  // Quem quase não usou vê o que já está pronto para ela, em vez de uma lista de zeros
  const ready = [
    recap.workoutsCreated > 0 && {
      icon: Dumbbell,
      value: recap.workoutsCreated,
      label: recap.workoutsCreated === 1 ? "treino montado pra você" : "treinos montados pra você",
    },
    recap.hasMealPlan && { icon: UtensilsCrossed, text: "7 dias", label: "de cardápio prontos", value: 1 },
  ].filter(Boolean) as { icon: typeof Dumbbell; value: number; text?: string; label: string }[];

  const stats = done.length >= 2 ? done : [...done, ...ready];
  const name = recap.firstName ? `, ${recap.firstName}` : "";
  const projection = recap.goal ? goalProjection(recap.goal.weightKg, recap.goal.targetKg) : null;

  return (
    <section className="mb-6 space-y-3" aria-label="Seu teste">
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <h2 className="text-lg leading-snug font-bold text-foreground">
          {done.length >= 2
            ? `Em ${recap.daysSinceSignup} ${recap.daysSinceSignup === 1 ? "dia" : "dias"} com o Théo${name}, você já fez isso:`
            : `Seu plano já está pronto${name}.`}
        </h2>

        {stats.length > 0 && (
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {stats.map((s) => (
              <li key={s.label} className="rounded-xl bg-card px-3 py-3">
                <s.icon className="h-4 w-4 text-primary" />
                <p className="tabular mt-1.5 text-xl font-bold text-foreground">{s.text ?? s.value}</p>
                <p className="text-xs leading-tight text-muted-foreground">{s.label}</p>
              </li>
            ))}
          </ul>
        )}

        {recap.goal && projection && projection.direction !== "manter" && (
          <p className="mt-4 rounded-xl bg-card px-3 py-3 text-sm text-foreground/90">
            Sua meta: <strong className="text-foreground">{recap.goal.targetKg.toLocaleString("pt-BR")} kg</strong>, por
            volta de <strong className="text-primary">{monthYear(projection.date)}</strong>, se você seguir no ritmo.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Continua salvo</p>
          <ul className="mt-2.5 space-y-2">
            {KEEPS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-foreground/90">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {expired ? "Parou com o fim do teste" : "Para quando o teste acabar"}
          </p>
          <ul className="mt-2.5 space-y-2">
            {STOPS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive/80" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
