"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowUp, ArrowRight, AudioLines } from "lucide-react";
import { AiIcon } from "@/components/ui/app-icon";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
  askCoachAction,
  runVoiceToolAction,
  saveVoiceTurnAction,
  startVoiceSessionAction,
  endVoiceSessionAction,
} from "@/app/actions/ai-actions";
import { GeminiLiveCall, type CallStatus } from "@/lib/voice/gemini-live-call";
import type { CoachAction } from "@/lib/worker-api";
import { AiMessageRenderer, parseAiMessage } from "./ai-message-renderer";
import { CoachActionCard } from "./coach-action-card";
import { AsciiCoach } from "./ascii-coach";
import { VoiceCallOverlay } from "./voice-call-overlay";

function CoachAvatar({ pulse = false }: { pulse?: boolean }) {
  return (
    <div className="relative shrink-0">
      {pulse && (
        <div
          className="absolute -inset-1 rounded-full"
          style={{ animation: "pulse-glow 2s ease-in-out infinite" }}
        />
      )}
      {/* Mesmo rosto em ASCII da aba "Théo" na navegação */}
      <AsciiCoach variant="icon" className="relative h-8 w-8 rounded-full text-primary ring-1 ring-primary/40" />
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

/** O treino que o Théo acabou de criar nesta resposta, se houver */
function createdWorkout(actions: CoachAction[] | undefined) {
  return actions?.find((a): a is Extract<CoachAction, { workoutId: string }> => a.type === "workout_created");
}

export interface Turn {
  role: "user" | "assistant";
  text: string;
  actions?: CoachAction[];
  error?: boolean;
  /** Erro por fim do teste grátis: mostra o botão para assinar */
  paywall?: boolean;
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

export function AiCoachChat({
  autoGreetMessage,
  onWorkoutCreated,
  conversationId,
  initialTurns = [],
  syncUrl = false,
  voice = false,
}: {
  autoGreetMessage?: string;
  /** Chamado com o primeiro treino que o Théo criar em cada resposta */
  onWorkoutCreated?: (workout: { workoutId: string; name: string }) => void;
  /** Conversa salva sendo continuada; sem ela, a primeira resposta abre uma nova */
  conversationId?: string;
  initialTurns?: Turn[];
  /** Grava a conversa nova na URL (?c=), para recarregar a página sem perder o chat */
  syncUrl?: boolean;
  /** Mostra o botão de conversa por voz (Gemini Live) quando o campo está vazio */
  voice?: boolean;
} = {}) {
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const conversationIdRef = useRef(conversationId);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const greetedRef = useRef(false);
  // Mantém o busto "falando" (apagado) por um tempo proporcional ao tamanho da resposta
  const [speaking, setSpeaking] = useState(false);
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, pending]);

  useEffect(() => () => clearTimeout(speakingTimerRef.current), []);

  // --- Conversa por voz ---
  const callRef = useRef<GeminiLiveCall | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus | null>(null);
  const [caption, setCaption] = useState({ user: "", assistant: "" });
  const [muted, setMuted] = useState(false);
  /** Treinos que o Théo mexeu durante a troca em andamento */
  const voiceActionsRef = useRef<CoachAction[]>([]);
  /** Salva as trocas em ordem: a primeira pode criar a conversa que as próximas usam */
  const voiceSaveRef = useRef<Promise<void>>(Promise.resolve());
  const voiceSessionIdRef = useRef<string | null>(null);
  /** A ligação não abriu porque o teste acabou: o fim da chamada mostra o convite para assinar */
  const voicePaywallRef = useRef(false);

  useEffect(() => () => callRef.current?.hangUp(), []);

  function adoptConversation(id: string | undefined) {
    if (!id || conversationIdRef.current) return;
    conversationIdRef.current = id;
    if (syncUrl) window.history.replaceState(null, "", `?c=${id}`);
  }

  function startVoice() {
    if (callRef.current) return;
    setCaption({ user: "", assistant: "" });
    setMuted(false);
    voiceActionsRef.current = [];
    const call = new GeminiLiveCall({
      getSession: async () => {
        const result = await startVoiceSessionAction(conversationIdRef.current);
        voicePaywallRef.current = !!result.paywall;
        if (!result.session) throw new Error(result.error);
        voiceSessionIdRef.current = result.session.voiceSessionId ?? null;
        return result.session;
      },
      onToolCall: async (name, args) => {
        const { output, actions } = await runVoiceToolAction(name, args);
        voiceActionsRef.current.push(...actions);
        const created = createdWorkout(actions);
        if (created) onWorkoutCreated?.({ workoutId: created.workoutId, name: created.name });
        return output;
      },
      onStatus: setCallStatus,
      onCaption: setCaption,
      onTurn: ({ userText, reply }) => {
        const actions = voiceActionsRef.current;
        voiceActionsRef.current = [];
        setTurns((prev) => [
          ...prev,
          ...(userText ? [{ role: "user" as const, text: userText }] : []),
          ...(reply || actions.length
            ? [{ role: "assistant" as const, text: reply, actions: actions.length ? actions : undefined }]
            : []),
        ]);
        setCaption({ user: "", assistant: "" });
        // Saudação sem fala do usuário fica só na tela: o histórico guarda pares pergunta/resposta
        if (!userText || !reply) return;
        voiceSaveRef.current = voiceSaveRef.current.then(async () => {
          const saved = await saveVoiceTurnAction({
            conversationId: conversationIdRef.current,
            userText,
            reply,
            actions,
          });
          adoptConversation(saved.conversationId);
        });
      },
      onEnd: (error) => {
        // Para a contagem dos minutos de voz do dia no momento em que a ligação acabou
        if (voiceSessionIdRef.current) void endVoiceSessionAction(voiceSessionIdRef.current);
        voiceSessionIdRef.current = null;
        callRef.current = null;
        setCallStatus(null);
        const paywall = voicePaywallRef.current;
        voicePaywallRef.current = false;
        if (error) setTurns((prev) => [...prev, { role: "assistant", text: error, error: true, paywall }]);
      },
    });
    callRef.current = call;
    void call.start();
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    callRef.current?.setMuted(next);
  }

  function pushAssistant(result: Awaited<ReturnType<typeof askCoachAction>>) {
    const text = result.error ?? result.reply ?? "";
    setTurns((prev) => [
      ...prev,
      result.error
        ? { role: "assistant", text, error: true, paywall: result.paywall }
        : { role: "assistant", text, actions: result.actions },
    ]);
    adoptConversation(result.conversationId);
    const created = createdWorkout(result.actions);
    if (created) onWorkoutCreated?.({ workoutId: created.workoutId, name: created.name });
    setSpeaking(true);
    clearTimeout(speakingTimerRef.current);
    speakingTimerRef.current = setTimeout(
      () => setSpeaking(false),
      Math.min(8000, Math.max(2500, text.length * 30)),
    );
  }

  useEffect(() => {
    if (!autoGreetMessage || greetedRef.current) return;
    greetedRef.current = true;
    startTransition(async () => {
      pushAssistant(await askCoachAction(autoGreetMessage, { hidden: true }));
    });
  }, [autoGreetMessage]);

  const coachTalking = pending || speaking;
  const bustOpacity = coachTalking ? 0.07 : turns.length === 0 ? 1 : 0.3;

  function send(message: string) {
    if (!message.trim() || pending) return;
    const userText = message.trim();

    const history = turns
      .filter((t) => !t.error && t.text.trim())
      .map((t) => ({
        role: t.role,
        content: t.role === "assistant" ? parseAiMessage(t.text).cleanText : t.text,
      }));

    setTurns((prev) => [...prev, { role: "user", text: userText }]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    startTransition(async () => {
      // Com conversa salva o worker usa o histórico do banco; o do cliente só vale para worker antigo
      pushAssistant(await askCoachAction(userText, { conversationId: conversationIdRef.current, history }));
    });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Suggestions — shown only when no messages */}
      <AnimatePresence>
        {turns.length === 0 && !autoGreetMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mb-4 space-y-4"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AiIcon className="h-4 w-4 text-primary/60" />
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

      {/* Chat messages, com o busto ASCII do personal ao fundo */}
      <div className="relative min-h-0 flex-1">
      <motion.div
        className="pointer-events-none absolute inset-y-0 -inset-x-4 lg:-inset-x-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: bustOpacity }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <AsciiCoach speaking={coachTalking} className="h-full w-full" />
      </motion.div>
      <div className="relative h-full space-y-3 overflow-y-auto no-scrollbar">
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
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-to-br from-primary to-primary/80 px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/10">
                  {turn.text}
                </div>
              ) : (
                <div
                  className={`max-w-[95%] sm:max-w-[85%] rounded-2xl rounded-tl-sm border p-4 transition-all duration-300 shadow-sm ${
                    turn.paywall
                      ? "border-primary/40 bg-primary/5"
                      : turn.error
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-border/50 bg-secondary/35 backdrop-blur-md"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <CoachAvatar />
                    <div className="min-w-0 flex-1">
                      {turn.paywall ? (
                        <div className="mt-0.5 space-y-3">
                          <p className="text-sm leading-relaxed font-medium text-foreground">{turn.text}</p>
                          <Link
                            href="/assinar"
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
                          >
                            Ver planos
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      ) : turn.error ? (
                        <p className="mt-0.5 text-sm leading-relaxed font-medium text-destructive">
                          {turn.text}
                        </p>
                      ) : (
                        <AiMessageRenderer
                          content={turn.text}
                          isLatest={i === turns.length - 1}
                          disabled={pending}
                          onSelectOption={send}
                        />
                      )}
                    </div>
                  </div>

                  {/* O que o Théo fez nesta resposta: treino, refeição ou água */}
                  {turn.actions && turn.actions.length > 0 && (
                    <div className="ml-10 mt-3 space-y-2 border-t border-border/40 pt-3">
                      {turn.actions.map((action, j) => (
                        <CoachActionCard key={j} action={action} />
                      ))}
                    </div>
                  )}
                </div>
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
              <div className="rounded-2xl rounded-tl-sm border border-border/50 bg-secondary/35 backdrop-blur-md p-4 shadow-sm">
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <CoachAvatar pulse />
                  <TypingDots />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>
      </div>

      {/* Input bar — single pill with the send button inside, ChatGPT-style */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-4 flex items-end gap-2 rounded-[28px] border border-border/60 bg-secondary/50 py-2 pl-5 pr-2 shadow-lg shadow-black/20 backdrop-blur-md transition-colors focus-within:border-border"
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            const el = e.target;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
          }}
          onKeyDown={(e) => {
            // Enter envia; Shift+Enter quebra linha
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Escreva para o personal trainer…"
          className="max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2 text-base leading-6 text-foreground outline-none placeholder:text-muted-foreground/60"
        />
        {/* Campo vazio: o botão abre a conversa por voz, como no ChatGPT */}
        {voice && !input.trim() ? (
          <button
            type="button"
            onClick={startVoice}
            aria-label="Conversar por voz com o Théo"
            disabled={pending || callStatus !== null}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <AudioLines className="h-5 w-5" strokeWidth={2.25} />
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Enviar mensagem"
            disabled={pending || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
          </button>
        )}
      </form>

      <AnimatePresence>
        {callStatus && (
          <VoiceCallOverlay
            status={callStatus}
            caption={caption}
            muted={muted}
            onToggleMute={toggleMute}
            onHangUp={() => callRef.current?.hangUp()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
