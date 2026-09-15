"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Send, CheckCircle2, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { askCoachAction } from "@/app/actions/ai-actions";

function CoachAvatar({ pulse = false }: { pulse?: boolean }) {
  return (
    <Image
      src="/ai-coach-avatar.png"
      alt="Personal trainer IA"
      width={28}
      height={28}
      className={`h-7 w-7 shrink-0 rounded-full ring-1 ring-primary/30 ${pulse ? "animate-pulse" : ""}`}
    />
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
      {turns.length === 0 && (
        <div className="mb-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Pergunte sobre sua evolução, peça ajustes de carga ou diga se precisa adaptar um
            exercício — eu edito ou crio o treino direto no seu app.
          </p>
          <div className="flex flex-col gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-xl bg-secondary px-3 py-2.5 text-left text-sm text-secondary-foreground hover:bg-secondary/70"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 space-y-3">
        {turns.map((turn, i) => (
          <div key={i} className={turn.role === "user" ? "flex justify-end" : "flex justify-start"}>
            {turn.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
                {turn.text}
              </div>
            ) : (
              <Card
                className={`max-w-[90%] gap-2 p-3.5 ${turn.error ? "ring-1 ring-destructive/40" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <CoachAvatar />
                  <p className="mt-0.5 text-sm whitespace-pre-wrap text-foreground">{turn.text}</p>
                </div>
                {turn.actions && turn.actions.length > 0 && (
                  <div className="ml-6 space-y-1.5 border-t border-border pt-2">
                    {turn.actions.map((action, j) => (
                      <Link
                        key={j}
                        href={`/treinos/${action.workoutId}`}
                        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {action.type === "workout_created" ? "Treino criado" : "Treino atualizado"}:{" "}
                        {action.name}
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        ))}
        {pending && (
          <div className="flex justify-start">
            <Card className="gap-2 p-3.5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CoachAvatar pulse />
                Pensando…
              </div>
            </Card>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-4 flex items-center gap-2"
      >
        <div className="flex h-11 flex-1 items-center gap-2 rounded-full bg-secondary px-4">
          <User className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escreva para o personal trainer…"
            className="h-full flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={pending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
