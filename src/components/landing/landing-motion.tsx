"use client";

import type { ReactNode } from "react";
import { motion, MotionConfig, useReducedMotion, type Variants } from "framer-motion";
import { EASE_OUT } from "./phone-sim";

/*
 * Entradas da landing page (textos, listas e o balão do hero). As simulações em celular
 * têm o próprio roteiro em phone-sim; aqui ficam só as aparições ao rolar a página.
 */

const VIEWPORT = { once: true, margin: "0px 0px -12% 0px" } as const;

/** Respeita "reduzir movimento" do sistema: mantém só os fades, sem deslocamentos. */
export function LandingMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Sobe e aparece quando entra na tela. */
export function Reveal({
  as = "div",
  children,
  className,
  delay = 0,
  y = 24,
  immediate = false,
}: {
  /** "span" para usar dentro de títulos e parágrafos. */
  as?: "div" | "span";
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  /** Anima no carregamento (hero) em vez de esperar o scroll. */
  immediate?: boolean;
}) {
  const Comp = motion[as];
  const target = { opacity: 1, y: 0 };
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      {...(immediate ? { animate: target } : { whileInView: target, viewport: VIEWPORT })}
      transition={{ duration: 0.7, delay, ease: EASE_OUT }}
    >
      {children}
    </Comp>
  );
}

const staggerParent: Variants = {
  hidden: {},
  show: (stagger: number) => ({ transition: { staggerChildren: stagger } }),
};

const staggerChild: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE_OUT } },
};

/** Lista cujos itens entram um depois do outro. Use com <StaggerItem>. */
export function Stagger({
  as = "div",
  children,
  className,
  stagger = 0.08,
  immediate = false,
  delay = 0,
}: {
  as?: "div" | "ul" | "ol";
  children: ReactNode;
  className?: string;
  stagger?: number;
  immediate?: boolean;
  delay?: number;
}) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      variants={staggerParent}
      custom={stagger}
      initial="hidden"
      {...(immediate ? { animate: "show" } : { whileInView: "show", viewport: VIEWPORT })}
      transition={{ delayChildren: delay }}
    >
      {children}
    </Comp>
  );
}

export function StaggerItem({
  as = "div",
  children,
  className,
}: {
  as?: "div" | "li";
  children: ReactNode;
  className?: string;
}) {
  const Comp = motion[as];
  return (
    <Comp className={className} variants={staggerChild}>
      {children}
    </Comp>
  );
}

/** Balão de fala do Théo: aparece depois do hero e fica flutuando de leve. */
export function FloatingBubble({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: 1.1, ease: EASE_OUT }}
      style={{ transformOrigin: "bottom left" }}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 5, delay: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
