"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Check, Droplet, Loader2 } from "lucide-react";
import { Illustration } from "@/components/ui/illustration";
import { cn } from "@/lib/utils";
import { EASE_OUT, PhoneFrame, useScenario, useVisible } from "./phone-sim";

/*
 * Simulação do registro de refeição na home: toque em "Foto do prato", a folha sobe com a
 * análise do Théo, os alimentos aparecem um a um e, ao salvar, as calorias e a água do dia
 * sobem. Espelha o fluxo real de MealLogger + NutritionToday.
 */

const TARGET_KCAL = 2200;
const START_KCAL = 340;
const MEAL_KCAL = 612;
const TARGET_WATER_ML = 2000;
const START_WATER_ML = 750;
const WATER_STEP_ML = 500;

const ITEMS = [
  { name: "Arroz branco", grams: "150g", kcal: 195 },
  { name: "Feijão carioca", grams: "100g", kcal: 76 },
  { name: "Frango grelhado", grams: "150g", kcal: 247 },
  { name: "Salada verde", grams: "80g", kcal: 94 },
];

type Stage = "home" | "camera" | "analyzing" | "review" | "saving" | "saved";
const ORDER: Stage[] = ["home", "camera", "analyzing", "review", "saving", "saved"];
const at = (stage: Stage, min: Stage) => ORDER.indexOf(stage) >= ORDER.indexOf(min);

export function NutritionDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useVisible(ref);
  // Estado inicial = cena final (refeição e água já registradas), igual no servidor e no navegador
  const [stage, setStage] = useState<Stage>("saved");
  const [visibleItems, setVisibleItems] = useState(ITEMS.length);
  const [water, setWater] = useState(START_WATER_ML + WATER_STEP_ML);

  const kcalDone = at(stage, "saving") || stage === "saved" ? START_KCAL + MEAL_KCAL : START_KCAL;
  const kcal = stage === "home" || stage === "camera" || stage === "analyzing" || stage === "review" ? START_KCAL : kcalDone;
  const kcalPct = Math.min(100, (kcal / TARGET_KCAL) * 100);
  const waterPct = Math.min(100, (water / TARGET_WATER_ML) * 100);

  useScenario(visible, async (sleep) => {
    setStage("home");
    setVisibleItems(0);
    setWater(START_WATER_ML);
    await sleep(1500);

    setStage("camera");
    await sleep(900);

    setStage("analyzing");
    await sleep(1400);

    setStage("review");
    for (let i = 1; i <= ITEMS.length; i++) {
      setVisibleItems(i);
      await sleep(320);
    }
    await sleep(1100);

    setStage("saving");
    await sleep(550);

    setStage("saved");
    await sleep(900);
    setWater(START_WATER_ML + WATER_STEP_ML);
    await sleep(4200);
  });

  const reviewTotal = ITEMS.slice(0, visibleItems).reduce((sum, i) => sum + i.kcal, 0);

  return (
    <PhoneFrame ref={ref}>
      <div className="relative flex flex-1 flex-col px-4 pt-5 pb-4">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Registro de hoje</p>

        {/* Card de calorias, como na home do app */}
        <div className="mt-2 rounded-2xl border border-border bg-card p-4 shadow-[inset_0_1px_0_oklch(1_0_0/0.05)]">
          <div className="flex items-baseline justify-between gap-3">
            <p className="tabular flex items-baseline gap-1">
              <motion.span
                key={kcal}
                initial={{ opacity: 0.4, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
                className="text-2xl font-bold tracking-tight text-foreground"
              >
                {kcal.toLocaleString("pt-BR")}
              </motion.span>
              <span className="text-sm font-medium text-muted-foreground">/ {TARGET_KCAL.toLocaleString("pt-BR")} kcal</span>
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: `${kcalPct}%` }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
            />
          </div>

          <button
            type="button"
            className={cn(
              "mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors duration-300",
              stage === "camera" ? "bg-primary/80 text-primary-foreground" : "bg-primary text-primary-foreground",
            )}
          >
            <Camera className="h-4 w-4" />
            Foto do prato
          </button>
        </div>

        {/* Água, como na home do app */}
        <div className="relative mt-3 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-[inset_0_1px_0_oklch(1_0_0/0.05)]">
          <Illustration
            name="water"
            size={72}
            className="pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 opacity-80"
          />
          <div className="relative flex items-center gap-3">
            <div className="relative h-14 w-14 shrink-0">
              <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90" aria-hidden>
                <circle cx="28" cy="28" r="23" fill="none" strokeWidth="6" className="stroke-muted" />
                <circle
                  cx="28"
                  cy="28"
                  r="23"
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  stroke="var(--chart-4)"
                  strokeDasharray={2 * Math.PI * 23}
                  strokeDashoffset={2 * Math.PI * 23 * (1 - waterPct / 100)}
                  style={{ transition: "stroke-dashoffset 500ms" }}
                />
              </svg>
              <Droplet className="absolute inset-0 m-auto h-4 w-4 text-primary" fill="currentColor" aria-hidden />
            </div>
            <div className="min-w-0 pr-14">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Água hoje</p>
              <p className="tabular mt-0.5 text-base font-bold text-foreground">
                {(water / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L
              </p>
            </div>
          </div>
        </div>

        {/* Folha de registro, sobe do fundo como o Sheet real */}
        <AnimatePresence>
          {stage !== "home" && stage !== "saved" && (
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-border bg-background px-4 pt-4 pb-5 shadow-[0_-20px_50px_-20px_rgb(0_0_0/0.6)]"
            >
              <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" aria-hidden />

              {(stage === "camera" || stage === "analyzing") && (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="flex h-28 w-full items-center justify-center rounded-2xl border border-dashed border-primary/40 bg-primary/5">
                    <Camera className="h-7 w-7 text-primary/70" />
                  </div>
                  {stage === "analyzing" ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      O Théo está identificando os alimentos…
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Foto capturada</p>
                  )}
                </div>
              )}

              {at(stage, "review") && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">Confira a refeição</p>
                  <ul className="space-y-1.5">
                    {ITEMS.slice(0, visibleItems).map((item) => (
                      <motion.li
                        key={item.name}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: EASE_OUT }}
                        className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate pr-2 text-foreground">{item.name}</span>
                        <span className="tabular shrink-0 text-xs text-muted-foreground">
                          {item.grams} · {item.kcal} kcal
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={cn(
                      "tabular mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-300",
                      stage === "saving"
                        ? "scale-[0.97] bg-primary/80 text-primary-foreground"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    {stage === "saving" ? (
                      <>
                        <Check className="h-4 w-4" />
                        Salvo!
                      </>
                    ) : (
                      `Salvar · ${reviewTotal} kcal`
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PhoneFrame>
  );
}
