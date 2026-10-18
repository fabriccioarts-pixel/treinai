"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallStatus } from "@/lib/voice/gemini-live-call";
import { AsciiCoach } from "./ascii-coach";

const STATUS_LABEL: Record<CallStatus, string> = {
  connecting: "Chamando o Théo…",
  listening: "Pode falar, tô ouvindo",
  speaking: "Théo falando",
  ended: "Ligação encerrada",
};

/** Tela cheia da conversa por voz, no estilo do modo voz do ChatGPT/Gemini */
export function VoiceCallOverlay({
  status,
  caption,
  muted,
  onToggleMute,
  onHangUp,
}: {
  status: CallStatus;
  caption: { user: string; assistant: string };
  muted: boolean;
  onToggleMute: () => void;
  onHangUp: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onHangUp();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onHangUp]);

  const speaking = status === "speaking";
  const text = speaking ? caption.assistant : caption.user || caption.assistant;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Conversa por voz com o Théo"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex flex-col bg-background px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      <p aria-live="polite" className="text-center text-sm font-medium text-muted-foreground">
        {muted && status !== "connecting" ? "Microfone mudo" : STATUS_LABEL[status]}
      </p>

      <div className="relative mx-auto min-h-0 w-full max-w-md flex-1">
        <AsciiCoach
          speaking={speaking}
          className={cn(
            "h-full w-full transition-opacity duration-500",
            status === "connecting" ? "opacity-30" : speaking ? "opacity-100" : "opacity-60",
          )}
        />
      </div>

      <p
        className={cn(
          "mx-auto line-clamp-3 min-h-[4.5rem] max-w-md text-center text-base leading-relaxed",
          speaking ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {text}
      </p>

      <div className="mt-6 flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={onToggleMute}
          aria-pressed={muted}
          aria-label={muted ? "Ligar microfone" : "Silenciar microfone"}
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full border transition-colors",
            muted ? "border-foreground bg-foreground text-background" : "border-border bg-secondary text-foreground",
          )}
        >
          {muted ? <MicOff className="size-6" /> : <Mic className="size-6" />}
        </button>
        <button
          type="button"
          onClick={onHangUp}
          aria-label="Encerrar conversa por voz"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-white shadow-lg shadow-destructive/25 transition-transform active:scale-95"
        >
          <PhoneOff className="size-6" />
        </button>
      </div>
    </motion.div>
  );
}
