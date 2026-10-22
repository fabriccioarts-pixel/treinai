"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Play } from "lucide-react";
import { Illustration } from "@/components/ui/illustration";
import { cn } from "@/lib/utils";
import { EASE_OUT, PhoneFrame, useScenario, useVisible } from "./phone-sim";

/*
 * Simulação da constância na tela inicial: o contador sobe 1 → 3 → 7 → 14 → 30 dias,
 * as bolinhas da semana acendem e o Théo evolui de expressão até ficar lendário.
 */

const STAGES = [
  { days: 1, img: "starting", phrase: "Dia 1. Amanhã tem mais." },
  { days: 3, img: "warming", phrase: "Três dias firmes. Não para agora." },
  { days: 7, img: "on-fire", phrase: "Uma semana cheia. Está pegando." },
  { days: 14, img: "beast", phrase: "Duas semanas. Virou rotina." },
  { days: 30, img: "legendary", phrase: "Um mês de constância. Isso é disciplina." },
];
const WEEK = ["S", "T", "Q", "Q", "S", "S", "D"];
const LAST = STAGES.length - 1;

export function StreakDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useVisible(ref);
  // Estado inicial = cena final (lendário), igual no servidor e no navegador
  const [stageIdx, setStageIdx] = useState(LAST);
  const [count, setCount] = useState(STAGES[LAST].days);

  useScenario(visible, async (sleep) => {
    setStageIdx(0);
    setCount(1);
    await sleep(1600);
    for (let s = 1; s <= LAST; s++) {
      setStageIdx(s);
      // Contador sobe até o próximo marco
      const from = STAGES[s - 1].days;
      const to = STAGES[s].days;
      const steps = Math.min(12, to - from);
      for (let i = 1; i <= steps; i++) {
        setCount(Math.round(from + ((to - from) * i) / steps));
        await sleep(55);
      }
      await sleep(s === LAST ? 4200 : 1500);
    }
  });

  const stage = STAGES[stageIdx];
  const gold = stageIdx === LAST;
  const litDays = Math.min(7, count);

  return (
    <PhoneFrame ref={ref}>
      <div className="flex flex-1 flex-col gap-3 px-4 pt-5 pb-4">
        <div>
          <p className="text-lg font-bold tracking-tight text-foreground">Boa noite, Ana</p>
          {/* Hoje = domingo, a última bolinha da semana (D) */}
          <p className="text-xs text-muted-foreground">Domingo, 18 de outubro</p>
        </div>

        {/* Card de constância, como na home do app */}
        <div
          className={cn(
            "overflow-hidden rounded-2xl border bg-card transition-[border-color,box-shadow] duration-700",
            gold ? "border-gold/45 shadow-[0_0_40px_-14px_var(--gold)]" : "border-border",
          )}
        >
          <div className="relative mx-auto h-48 w-48">
            <AnimatePresence initial={false}>
              <motion.div
                key={stage.img}
                initial={{ opacity: 0, scale: 0.94, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.45, ease: EASE_OUT }}
                className="absolute inset-0"
              >
                <Image
                  src={`/theo/${stage.img}.jpg`}
                  alt=""
                  width={192}
                  height={192}
                  className="h-full w-full mix-blend-screen"
                  style={{
                    maskImage: "linear-gradient(to bottom, black 72%, transparent)",
                    WebkitMaskImage: "linear-gradient(to bottom, black 72%, transparent)",
                  }}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="px-4 pb-4">
            <p className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  "tabular text-4xl leading-none font-bold tracking-[-0.04em] transition-colors duration-500",
                  gold ? "text-gold" : "text-foreground",
                )}
              >
                {count}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">
                {count === 1 ? "dia de constância" : "dias de constância"}
              </span>
            </p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={stage.phrase}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="mt-1.5 text-sm leading-snug text-foreground/90"
              >
                {stage.phrase}
              </motion.p>
            </AnimatePresence>

            <ol className="mt-3 flex gap-2">
              {WEEK.map((d, i) => {
                // Acende da direita (hoje) para a esquerda conforme a constância cresce
                const lit = i >= WEEK.length - litDays;
                return (
                  <li key={i} className="flex flex-col items-center gap-1">
                    <motion.span
                      animate={{ scale: lit ? 1 : 0.85 }}
                      transition={{ duration: 0.3, ease: EASE_OUT }}
                      className={cn(
                        "block h-3 w-3 rounded-full transition-colors duration-300",
                        lit
                          ? gold
                            ? "bg-gold shadow-[0_2px_8px_-2px_var(--gold)]"
                            : "bg-primary shadow-[0_2px_8px_-2px_var(--primary)]"
                          : "bg-muted",
                      )}
                    />
                    <span
                      className={cn(
                        "text-[10px] leading-none",
                        i === WEEK.length - 1 ? "font-semibold text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {d}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* Treino de hoje, para a tela parecer a home real */}
        <div className="mt-auto flex items-center gap-3 rounded-2xl border border-primary/25 bg-card p-3">
          <Illustration name="legs" size={44} className="-my-2" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">Treino C — Pernas</p>
            <p className="text-[11px] text-muted-foreground">6 exercícios · 45–60 min</p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Play className="h-4 w-4 fill-current" />
          </span>
        </div>
      </div>
    </PhoneFrame>
  );
}
