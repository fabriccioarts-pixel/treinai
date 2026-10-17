"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft } from "lucide-react";
import { Illustration } from "@/components/ui/illustration";
import { cn } from "@/lib/utils";
import { EASE_OUT, PhoneFrame, useScenario, useVisible } from "./phone-sim";

/*
 * Simulação da execução do treino: o usuário digita a carga da 3ª série, marca como feita
 * e o app detecta o recorde na hora (aviso dourado descendo do topo).
 */

const DONE_SETS = [
  { weight: "100", reps: "8" },
  { weight: "110", reps: "8" },
];
const PR_WEIGHT = "120";
const PR_REPS = "6";

type Stage = "idle" | "typing-weight" | "typing-reps" | "checked" | "pr";
const ORDER: Stage[] = ["idle", "typing-weight", "typing-reps", "checked", "pr"];
const at = (stage: Stage, min: Stage) => ORDER.indexOf(stage) >= ORDER.indexOf(min);

export function PrDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useVisible(ref);
  // Estado inicial = cena final (recorde na tela), igual no servidor e no navegador
  const [stage, setStage] = useState<Stage>("pr");
  const [weight, setWeight] = useState(PR_WEIGHT);
  const [reps, setReps] = useState(PR_REPS);

  useScenario(visible, async (sleep) => {
    setStage("idle");
    setWeight("");
    setReps("");
    await sleep(1400);

    setStage("typing-weight");
    for (let i = 1; i <= PR_WEIGHT.length; i++) {
      setWeight(PR_WEIGHT.slice(0, i));
      await sleep(260);
    }
    await sleep(350);
    setStage("typing-reps");
    setReps(PR_REPS);
    await sleep(700);

    setStage("checked");
    await sleep(650);
    setStage("pr");
    await sleep(4300);
  });

  return (
    <PhoneFrame ref={ref}>
      <div className="relative flex flex-1 flex-col">
        {/* Aviso de recorde descendo do topo */}
        <AnimatePresence>
          {stage === "pr" && (
            <motion.div
              key="pr"
              initial={{ opacity: 0, y: -24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
              className="absolute inset-x-3 top-3 z-10 flex items-center gap-3 rounded-2xl border border-gold/40 bg-card p-3 shadow-[0_18px_40px_-18px_var(--gold)]"
            >
              <Illustration name="pr" size={48} className="-my-2" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-wider text-gold uppercase">Novo recorde!</p>
                <p className="tabular truncate text-sm font-semibold text-foreground">
                  Agachamento · {PR_WEIGHT} kg × {PR_REPS}
                </p>
                <p className="tabular text-[11px] text-muted-foreground">+10 kg desde o último recorde</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cabeçalho do treino em andamento */}
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-3">
          <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">Treino C — Pernas</p>
            <p className="text-[11px] text-muted-foreground">Exercício 1 de 6</p>
          </div>
          <span className="tabular rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            12:48
          </span>
        </div>

        <div className="flex flex-1 flex-col px-4 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Illustration name="legs" size={64} className="-my-2 -ml-1" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-primary">Pernas</p>
              <p className="text-xl leading-tight font-bold text-foreground">Agachamento livre</p>
              <p className="text-[11px] text-muted-foreground">Meta: 4 séries · 6–8 reps</p>
            </div>
          </div>

          {/* Tabela de séries */}
          <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="grid grid-cols-[2.5rem_1fr_1fr_2.75rem] gap-2 border-b border-border/60 px-3 py-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              <span>Série</span>
              <span>Carga</span>
              <span>Reps</span>
              <span />
            </div>
            {DONE_SETS.map((s, i) => (
              <div
                key={i}
                className="grid grid-cols-[2.5rem_1fr_1fr_2.75rem] items-center gap-2 border-b border-border/40 px-3 py-2.5 text-sm"
              >
                <span className="tabular font-semibold text-muted-foreground">{i + 1}</span>
                <span className="tabular text-foreground">{s.weight} kg</span>
                <span className="tabular text-foreground">{s.reps}</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Check className="h-4 w-4" />
                </span>
              </div>
            ))}

            {/* 3ª série: a que vira recorde */}
            <div
              className={cn(
                "grid grid-cols-[2.5rem_1fr_1fr_2.75rem] items-center gap-2 px-3 py-2.5 text-sm transition-colors duration-500",
                at(stage, "checked") ? "bg-gold/8" : "bg-primary/5",
              )}
            >
              <span className={cn("tabular font-semibold", at(stage, "checked") ? "text-gold" : "text-foreground")}>
                3
              </span>
              <span
                className={cn(
                  "tabular flex h-8 items-center rounded-lg border px-2",
                  stage === "typing-weight" ? "border-primary/60 bg-background" : "border-border bg-background/60",
                )}
              >
                {weight ? `${weight} kg` : <span className="text-muted-foreground/50">kg</span>}
                {stage === "typing-weight" && (
                  <span className="ml-px inline-block h-3.5 w-px animate-pulse bg-primary align-middle" />
                )}
              </span>
              <span
                className={cn(
                  "tabular flex h-8 items-center rounded-lg border px-2",
                  stage === "typing-reps" ? "border-primary/60 bg-background" : "border-border bg-background/60",
                )}
              >
                {reps || <span className="text-muted-foreground/50">reps</span>}
              </span>
              <motion.span
                animate={at(stage, "checked") ? { scale: [1, 0.82, 1] } : { scale: 1 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-300",
                  at(stage, "checked") ? "bg-gold text-gold-foreground" : "border border-border text-muted-foreground",
                )}
              >
                <Check className="h-4 w-4" />
              </motion.span>
            </div>

            <div className="grid grid-cols-[2.5rem_1fr_1fr_2.75rem] items-center gap-2 border-t border-border/40 px-3 py-2.5 text-sm text-muted-foreground/60">
              <span className="tabular font-semibold">4</span>
              <span>—</span>
              <span>—</span>
              <span />
            </div>
          </div>

          <div className="mt-auto rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-center text-xs text-muted-foreground">
            Descanso <span className="tabular font-semibold text-foreground">1:30</span> após marcar a série
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
