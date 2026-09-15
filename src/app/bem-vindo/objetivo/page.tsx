"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Dumbbell, Flame, TrendingUp, Crosshair, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@/lib/types";

type Objetivo = "hipertrofia" | "emagrecimento" | "ganho-massa" | "enfase";

const OBJETIVOS: { value: Objetivo; label: string; description: string; icon: typeof Dumbbell }[] = [
  { value: "hipertrofia", label: "Hipertrofia", description: "Crescer massa muscular de forma geral", icon: Dumbbell },
  { value: "emagrecimento", label: "Emagrecimento", description: "Perder gordura e definir o corpo", icon: Flame },
  { value: "ganho-massa", label: "Ganho de massa", description: "Ganhar força e volume corporal", icon: TrendingUp },
  { value: "enfase", label: "Ênfase específica", description: "Focar mais em um grupo muscular", icon: Crosshair },
];

const ENFASE_GROUPS: MuscleGroup[] = ["peito", "costas", "pernas", "ombros", "biceps", "triceps"];
const DIAS_OPTIONS = [2, 3, 4, 5, 6];

export default function ObjetivoPage() {
  const router = useRouter();
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [enfase, setEnfase] = useState<MuscleGroup | null>(null);
  const [dias, setDias] = useState<number | null>(null);

  const canSubmit = objetivo && dias && (objetivo !== "enfase" || enfase);

  function handleSubmit() {
    if (!canSubmit) return;
    const params = new URLSearchParams({ objetivo, dias: String(dias) });
    if (objetivo === "enfase" && enfase) params.set("enfase", enfase);
    router.push(`/bem-vindo/conversa?${params.toString()}`);
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
        <h1 className="text-xl font-bold text-foreground">Vamos montar seu treino</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Responda rapidinho e o Théo cria um plano sob medida pra você.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <p className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Qual seu objetivo principal?
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {OBJETIVOS.map((o) => {
              const selected = objetivo === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setObjetivo(o.value)}
                  className={`flex flex-col items-start gap-1.5 rounded-2xl border p-3.5 text-left transition-all ${
                    selected
                      ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30"
                      : "border-border/60 bg-card hover:bg-muted/40"
                  }`}
                >
                  <o.icon className={`h-5 w-5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm font-semibold text-foreground">{o.label}</span>
                  <span className="text-xs text-muted-foreground">{o.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {objetivo === "enfase" && (
          <div>
            <p className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Em qual grupo muscular?
            </p>
            <div className="flex flex-wrap gap-2">
              {ENFASE_GROUPS.map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setEnfase(group)}
                  className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-all ${
                    enfase === group
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border/60 bg-card text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  {MUSCLE_GROUP_LABEL[group]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Quantos dias por semana você consegue treinar?
          </p>
          <div className="flex flex-wrap gap-2">
            {DIAS_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDias(d)}
                className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-bold transition-all ${
                  dias === d
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/60 bg-card text-muted-foreground hover:bg-muted/40"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button
        type="button"
        size="lg"
        className="mt-8 h-12 w-full gap-2 text-base font-semibold"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        Gerar meu treino
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
