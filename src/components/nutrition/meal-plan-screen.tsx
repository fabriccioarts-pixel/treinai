"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeftRight, Check, ClipboardList, Copy, Lightbulb, RefreshCw, Sparkles, UtensilsCrossed } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateMealPlanAction } from "@/app/actions/meal-plan-actions";
import {
  DEFAULT_MEAL_PLAN_PREFERENCES,
  DIET_OPTIONS,
  ROUTINE_OPTIONS,
  type MealPlanPreferences,
  type SavedMealPlan,
} from "@/lib/meal-plan";
import { cn } from "@/lib/utils";
import { trackSpotlight } from "@/lib/spotlight";

/*
 * Cardápio da semana: preferências → montagem pela IA (cerca de 1 minuto) → 7 dias com trocas
 * e a lista de compras da semana, com itens para marcar no mercado.
 */

const kcal = (n: number) => n.toLocaleString("pt-BR");

export function MealPlanScreen({ hasProfile, initial }: { hasProfile: boolean; initial: SavedMealPlan | null }) {
  const [saved, setSaved] = useState(initial);
  const [editing, setEditing] = useState(!initial);
  const [prefs, setPrefs] = useState<MealPlanPreferences>(initial?.preferences ?? DEFAULT_MEAL_PLAN_PREFERENCES);
  const [error, setError] = useState<{ message: string; paywall?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!hasProfile) {
    return (
      <Link
        href="/perfil/plano"
        className="block rounded-2xl border border-primary/25 bg-primary/5 p-5 transition-colors hover:bg-primary/10"
      >
        <p className="font-semibold text-foreground">Primeiro, o seu plano de nutrição</p>
        <p className="mt-1 text-sm text-muted-foreground">
          O cardápio sai das suas metas de calorias e proteína. Preencha peso, altura e rotina (leva 1 minuto) e volte aqui.
        </p>
      </Link>
    );
  }

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await generateMealPlanAction(prefs);
      if (result.mealPlan) {
        setSaved(result.mealPlan);
        setEditing(false);
        window.scrollTo({ top: 0 });
      } else {
        setError({ message: result.error ?? "Não deu pra montar o cardápio agora.", paywall: result.paywall });
      }
    });
  }

  if (pending) return <Generating />;
  if (editing || !saved) {
    return (
      <PreferencesForm
        prefs={prefs}
        onChange={setPrefs}
        onSubmit={generate}
        onCancel={saved ? () => setEditing(false) : undefined}
        error={error}
      />
    );
  }
  return <PlanView saved={saved} onNew={() => setEditing(true)} />;
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "spotlight rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all active:scale-[0.98]",
        selected
          ? "border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/40"
          : "border-border/60 bg-card text-foreground hover:border-border",
      )}
    >
      {children}
    </button>
  );
}

function PreferencesForm({
  prefs,
  onChange,
  onSubmit,
  onCancel,
  error,
}: {
  prefs: MealPlanPreferences;
  onChange: (p: MealPlanPreferences) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  error: { message: string; paywall?: boolean } | null;
}) {
  const set = <K extends keyof MealPlanPreferences>(key: K, value: MealPlanPreferences[K]) => onChange({ ...prefs, [key]: value });

  return (
    <form
      className="space-y-7"
      onPointerMove={trackSpotlight}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <fieldset>
        <legend className="text-sm font-semibold text-foreground">Quantas refeições por dia?</legend>
        <div className="mt-3 flex gap-2">
          {([3, 4, 5] as const).map((n) => (
            <Chip key={n} selected={prefs.mealsPerDay === n} onClick={() => set("mealsPerDay", n)}>
              {n} refeições
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-foreground">Como é a sua alimentação?</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {DIET_OPTIONS.map((o) => (
            <Chip key={o.value} selected={prefs.diet === o.value} onClick={() => set("diet", o.value)}>
              {o.label}
            </Chip>
          ))}
          <Chip selected={prefs.lactoseFree} onClick={() => set("lactoseFree", !prefs.lactoseFree)}>
            Sem lactose
          </Chip>
        </div>
      </fieldset>

      <div>
        <label htmlFor="mp-avoid" className="text-sm font-semibold text-foreground">
          Algum alimento que você não come?
        </label>
        <Input
          id="mp-avoid"
          value={prefs.avoid}
          maxLength={200}
          placeholder="Ex.: peixe, beterraba, cebola"
          onChange={(e) => set("avoid", e.target.value)}
          className="mt-3 h-12"
        />
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-foreground">E a rotina com a comida?</legend>
        <div className="mt-3 grid gap-2">
          {ROUTINE_OPTIONS.map((o) => {
            const selected = prefs.routine === o.value;
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={selected}
                onClick={() => set("routine", o.value)}
                className={cn(
                  "spotlight flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all active:scale-[0.98]",
                  selected
                    ? "border-primary/60 bg-primary/10 ring-1 ring-primary/40"
                    : "border-border/60 bg-card hover:border-border",
                )}
              >
                <span>
                  <span className="block text-sm font-semibold text-foreground">{o.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{o.hint}</span>
                </span>
                {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error.message}{" "}
          {error.paywall && (
            <Link href="/assinar" className="font-semibold underline underline-offset-4">
              Ver planos
            </Link>
          )}
        </p>
      )}

      <div className="space-y-2">
        <Button type="submit" size="lg" className="group h-14 w-full gap-2 rounded-full text-base font-semibold">
          <Sparkles className="h-4 w-4" />
          Montar meu cardápio
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>
            Voltar ao cardápio atual
          </Button>
        )}
        <p className="text-center text-xs text-muted-foreground">Leva cerca de 1 minuto. Dá pra montar até 3 por dia.</p>
      </div>
    </form>
  );
}

const GENERATING_STEPS = [
  "Lendo suas metas de calorias e proteína",
  "Escolhendo os alimentos do dia a dia",
  "Montando os 7 dias",
  "Separando uma troca para cada refeição",
  "Fechando a lista de compras",
];

function Generating() {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(GENERATING_STEPS.length - 1, s + 1)), 13_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center py-10 text-center" role="status" aria-live="polite">
      <motion.div
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary"
        animate={reduceMotion ? undefined : { scale: [1, 1.08, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <UtensilsCrossed className="h-7 w-7" />
      </motion.div>
      <h2 className="mt-6 text-lg font-bold text-foreground">Montando o seu cardápio</h2>
      <p className="mt-1 text-sm text-muted-foreground">Leva cerca de 1 minuto. Pode deixar a tela aberta.</p>
      <ul className="mt-6 w-full max-w-[18rem] space-y-3 rounded-2xl border border-border/60 bg-card/60 px-5 py-4 text-left">
        {GENERATING_STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-3 text-sm transition-colors",
                done || current ? "text-foreground" : "text-muted-foreground/50",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  done ? "border-primary bg-primary text-primary-foreground" : current ? "border-primary" : "border-muted-foreground/30",
                )}
              >
                {done && <Check className="h-3 w-3" strokeWidth={3} />}
                {current && !reduceMotion && <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />}
              </span>
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Índice do dia de hoje no cardápio (segunda = 0) */
function todayIndex(count: number) {
  return Math.min(count - 1, (new Date().getDay() + 6) % 7);
}

function PlanView({ saved, onNew }: { saved: SavedMealPlan; onNew: () => void }) {
  const { plan } = saved;
  const [tab, setTab] = useState<"cardapio" | "compras">("cardapio");
  const [day, setDay] = useState(() => todayIndex(plan.days.length));
  const current = plan.days[day];
  const totals = plan.dayTotals[day];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 rounded-xl border border-border/60 bg-card p-1" role="tablist">
        {(
          [
            { id: "cardapio", label: "Cardápio", icon: UtensilsCrossed },
            { id: "compras", label: "Lista de compras", icon: ClipboardList },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors",
              tab === t.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "cardapio" ? (
        <>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {plan.days.map((d, i) => (
              <button
                key={d.day}
                type="button"
                aria-pressed={i === day}
                onClick={() => setDay(i)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  i === day ? "border-primary bg-primary text-primary-foreground" : "border-border/60 bg-card text-muted-foreground",
                )}
              >
                {d.day.slice(0, 3)}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={day}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-bold text-foreground">{current.day}</h2>
                <p className="tabular text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{kcal(totals.kcal)} kcal</span> · {totals.proteinG} g de proteína
                  <span className="block text-right">meta {kcal(plan.targets.kcal)} kcal · {plan.targets.proteinG} g</span>
                </p>
              </div>

              {current.meals.map((meal) => (
                <article key={meal.slot + meal.name} className="rounded-2xl border border-border/60 bg-card p-4">
                  <p className="text-[11px] font-bold tracking-wider text-primary uppercase">{meal.slot}</p>
                  <h3 className="mt-0.5 font-semibold text-foreground">{meal.name}</h3>
                  <ul className="mt-3 space-y-1.5">
                    {meal.items.map((item) => (
                      <li key={item.food} className="flex items-start justify-between gap-3 text-sm">
                        <span className="min-w-0">
                          <span className="text-foreground">{item.food}</span>
                          <span className="block text-xs text-muted-foreground">{item.quantity}</span>
                        </span>
                        <span className="tabular shrink-0 text-xs text-muted-foreground">{item.kcal} kcal</span>
                      </li>
                    ))}
                  </ul>
                  {meal.swap && (
                    <p className="mt-3 flex gap-2 border-t border-border/40 pt-3 text-xs text-muted-foreground">
                      <ArrowLeftRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{meal.swap}</span>
                    </p>
                  )}
                </article>
              ))}
            </motion.div>
          </AnimatePresence>

          {plan.tips.length > 0 && (
            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Lightbulb className="h-4 w-4 text-primary" />
                Dicas da semana
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {plan.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <ShoppingList saved={saved} />
      )}

      <div className="space-y-2 pt-2">
        <Button type="button" variant="outline" className="h-12 w-full gap-2 rounded-full" onClick={onNew}>
          <RefreshCw className="h-4 w-4" />
          Montar outro cardápio
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Sugestão automática a partir das suas metas. Não substitui o acompanhamento de um nutricionista.
        </p>
      </div>
    </div>
  );
}

/** Lista de compras da semana; o que já foi pego fica marcado neste aparelho */
function ShoppingList({ saved }: { saved: SavedMealPlan }) {
  const storageKey = `treinai.compras.${saved.id}`;
  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(storageKey) ?? "[]") as string[]);
    } catch {
      return new Set();
    }
  });
  const [copied, setCopied] = useState(false);
  const total = saved.plan.shopping.reduce((n, c) => n + c.items.length, 0);

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        // Sem armazenamento (aba anônima): a marcação vale só enquanto a tela estiver aberta
      }
      return next;
    });
  }

  async function copy() {
    const text = saved.plan.shopping
      .map((c) => `${c.category}\n${c.items.map((i) => `- ${i.name}: ${i.quantity}`).join("\n")}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(`Lista de compras da semana\n\n${text}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="tabular text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{checked.size}</span> de {total} itens no carrinho
        </p>
        <button type="button" onClick={copy} className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1.5" })}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copiada" : "Copiar lista"}
        </button>
      </div>

      {saved.plan.shopping.map((category) => (
        <section key={category.category} className="rounded-2xl border border-border/60 bg-card p-4">
          <h3 className="text-[11px] font-bold tracking-wider text-primary uppercase">{category.category}</h3>
          <ul className="mt-2 divide-y divide-border/40">
            {category.items.map((item) => {
              const key = `${category.category}:${item.name}`;
              const isChecked = checked.has(key);
              return (
                <li key={key}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isChecked}
                    onClick={() => toggle(key)}
                    className="flex w-full items-center gap-3 py-2.5 text-left"
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                        isChecked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                      )}
                    >
                      {isChecked && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className={cn("min-w-0 flex-1 text-sm", isChecked ? "text-muted-foreground line-through" : "text-foreground")}>
                      {item.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{item.quantity}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
