"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Send, CheckCircle2, User, Sparkles, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { askCoachAction } from "@/app/actions/ai-actions";

function CoachAvatar({ pulse = false }: { pulse?: boolean }) {
  return (
    <div className="relative shrink-0">
      {pulse && (
        <div
          className="absolute -inset-1 rounded-full"
          style={{ animation: "pulse-glow 2s ease-in-out infinite" }}
        />
      )}
      <Image
        src="/ai-coach-avatar.png"
        alt="Personal trainer IA"
        width={28}
        height={28}
        className={`relative h-7 w-7 rounded-full ring-1 ring-primary/30 ${pulse ? "" : ""}`}
      />
    </div>
  );
}

/* Typing indicator dots */
function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full bg-primary/60"
          style={{
            animation: `typing-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

interface Turn {
  role: "user" | "assistant";
  text: string;
  actions?: { type: "workout_created" | "workout_updated"; workoutId: string; name: string }[];
  error?: boolean;
}

const SUGGESTIONS = [
  "Como está minha evolução até agora?",
  "Sinto dor no ombro, dá pra trocar o supino por outro exercício?",
  "Monta um treino novo de costas e bíceps pra mim.",
];

const messageVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

export function AiCoachChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, pending]);

  function send(message: string) {
    if (!message.trim() || pending) return;
    setTurns((prev) => [...prev, { role: "user", text: message }]);
    setInput("");
    startTransition(async () => {
      const result = await askCoachAction(message);
      setTurns((prev) => [
        ...prev,
        result.error
          ? { role: "assistant", text: result.error, error: true }
          : { role: "assistant", text: result.reply ?? "", actions: result.actions },
      ]);
    });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Suggestions — shown only when no messages */}
      <AnimatePresence>
        {turns.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mb-4 space-y-4"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary/60" />
              <p>
                Pergunte sobre sua evolução, peça ajustes de carga ou diga se precisa adaptar um
                exercício — eu edito ou crio o treino direto no seu app.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="group/sug relative flex items-center justify-between overflow-hidden rounded-xl border border-border/50 bg-secondary/50 px-4 py-3 text-left text-sm text-secondary-foreground transition-all duration-300 hover:border-primary/30 hover:bg-secondary/80 hover:shadow-md hover:shadow-primary/5"
                >
                  {/* Shimmer on hover */}
                  <span
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/sug:opacity-100"
                    style={{
                      background: "linear-gradient(90deg, transparent, color-mix(in oklch, var(--primary) 5%, transparent), transparent)",
                      backgroundSize: "200% 100%",
                      animation: "shimmer 2s linear infinite",
                    }}
                  />
                  <span className="relative">{s}</span>
                  <ArrowRight className="relative ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-all duration-200 group-hover/sug:translate-x-0.5 group-hover/sug:text-primary group-hover/sug:opacity-100" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat messages */}
      <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar">
        <AnimatePresence mode="popLayout">
          {turns.map((turn, i) => (
            <motion.div
              key={i}
              variants={messageVariants}
              initial="hidden"
              animate="visible"
              layout
              className={turn.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              {turn.role === "user" ? (
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-to-br from-primary to-primary/80 px-4 py-3 text-sm text-primary-foreground shadow-lg shadow-primary/10">
                  {turn.text}
                </div>
              ) : (
                <Card
                  className={`max-w-[90%] gap-2 border-none p-4 ring-1 ${
                    turn.error
                      ? "ring-destructive/40 bg-destructive/5"
                      : "ring-foreground/[0.06] glass"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <CoachAvatar />
                    <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                      {turn.text}
                    </p>
                  </div>
                  {turn.actions && turn.actions.length > 0 && (
                    <div className="ml-9 space-y-1.5 border-t border-border/50 pt-2.5">
                      {turn.actions.map((action, j) => (
                        <Link
                          key={j}
                          href={`/treinos/${action.workoutId}`}
                          className="group/action flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-primary/80"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="underline-offset-2 group-hover/action:underline">
                            {action.type === "workout_created" ? "Treino criado" : "Treino atualizado"}:{" "}
                            {action.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Thinking state */}
        <AnimatePresence>
          {pending && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <Card className="gap-2 border-none p-4 ring-1 ring-foreground/[0.06] glass">
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <CoachAvatar pulse />
                  <TypingDots />
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input bar — glass with glow on focus */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-4 flex items-center gap-2.5"
      >
        <div className="group/input relative flex h-12 flex-1 items-center gap-2.5 rounded-2xl border border-border/50 bg-secondary/40 px-4 transition-all duration-300 focus-within:border-primary/40 focus-within:bg-secondary/60 focus-within:shadow-lg focus-within:shadow-primary/5">
          <User className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-focus-within/input:text-primary/60" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escreva para o personal trainer…"
            className="h-full flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <Button
          type="submit"
          size="icon"
          className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 disabled:opacity-40 disabled:shadow-none"
          disabled={pending}
        >
          <Send className="h-4.5 w-4.5" />
        </Button>
      </form>
    </div>
  );
}
