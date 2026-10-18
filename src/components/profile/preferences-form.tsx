"use client";

import { useId } from "react";
import { Card } from "@/components/ui/card";
import { savePreferences, usePreferences, WEIGHT_STEPS, type Preferences } from "@/lib/preferences";
import { cn } from "@/lib/utils";

function formatStep(step: number) {
  return `${step.toLocaleString("pt-BR")} kg`;
}

function Switch({
  checked,
  onChange,
  labelledBy,
  describedBy,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  labelledBy: string;
  describedBy: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        checked ? "bg-primary" : "bg-muted ring-1 ring-border ring-inset",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block h-5 w-5 rounded-full shadow-sm transition-transform",
          checked ? "translate-x-6 bg-primary-foreground" : "translate-x-1 bg-muted-foreground",
        )}
      />
    </button>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  const id = useId();
  return (
    // A linha inteira é clicável; o switch continua sendo o controle anunciado
    <div className="flex cursor-pointer items-center gap-4 px-4 py-3.5" onClick={() => onChange(!checked)}>
      <div className="min-w-0 flex-1">
        <p id={`${id}-t`} className="text-sm font-medium text-foreground">
          {title}
        </p>
        <p id={`${id}-d`} className="mt-0.5 text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <span onClick={(e) => e.stopPropagation()}>
        <Switch checked={checked} onChange={onChange} labelledBy={`${id}-t`} describedBy={`${id}-d`} />
      </span>
    </div>
  );
}

export function PreferencesForm() {
  const prefs = usePreferences();
  const set = (patch: Partial<Preferences>) => savePreferences(patch);
  const stepLabelId = useId();

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">Durante o treino</h2>
        <Card className="divide-y divide-border/50 p-0">
          <div className="px-4 py-3.5">
            <p id={stepLabelId} className="text-sm font-medium text-foreground">
              Incremento de carga
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">Quanto o + e o − somam na carga de cada série.</p>
            <div role="radiogroup" aria-labelledby={stepLabelId} className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
              {WEIGHT_STEPS.map((step) => {
                const active = prefs.weightStep === step;
                return (
                  <button
                    key={step}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => set({ weightStep: step })}
                    className={cn(
                      "tabular h-10 rounded-lg text-sm font-semibold transition-colors",
                      active ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {formatStep(step)}
                  </button>
                );
              })}
            </div>
          </div>

          <ToggleRow
            title="Som no fim do descanso"
            description="Dois bipes curtos quando o timer zera."
            checked={prefs.restSound}
            onChange={(restSound) => set({ restSound })}
          />
          <ToggleRow
            title="Vibração no fim do descanso"
            description="Funciona em celulares Android; o iPhone não permite vibrar pelo navegador."
            checked={prefs.restVibration}
            onChange={(restVibration) => set({ restVibration })}
          />
          <ToggleRow
            title="Manter a tela acesa"
            description="A tela não apaga enquanto um treino está aberto. Gasta um pouco mais de bateria."
            checked={prefs.keepScreenOn}
            onChange={(keepScreenOn) => set({ keepScreenOn })}
          />
        </Card>
      </section>

      <p className="px-1 text-sm text-muted-foreground">
        As preferências ficam salvas neste aparelho. Em outro celular ou navegador, ajuste de novo.
      </p>
    </div>
  );
}
