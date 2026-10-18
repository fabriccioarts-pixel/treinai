"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, ChevronRight } from "lucide-react";
import { Illustration, type IllustrationName } from "@/components/ui/illustration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@/lib/types";
import { saveProfileAction } from "@/app/actions/nutrition-actions";
import {
  ACTIVITY_OPTIONS,
  GOAL_OPTIONS,
  SEX_OPTIONS,
  type ActivityLevel,
  type Goal,
  type ProfileInput,
  type Sex,
} from "@/lib/nutrition";
import { cn } from "@/lib/utils";

/*
 * Quiz do perfil: uma pergunta por tela, com avanço automático nas escolhas únicas.
 * Mesmo componente no onboarding (tela cheia) e em Perfil → Corpo e plano (edição).
 * Quem já tem perfil começa no resumo e toca só no que quer mudar.
 */

const GOAL_ART: Record<Goal, IllustrationName> = {
  hipertrofia: "hypertrophy",
  emagrecimento: "fat-loss",
  "ganho-massa": "mass-gain",
  enfase: "focus",
};

const ENFASE_GROUPS: MuscleGroup[] = ["peito", "costas", "pernas", "ombros", "biceps", "triceps"];
const DIAS_OPTIONS = [2, 3, 4, 5, 6];
/** Tempo para a pessoa ver a opção marcada antes de passar para a próxima pergunta */
const AUTO_ADVANCE_MS = 280;

const STEPS = ["goal", "days", "sex", "birth", "measures", "extras", "activity", "schedule", "health", "review"] as const;
type StepId = (typeof STEPS)[number];

const QUESTION: Record<StepId, { title: string; hint?: string }> = {
  goal: { title: "Qual é o seu objetivo principal?" },
  days: { title: "Quantos dias por semana você consegue treinar?", hint: "Seja realista — constância vale mais que volume." },
  sex: { title: "Qual seu sexo biológico?", hint: "Só para a fórmula do metabolismo. Sem essa informação, usamos uma média." },
  birth: { title: "Quando você nasceu?", hint: "O metabolismo muda com a idade." },
  measures: { title: "Qual sua altura e seu peso?" },
  extras: {
    title: "Quer deixar o cálculo mais preciso?",
    hint: "Opcional. % de gordura (bioimpedância, dobras) e o peso que você quer chegar.",
  },
  activity: { title: "Fora da academia, seu dia é…", hint: "Trabalho, estudo e deslocamento contam muito no gasto." },
  schedule: { title: "Que horas você acorda e dorme?", hint: "Para espalhar os lembretes de água ao longo do seu dia." },
  health: {
    title: "Alguma destas situações vale para você?",
    hint: "Gestação ou amamentação, transtorno alimentar (atual ou passado) ou dieta com orientação médica.",
  },
  review: { title: "Tudo certo?", hint: "Toque em qualquer resposta para mudar." },
};

/** Aceita "72,5" ou "72.5"; vazio vira null */
function parseNumber(value: string): number | null {
  const n = Number(value.trim().replace(",", "."));
  return value.trim() === "" || Number.isNaN(n) ? null : n;
}

const toInput = (n: number | null | undefined) => (n ? String(n).replace(".", ",") : "");

function formatBirthDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

function OptionCard({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all active:scale-[0.98]",
        selected
          ? "border-primary/60 bg-primary/10 ring-1 ring-primary/40"
          : "border-border/60 bg-card hover:border-border hover:bg-muted/40",
        className,
      )}
    >
      {children}
    </button>
  );
}

function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          autoFocus={autoFocus}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="tabular h-16 pr-14 text-center text-3xl font-bold md:text-3xl"
        />
        <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-base text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  );
}

export function ProfileForm({
  mode,
  initial,
}: {
  mode: "onboarding" | "edit";
  initial?: Partial<ProfileInput>;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const hasInitial = !!initial?.goal;
  const needsConsent = mode === "onboarding" || !hasInitial;

  // Quem já tem perfil começa no resumo; quem está preenchendo, na primeira pergunta
  const [stepIndex, setStepIndex] = useState(hasInitial ? STEPS.indexOf("review") : 0);
  const [direction, setDirection] = useState<1 | -1>(1);
  /** Veio do resumo para mudar uma resposta: ao confirmar, volta direto ao resumo */
  const [returnToReview, setReturnToReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [goal, setGoal] = useState<Goal | null>(initial?.goal ?? null);
  const [emphasis, setEmphasis] = useState<string | null>(initial?.emphasis ?? null);
  const [trainingDays, setTrainingDays] = useState<number | null>(initial?.trainingDays ?? null);
  const [sex, setSex] = useState<Sex | null>(initial?.sex ?? null);
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? "");
  const [height, setHeight] = useState(initial?.heightCm ? String(initial.heightCm) : "");
  const [weight, setWeight] = useState(toInput(initial?.weightKg));
  const [bodyFat, setBodyFat] = useState(toInput(initial?.bodyFatPct));
  const [targetWeight, setTargetWeight] = useState(toInput(initial?.targetWeightKg));
  const [activity, setActivity] = useState<ActivityLevel | null>(initial?.activityLevel ?? null);
  const [wakeTime, setWakeTime] = useState(initial?.wakeTime ?? "07:00");
  const [sleepTime, setSleepTime] = useState(initial?.sleepTime ?? "23:00");
  const [healthRestriction, setHealthRestriction] = useState<boolean | null>(initial?.healthRestriction ?? null);
  const [consent, setConsent] = useState(!needsConsent);

  const step = STEPS[stepIndex];
  const isReview = step === "review";

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  /** Mensagem de erro da etapa, ou null se pode avançar */
  function validate(id: StepId): string | null {
    switch (id) {
      case "goal":
        if (!goal) return "Escolha um objetivo.";
        if (goal === "enfase" && !emphasis) return "Escolha o grupo muscular.";
        return null;
      case "days":
        return trainingDays ? null : "Escolha quantos dias.";
      case "sex":
        return sex ? null : "Escolha uma opção.";
      case "birth":
        return birthDate ? null : "Informe sua data de nascimento.";
      case "measures": {
        const h = parseNumber(height);
        const w = parseNumber(weight);
        if (!h || h < 120 || h > 230) return "Informe sua altura em centímetros (ex.: 172).";
        if (!w || w < 30 || w > 300) return "Informe seu peso em kg (ex.: 74,5).";
        return null;
      }
      case "extras": {
        const bf = parseNumber(bodyFat);
        const tw = parseNumber(targetWeight);
        if (bf !== null && (bf < 3 || bf > 60)) return "O % de gordura precisa ficar entre 3 e 60.";
        if (tw !== null && (tw < 30 || tw > 300)) return "Confira o peso desejado.";
        return null;
      }
      case "activity":
        return activity ? null : "Escolha a opção mais parecida com seu dia.";
      case "schedule":
        return wakeTime && sleepTime ? null : "Informe os dois horários.";
      case "health":
        return healthRestriction === null ? "Responda sim ou não." : null;
      case "review":
        return null;
    }
  }

  function goTo(index: number) {
    setError(null);
    setSaved(false);
    setDirection(index > stepIndex ? 1 : -1);
    setStepIndex(index);
  }

  function next() {
    const problem = validate(step);
    if (problem) {
      setError(problem);
      return;
    }
    if (returnToReview) {
      setReturnToReview(false);
      goTo(STEPS.indexOf("review"));
      return;
    }
    goTo(Math.min(stepIndex + 1, STEPS.length - 1));
  }

  function back() {
    if (returnToReview) {
      setReturnToReview(false);
      goTo(STEPS.indexOf("review"));
      return;
    }
    goTo(Math.max(stepIndex - 1, 0));
  }

  /** Escolha única: marca e avança sozinho depois de um instante */
  function choose(apply: () => void, canAdvance = true) {
    apply();
    setError(null);
    if (!canAdvance) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      if (returnToReview) {
        setReturnToReview(false);
        goTo(STEPS.indexOf("review"));
      } else {
        goTo(stepIndex + 1);
      }
    }, AUTO_ADVANCE_MS);
  }

  function editFromReview(id: StepId) {
    setReturnToReview(true);
    goTo(STEPS.indexOf(id));
  }

  function handleSubmit() {
    setError(null);
    setSaved(false);
    const firstInvalid = STEPS.find((id) => validate(id) !== null);
    if (firstInvalid) {
      editFromReview(firstInvalid);
      setError(validate(firstInvalid));
      return;
    }
    if (!consent) {
      setError("Marque a autorização para calcularmos seu plano.");
      return;
    }

    const input = {
      goal: goal!,
      emphasis: goal === "enfase" ? emphasis : null,
      trainingDays: trainingDays!,
      sex: sex!,
      birthDate,
      heightCm: parseNumber(height)!,
      weightKg: parseNumber(weight)!,
      bodyFatPct: parseNumber(bodyFat),
      targetWeightKg: parseNumber(targetWeight),
      activityLevel: activity!,
      wakeTime,
      sleepTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo",
      healthRestriction: healthRestriction!,
      healthConsent: consent,
    };

    startTransition(async () => {
      const result = await saveProfileAction(input, mode === "onboarding" ? "/bem-vindo/plano" : undefined);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  const reviewRows: { id: StepId; label: string; value: string }[] = [
    {
      id: "goal",
      label: "Objetivo",
      value: `${GOAL_OPTIONS.find((o) => o.value === goal)?.label ?? "—"}${
        goal === "enfase" && emphasis ? ` · ${MUSCLE_GROUP_LABEL[emphasis as MuscleGroup] ?? emphasis}` : ""
      }`,
    },
    { id: "days", label: "Treinos por semana", value: trainingDays ? `${trainingDays} dias` : "—" },
    { id: "sex", label: "Sexo", value: SEX_OPTIONS.find((o) => o.value === sex)?.label ?? "—" },
    { id: "birth", label: "Nascimento", value: birthDate ? formatBirthDate(birthDate) : "—" },
    { id: "measures", label: "Altura e peso", value: height && weight ? `${height} cm · ${weight} kg` : "—" },
    {
      id: "extras",
      label: "Gordura e peso desejado",
      value: [bodyFat && `${bodyFat}%`, targetWeight && `${targetWeight} kg`].filter(Boolean).join(" · ") || "Não informado",
    },
    { id: "activity", label: "Rotina", value: ACTIVITY_OPTIONS.find((o) => o.value === activity)?.label ?? "—" },
    { id: "schedule", label: "Acorda e dorme", value: `${wakeTime} – ${sleepTime}` },
    {
      id: "health",
      label: "Situação de saúde",
      value: healthRestriction === null ? "—" : healthRestriction ? "Sim" : "Nenhuma",
    },
  ];

  const body = (() => {
    switch (step) {
      case "goal":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              {GOAL_OPTIONS.map((o) => (
                <OptionCard
                  key={o.value}
                  selected={goal === o.value}
                  onClick={() => choose(() => setGoal(o.value), o.value !== "enfase")}
                  className="flex-col items-start gap-1.5 p-3.5"
                >
                  <Illustration name={GOAL_ART[o.value]} size={64} className="-mt-1 -ml-1" />
                  <span className="text-sm font-semibold text-foreground">{o.label}</span>
                  <span className="text-xs text-muted-foreground">{o.description}</span>
                </OptionCard>
              ))}
            </div>
            {goal === "enfase" && (
              <div className="flex flex-wrap gap-2">
                {ENFASE_GROUPS.map((group) => (
                  <button
                    key={group}
                    type="button"
                    aria-pressed={emphasis === group}
                    onClick={() => choose(() => setEmphasis(group))}
                    className={cn(
                      "rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95",
                      emphasis === group
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border/60 bg-card text-muted-foreground hover:bg-muted/40",
                    )}
                  >
                    {MUSCLE_GROUP_LABEL[group]}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case "days":
        return (
          <div className="grid grid-cols-5 gap-2">
            {DIAS_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={trainingDays === d}
                onClick={() => choose(() => setTrainingDays(d))}
                className={cn(
                  "tabular flex aspect-square flex-col items-center justify-center rounded-2xl border text-2xl font-bold transition-all active:scale-95",
                  trainingDays === d
                    ? "border-primary/60 bg-primary/10 text-primary ring-1 ring-primary/40"
                    : "border-border/60 bg-card text-foreground hover:bg-muted/40",
                )}
              >
                {d}
                <span className="text-[10px] font-medium text-muted-foreground">dias</span>
              </button>
            ))}
          </div>
        );

      case "sex":
        return (
          <div className="grid gap-2.5">
            {SEX_OPTIONS.map((o) => (
              <OptionCard key={o.value} selected={sex === o.value} onClick={() => choose(() => setSex(o.value))}>
                <span className="flex-1 text-base font-semibold text-foreground">{o.label}</span>
                {sex === o.value && <Check className="h-5 w-5 text-primary" />}
              </OptionCard>
            ))}
          </div>
        );

      case "birth":
        return (
          <Input
            type="date"
            aria-label="Data de nascimento"
            value={birthDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setBirthDate(e.target.value)}
            className="h-16 text-center text-xl font-semibold md:text-xl"
          />
        );

      case "measures":
        return (
          <div className="grid grid-cols-2 gap-3">
            <NumberField id="height" label="Altura" unit="cm" value={height} onChange={setHeight} placeholder="172" autoFocus />
            <NumberField id="weight" label="Peso" unit="kg" value={weight} onChange={setWeight} placeholder="74,5" />
          </div>
        );

      case "extras":
        return (
          <div className="grid grid-cols-2 gap-3">
            <NumberField id="bodyFat" label="% de gordura" unit="%" value={bodyFat} onChange={setBodyFat} placeholder="18" />
            <NumberField
              id="targetWeight"
              label="Peso desejado"
              unit="kg"
              value={targetWeight}
              onChange={setTargetWeight}
              placeholder="70"
            />
          </div>
        );

      case "activity":
        return (
          <div className="grid gap-2.5">
            {ACTIVITY_OPTIONS.map((o) => (
              <OptionCard key={o.value} selected={activity === o.value} onClick={() => choose(() => setActivity(o.value))}>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-foreground">{o.label}</p>
                  <p className="text-sm text-muted-foreground">{o.description}</p>
                </div>
                {activity === o.value && <Check className="h-5 w-5 shrink-0 text-primary" />}
              </OptionCard>
            ))}
          </div>
        );

      case "schedule":
        return (
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "wakeTime", label: "Acordo às", value: wakeTime, set: setWakeTime },
              { id: "sleepTime", label: "Durmo às", value: sleepTime, set: setSleepTime },
            ].map((f) => (
              <div key={f.id}>
                <label htmlFor={f.id} className="mb-2 block text-sm font-medium text-muted-foreground">
                  {f.label}
                </label>
                <Input
                  id={f.id}
                  type="time"
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  className="tabular h-16 text-center text-2xl font-bold md:text-2xl"
                />
              </div>
            ))}
          </div>
        );

      case "health":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <OptionCard
                selected={healthRestriction === false}
                onClick={() => choose(() => setHealthRestriction(false))}
                className="justify-center py-5"
              >
                <span className="text-base font-semibold text-foreground">Não</span>
              </OptionCard>
              <OptionCard
                selected={healthRestriction === true}
                onClick={() => choose(() => setHealthRestriction(true))}
                className="justify-center py-5"
              >
                <span className="text-base font-semibold text-foreground">Sim</span>
              </OptionCard>
            </div>
            {healthRestriction && (
              <p className="text-sm text-muted-foreground">
                Tudo bem. Vamos manter suas calorias em manutenção, sem déficit — ajuste o plano com seu nutricionista ou
                médico.
              </p>
            )}
          </div>
        );

      case "review":
        return (
          <div className="space-y-4">
            <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
              {reviewRows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => editFromReview(row.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-muted-foreground">{row.label}</span>
                      <span className="block truncate text-sm font-semibold text-foreground">{row.value}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                  </button>
                </li>
              ))}
            </ul>

            {needsConsent && (
              <label className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 text-sm">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
                />
                <span className="text-foreground/90">
                  Autorizo o Treinai a usar meus dados de corpo e saúde para calcular meu plano. Posso apagá-los quando
                  quiser, no Perfil.
                </span>
              </label>
            )}
          </div>
        );
    }
  })();

  // Escolhas únicas avançam sozinhas; as demais etapas precisam do botão
  const autoAdvances = step === "days" || step === "sex" || step === "activity" || step === "health" || (step === "goal" && goal !== "enfase");
  const showContinue = !isReview && (!autoAdvances || returnToReview || validate(step) === null);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const question = QUESTION[step];
  const offset = reduceMotion ? 0 : 40;

  const quiz = (
    <div className="flex flex-col">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          disabled={stepIndex === 0 || pending}
          aria-label="Pergunta anterior"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:invisible"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={stepIndex + 1}
          aria-label={`Pergunta ${stepIndex + 1} de ${STEPS.length}`}
        >
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: reduceMotion ? 0 : 0.35, ease: "easeOut" }}
          />
        </div>
        <span className="tabular w-10 shrink-0 text-right text-xs text-muted-foreground">
          {stepIndex + 1}/{STEPS.length}
        </span>
      </div>

      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          initial={{ opacity: 0, x: direction * offset }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -offset }}
          transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: "easeOut" }}
        >
          <div className="mb-5 flex items-start gap-3">
            <Image
              src="/ai-coach-avatar.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-full ring-1 ring-primary/30"
            />
            <div className="min-w-0">
              <h2 className="text-xl leading-snug font-bold text-foreground">{question.title}</h2>
              {question.hint && <p className="mt-1 text-sm text-muted-foreground">{question.hint}</p>}
            </div>
          </div>

          {body}
        </motion.div>
      </AnimatePresence>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {saved && mode === "edit" && !pending && (
        <p role="status" className="mt-4 text-sm text-primary">
          Plano recalculado.
        </p>
      )}

      <div className="mt-6 space-y-2">
        {isReview ? (
          <Button
            type="button"
            size="lg"
            className="h-12 w-full gap-2 text-base font-semibold"
            disabled={pending}
            onClick={handleSubmit}
          >
            {pending
              ? "Calculando…"
              : mode === "onboarding"
                ? "Calcular meu plano"
                : hasInitial
                  ? "Salvar e recalcular"
                  : "Calcular meu plano"}
            {!pending && <ArrowRight className="h-4 w-4" />}
          </Button>
        ) : (
          showContinue && (
            <Button type="button" size="lg" className="h-12 w-full gap-2 text-base font-semibold" onClick={next}>
              {returnToReview ? "Confirmar" : step === "extras" && !bodyFat && !targetWeight ? "Pular" : "Continuar"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )
        )}
      </div>
    </div>
  );

  if (mode === "edit") return quiz;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-4 py-8 sm:max-w-lg">
      <p className="mb-4 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Vamos montar seu plano
      </p>
      {quiz}
    </div>
  );
}
