"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Send } from "lucide-react";
import { Illustration, type IllustrationName } from "@/components/ui/illustration";
import { cn } from "@/lib/utils";
import { EASE_OUT, PhoneFrame, useScenario, useVisible } from "./phone-sim";

/*
 * Simulação do chat com o Théo (landing page). Roteiro em loop: saudação com opções →
 * usuário digita e envia → "digitando…" → resposta do Théo → card do treino com os
 * exercícios entrando um a um.
 */

interface ChatScenario {
  greeting: string;
  options: string[];
  userText: string;
  reply: string;
  card: {
    label: string;
    title: string;
    items: { name: string; scheme: string; art: IllustrationName; replaced?: string }[];
  };
}

// Os roteiros ficam aqui (e não na página) porque a página é Server Component:
// só tipos simples atravessam essa fronteira como props.
const SCENARIOS: Record<"build" | "adapt", ChatScenario> = {
  build: {
    greeting: "E aí, monstro! Qual o foco hoje? Me fala que eu monto o treino.",
    options: ["Hipertrofia", "Emagrecimento", "Ganho de massa"],
    userText: "Monta um treino de costas e bíceps pra mim",
    reply: "Fechado, monstro! Montei um treino focado em largura e densidade. Bora pegar o ferro 💪",
    card: {
      label: "Treino criado",
      title: "Costas e Bíceps",
      items: [
        { name: "Puxada frontal", scheme: "4 × 10–12", art: "back" },
        { name: "Remada curvada", scheme: "4 × 8–10", art: "back" },
        { name: "Remada unilateral", scheme: "3 × 10–12", art: "back" },
        { name: "Rosca direta", scheme: "3 × 10–12", art: "arms" },
        { name: "Rosca martelo", scheme: "3 × 12", art: "arms" },
      ],
    },
  },
  adapt: {
    greeting: "Bora treinar? Me conta como você tá hoje.",
    options: ["Tô 100%", "Tô cansado", "Sinto dor"],
    userText: "Sinto dor no ombro, dá pra trocar o supino?",
    reply:
      "Bora adaptar, parceiro. Troquei o supino pelo crucifixo na máquina: menos estresse no ombro, mesmo estímulo no peito. Se a dor continuar, procura um fisioterapeuta.",
    card: {
      label: "Treino atualizado",
      title: "Treino A — Peito e Tríceps",
      items: [
        { name: "Crucifixo na máquina", scheme: "4 × 10–12", art: "chest", replaced: "Supino reto" },
        { name: "Crossover na polia", scheme: "3 × 12", art: "chest" },
        { name: "Tríceps na polia", scheme: "3 × 12", art: "arms" },
        { name: "Tríceps francês", scheme: "3 × 10", art: "arms" },
      ],
    },
  },
};

type Stage = "greeting" | "typing" | "sent" | "thinking" | "reply" | "card";
const ORDER: Stage[] = ["greeting", "typing", "sent", "thinking", "reply", "card"];
const at = (stage: Stage, min: Stage) => ORDER.indexOf(stage) >= ORDER.indexOf(min);

const bubble = {
  initial: { opacity: 0, y: 14, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.35, ease: EASE_OUT },
};

export function TheoChatDemo({ variant = "build" }: { variant?: "build" | "adapt" }) {
  const sc = SCENARIOS[variant];
  const ref = useRef<HTMLDivElement>(null);
  const visible = useVisible(ref);
  // Estado inicial = cena final completa (igual no servidor e no navegador)
  const [stage, setStage] = useState<Stage>("card");
  const [typed, setTyped] = useState("");
  const [replyChars, setReplyChars] = useState(sc.reply.length);
  const [shownItems, setShownItems] = useState(sc.card.items.length);

  useScenario(visible, async (sleep) => {
    setStage("greeting");
    setTyped("");
    setReplyChars(0);
    setShownItems(0);
    await sleep(1900);

    setStage("typing");
    for (let i = 1; i <= sc.userText.length; i++) {
      setTyped(sc.userText.slice(0, i));
      await sleep(34 + Math.random() * 30);
    }
    await sleep(450);

    setStage("sent");
    setTyped("");
    await sleep(500);
    setStage("thinking");
    await sleep(1300);

    setStage("reply");
    for (let i = 1; i <= sc.reply.length; i += 2) {
      setReplyChars(i);
      await sleep(16);
    }
    setReplyChars(sc.reply.length);
    await sleep(450);

    setStage("card");
    for (let i = 1; i <= sc.card.items.length; i++) {
      await sleep(260);
      setShownItems(i);
    }
    await sleep(4200);
  });

  return (
    <PhoneFrame ref={ref}>
      {/* Cabeçalho como o da tela do Théo */}
      <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
        <div className="relative">
          <Illustration name="theo" size={36} className="-m-0.5" />
          <span className="absolute right-0 bottom-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Théo</p>
          <p className="text-[11px] text-muted-foreground">
            {stage === "thinking" ? "digitando…" : "Personal Trainer · online"}
          </p>
        </div>
      </div>

      {/* Conversa: mensagens novas entram por baixo e empurram as antigas */}
      <div
        className="flex min-h-0 flex-1 flex-col justify-end gap-2.5 overflow-hidden px-3 pb-3"
        style={{
          maskImage: "linear-gradient(to bottom, transparent, black 2.5rem)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 2.5rem)",
        }}
      >
        <AnimatePresence initial={false}>
          <motion.div key="greet" layout {...bubble} className="max-w-[85%] self-start">
            <p className="rounded-2xl rounded-tl-sm border border-border bg-secondary/50 px-3.5 py-2.5 text-sm text-foreground">
              {sc.greeting}
            </p>
            {!at(stage, "sent") && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sc.options.map((o) => (
                  <span
                    key={o}
                    className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                  >
                    {o}
                  </span>
                ))}
              </div>
            )}
          </motion.div>

          {at(stage, "sent") && (
            <motion.p
              key="user"
              layout
              {...bubble}
              className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              {sc.userText}
            </motion.p>
          )}

          {stage === "thinking" && (
            <motion.div
              key="dots"
              layout
              {...bubble}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="flex gap-1 self-start rounded-2xl rounded-tl-sm border border-border bg-secondary/50 px-3.5 py-3"
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-primary/70"
                  style={{ animation: `typing-dot 1.2s ease-in-out ${i * 0.15}s infinite` }}
                />
              ))}
            </motion.div>
          )}

          {at(stage, "reply") && (
            <motion.div key="reply" layout {...bubble} className="max-w-[92%] self-start">
              <p className="rounded-2xl rounded-tl-sm border border-border bg-secondary/50 px-3.5 py-2.5 text-sm text-foreground">
                {sc.reply.slice(0, replyChars)}
              </p>

              {at(stage, "card") && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE_OUT }}
                  className="mt-2 overflow-hidden rounded-xl border border-primary/30 bg-card"
                >
                  <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-bold tracking-wider text-primary uppercase">{sc.card.label}</p>
                      <p className="truncate text-xs font-semibold text-foreground">{sc.card.title}</p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground transition-shadow duration-500",
                        shownItems === sc.card.items.length && "shadow-[0_6px_16px_-6px_var(--primary)]",
                      )}
                    >
                      Ver treino
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                  <ul className="px-1.5 py-1">
                    {sc.card.items.slice(0, shownItems).map((ex) => (
                      <motion.li
                        key={ex.name}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, ease: EASE_OUT }}
                        className={cn("flex items-center gap-2 rounded-md px-1.5 py-0.5", ex.replaced && "bg-primary/8")}
                      >
                        <Illustration name={ex.art} size={28} className="-my-0.5" />
                        <span className="min-w-0 flex-1">
                          {ex.replaced && (
                            <span className="block truncate text-[10px] text-muted-foreground line-through">
                              {ex.replaced}
                            </span>
                          )}
                          <span
                            className={cn(
                              "block truncate text-xs text-foreground",
                              ex.replaced && "font-semibold text-primary",
                            )}
                          >
                            {ex.name}
                          </span>
                        </span>
                        <span className="tabular shrink-0 text-[11px] text-muted-foreground">{ex.scheme}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Campo de mensagem (o usuário "digita" aqui antes de enviar) */}
      <div className="flex items-center gap-2 border-t border-border/60 p-2.5">
        <div className="flex h-10 min-w-0 flex-1 items-center rounded-xl border border-border bg-secondary/40 px-3 text-[13px]">
          {typed ? (
            <span className="truncate text-foreground">
              {typed}
              <span className="ml-px inline-block h-3.5 w-px animate-pulse bg-primary align-middle" />
            </span>
          ) : (
            <span className="truncate text-muted-foreground/60">Escreva para o personal trainer…</span>
          )}
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform duration-200",
            stage === "typing" && typed.length === sc.userText.length && "scale-90",
          )}
        >
          <Send className="h-4 w-4" />
        </span>
      </div>
    </PhoneFrame>
  );
}
