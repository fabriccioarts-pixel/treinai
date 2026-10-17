"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
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

const GOAL_ART: Record<Goal, IllustrationName> = {
  hipertrofia: "hypertrophy",
  emagrecimento: "fat-loss",
  "ganho-massa": "mass-gain",
  enfase: "focus",
};

const ENFASE_GROUPS: MuscleGroup[] = ["peito", "costas", "pernas", "ombros", "biceps", "triceps"];
const DIAS_OPTIONS = [2, 3, 4, 5, 6];

/** Aceita "72,5" ou "72.5"; vazio vira null */
function parseNumber(value: string): number | null {
  const n = Number(value.trim().replace(",", "."));
  return value.trim() === "" || Number.isNaN(n) ? null : n;
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2.5 block text-xs font-semibold tracking-wide text-muted-foreground uppercase"
    >
      {children}
    </label>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-2 text-sm font-medium transition-all",
        selected
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border/60 bg-card text-muted-foreground hover:bg-muted/40",
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
  optional,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  optional?: boolean;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>
        {label}
        {optional && <span className="ml-1 font-normal normal-case tracking-normal">(opcional)</span>}
      </FieldLabel>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 pr-10 text-base"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
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
  const [step, setStep] = useState<1 | 2>(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [goal, setGoal] = useState<Goal | null>(initial?.goal ?? null);
  const [emphasis, setEmphasis] = useState<string | null>(initial?.emphasis ?? null);
  const [trainingDays, setTrainingDays] = useState<number | null>(initial?.trainingDays ?? null);
  const [sex, setSex] = useState<Sex | null>(initial?.sex ?? null);
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? "");
  const [height, setHeight] = useState(initial?.heightCm ? String(initial.heightCm) : "");
  const [weight, setWeight] = useState(initial?.weightKg ? String(initial.weightKg).replace(".", ",") : "");
  const [bodyFat, setBodyFat] = useState(initial?.bodyFatPct ? String(initial.bodyFatPct).replace(".", ",") : "");
  const [targetWeight, setTargetWeight] = useState(
    initial?.targetWeightKg ? String(initial.targetWeightKg).replace(".", ",") : "",
  );
  const [activity, setActivity] = useState<ActivityLevel | null>(initial?.activityLevel ?? null);
  const [wakeTime, setWakeTime] = useState(initial?.wakeTime ?? "07:00");
  const [sleepTime, setSleepTime] = useState(initial?.sleepTime ?? "23:00");
  const [healthRestriction, setHealthRestriction] = useState<boolean | null>(
    initial?.healthRestriction ?? null,
  );
  // Quem já tem perfil consentiu antes; quem preenche pela primeira vez (onboarding ou Perfil) precisa marcar
  const needsConsent = mode === "onboarding" || !initial;
  const [consent, setConsent] = useState(!needsConsent);

  const goalReady = !!goal && !!trainingDays && (goal !== "enfase" || !!emphasis);

  function handleSubmit() {
    setError(null);
    setSaved(false);
    const heightCm = parseNumber(height);
    const weightKg = parseNumber(weight);
    const bodyFatPct = parseNumber(bodyFat);
    const targetWeightKg = parseNumber(targetWeight);

    if (!goalReady) return setError("Escolha seu objetivo e quantos dias por semana você treina.");
    if (!sex) return setError("Escolha uma opção de sexo para o cálculo.");
    if (!birthDate) return setError("Informe sua data de nascimento.");
    if (!heightCm || heightCm < 120 || heightCm > 230) return setError("Informe sua altura em centímetros (ex.: 172).");
    if (!weightKg || weightKg < 30 || weightKg > 300) return setError("Informe seu peso em kg (ex.: 74,5).");
    if (bodyFatPct !== null && (bodyFatPct < 3 || bodyFatPct > 60)) {
      return setError("O % de gordura precisa ficar entre 3 e 60, ou deixe em branco.");
    }
    if (targetWeightKg !== null && (targetWeightKg < 30 || targetWeightKg > 300)) {
      return setError("Confira o peso desejado, ou deixe em branco.");
    }
    if (!activity) return setError("Conte como é sua rotina fora da academia.");
    if (healthRestriction === null) return setError("Responda a pergunta sobre saúde.");
    if (!consent) return setError("Marque a autorização para calcularmos seu plano.");

    const input = {
      goal: goal!,
      emphasis: goal === "enfase" ? emphasis : null,
      trainingDays: trainingDays!,
      sex,
      birthDate,
      heightCm,
      weightKg,
      bodyFatPct,
      targetWeightKg,
      activityLevel: activity,
      wakeTime,
      sleepTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo",
      healthRestriction,
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

  const goalSection = (
    <div className="space-y-6">
      <div>
        <FieldLabel>Qual seu objetivo principal?</FieldLabel>
        <div className="grid grid-cols-2 gap-2.5">
          {GOAL_OPTIONS.map((o) => {
            const selected = goal === o.value;
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setGoal(o.value)}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-2xl border p-3.5 text-left transition-all",
                  selected
                    ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30"
                    : "border-border/60 bg-card hover:bg-muted/40",
                )}
              >
                <Illustration name={GOAL_ART[o.value]} size={64} className="-mt-1 -ml-1" />
                <span className="text-sm font-semibold text-foreground">{o.label}</span>
                <span className="text-xs text-muted-foreground">{o.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {goal === "enfase" && (
        <div>
          <FieldLabel>Em qual grupo muscular?</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {ENFASE_GROUPS.map((group) => (
              <Chip key={group} selected={emphasis === group} onClick={() => setEmphasis(group)}>
                {MUSCLE_GROUP_LABEL[group]}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div>
        <FieldLabel>Quantos dias por semana você consegue treinar?</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {DIAS_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={trainingDays === d}
              onClick={() => setTrainingDays(d)}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border text-sm font-bold transition-all",
                trainingDays === d
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/60 bg-card text-muted-foreground hover:bg-muted/40",
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const bodySection = (
    <div className="space-y-6">
      <div>
        <FieldLabel>Sexo biológico</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {SEX_OPTIONS.map((o) => (
            <Chip key={o.value} selected={sex === o.value} onClick={() => setSex(o.value)}>
              {o.label}
            </Chip>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Usado só na fórmula do metabolismo. Sem essa informação, usamos uma média.
        </p>
      </div>

      <div>
        <FieldLabel htmlFor="birthDate">Data de nascimento</FieldLabel>
        <Input
          id="birthDate"
          type="date"
          value={birthDate}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setBirthDate(e.target.value)}
          className="h-11 text-base"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField id="height" label="Altura" unit="cm" value={height} onChange={setHeight} placeholder="172" />
        <NumberField id="weight" label="Peso" unit="kg" value={weight} onChange={setWeight} placeholder="74,5" />
        <NumberField
          id="bodyFat"
          label="% de gordura"
          unit="%"
          value={bodyFat}
          onChange={setBodyFat}
          placeholder="18"
          optional
        />
        <NumberField
          id="targetWeight"
          label="Peso desejado"
          unit="kg"
          value={targetWeight}
          onChange={setTargetWeight}
          optional
        />
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        Sabe seu % de gordura (bioimpedância, dobras)? Ele deixa o cálculo mais preciso.
      </p>
    </div>
  );

  const routineSection = (
    <div className="space-y-6">
      <div>
        <FieldLabel>Fora da academia, seu dia é…</FieldLabel>
        <div className="grid gap-2">
          {ACTIVITY_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={activity === o.value}
              onClick={() => setActivity(o.value)}
              className={cn(
                "flex flex-col rounded-xl border px-3.5 py-2.5 text-left transition-all",
                activity === o.value
                  ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30"
                  : "border-border/60 bg-card hover:bg-muted/40",
              )}
            >
              <span className="text-sm font-semibold text-foreground">{o.label}</span>
              <span className="text-xs text-muted-foreground">{o.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="wakeTime">Acordo às</FieldLabel>
          <Input
            id="wakeTime"
            type="time"
            value={wakeTime}
            onChange={(e) => setWakeTime(e.target.value)}
            className="h-11 text-base"
          />
        </div>
        <div>
          <FieldLabel htmlFor="sleepTime">Durmo às</FieldLabel>
          <Input
            id="sleepTime"
            type="time"
            value={sleepTime}
            onChange={(e) => setSleepTime(e.target.value)}
            className="h-11 text-base"
          />
        </div>
      </div>

      <div>
        <FieldLabel>Alguma destas situações vale para você?</FieldLabel>
        <p className="mb-2.5 text-sm text-foreground/90">
          Gestação ou amamentação, transtorno alimentar (atual ou passado) ou dieta com orientação médica.
        </p>
        <div className="flex gap-2">
          <Chip selected={healthRestriction === false} onClick={() => setHealthRestriction(false)}>
            Não
          </Chip>
          <Chip selected={healthRestriction === true} onClick={() => setHealthRestriction(true)}>
            Sim
          </Chip>
        </div>
        {healthRestriction && (
          <p className="mt-2 text-xs text-muted-foreground">
            Tudo bem. Vamos manter suas calorias em manutenção, sem déficit, e recomendamos ajustar o plano com seu
            nutricionista ou médico.
          </p>
        )}
      </div>

      {needsConsent && (
        <label className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3.5 text-sm">
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

  const feedback = (
    <>
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
    </>
  );

  if (mode === "edit") {
    return (
      <div className="space-y-8">
        {goalSection}
        {bodySection}
        {routineSection}
        {feedback}
        <Button
          type="button"
          size="lg"
          className="h-12 w-full text-base font-semibold"
          disabled={pending}
          onClick={handleSubmit}
        >
          {pending ? "Salvando…" : "Salvar e recalcular"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-4 py-8 sm:max-w-lg lg:max-w-2xl">
      <div className="mb-6 flex flex-col items-center text-center">
        <Image
          src="/ai-coach-avatar.png"
          alt="Théo"
          width={64}
          height={64}
          className="mb-3 h-16 w-16 rounded-full ring-2 ring-primary/30"
        />
        <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Etapa {step} de 2</p>
        <h1 className="text-xl font-bold text-foreground">
          {step === 1 ? "Vamos montar seu plano" : "Agora, sobre você"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === 1
            ? "Responda rapidinho e o Théo cria um treino sob medida pra você."
            : "Com isso o Théo calcula seu metabolismo, suas calorias e sua meta de água."}
        </p>
      </div>

      {step === 1 ? (
        goalSection
      ) : (
        <div className="space-y-8">
          {bodySection}
          {routineSection}
        </div>
      )}

      {feedback}

      <div className="mt-8 flex gap-2">
        {step === 2 && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 gap-2"
            disabled={pending}
            onClick={() => {
              setError(null);
              setStep(1);
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          className="h-12 flex-1 gap-2 text-base font-semibold"
          disabled={(step === 1 && !goalReady) || pending}
          onClick={() => {
            if (step === 1) {
              setStep(2);
              window.scrollTo({ top: 0 });
            } else {
              handleSubmit();
            }
          }}
        >
          {step === 1 ? "Continuar" : pending ? "Calculando…" : "Calcular meu plano"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
