"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Droplet, Moon } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";
import { cn } from "@/lib/utils";

/*
 * Selos de vidro que flutuam sobre a foto de capa (abertura do diagnóstico e hero da landing).
 * Números de exemplo do que o app acompanha. Entram em sequência e depois sobem e descem
 * devagar (.hero-float em globals.css); com "reduzir movimento", ficam parados.
 */

const EASE = [0.22, 1, 0.36, 1] as const;
const GLASS = "hero-float flex items-center gap-2.5 rounded-2xl border border-white/10 bg-black/45 py-2 pr-3.5 pl-2 backdrop-blur-md";

const STATS = [
  { key: "sono", icon: Moon, label: "Sono", value: "7h 32min", className: "top-[22%] left-4", float: 0 },
  { key: "agua", icon: Droplet, label: "Água", value: "2,1 L", className: "top-[44%] right-4", float: 1.2 },
] as const;

export function HeroStats({ delay = 0.25, ringClassName = "top-[64%] left-10" }: { delay?: number; ringClassName?: string }) {
  const reduceMotion = useReducedMotion();
  const enter = (i: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 12, scale: 0.92 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { delay: delay + i * 0.15, duration: 0.5, ease: EASE },
  });

  return (
    <>
      {STATS.map((s, i) => (
        <motion.div key={s.key} {...enter(i)} className={cn("absolute", s.className)}>
          <div className={GLASS} style={{ animationDelay: `${-s.float}s` }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <s.icon className="h-4.5 w-4.5" />
            </span>
            <span className="leading-tight">
              <span className="block text-[11px] text-white/70">{s.label}</span>
              <span className="block text-base font-bold text-white">{s.value}</span>
            </span>
          </div>
        </motion.div>
      ))}

      <motion.div {...enter(2)} className={cn("absolute", ringClassName)}>
        <div className={GLASS} style={{ animationDelay: "-2.4s" }}>
          <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90" aria-hidden>
            <circle cx="18" cy="18" r="14" fill="none" strokeWidth="4" className="stroke-white/15" />
            <motion.circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              className="stroke-primary"
              initial={{ pathLength: reduceMotion ? 0.72 : 0 }}
              animate={{ pathLength: 0.72 }}
              transition={{ delay: delay + 0.45, duration: reduceMotion ? 0 : 1.2, ease: [0.33, 1, 0.68, 1] }}
            />
          </svg>
          <span className="leading-tight">
            <span className="block text-base font-bold text-white">
              <CountUp to={72} suffix="%" />
            </span>
            <span className="block text-[11px] text-white/70">da meta</span>
          </span>
        </div>
      </motion.div>
    </>
  );
}
