"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Droplet, Lock, Minus, Moon, Plus, Sparkles, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlanCards } from "@/components/billing/plan-cards";
import { WaterGlass } from "@/components/ui/water-glass";
import { saveLeadAction } from "@/app/actions/billing-actions";
import {
  BLOQUEIO_PITCH,
  GLASSES_MAX,
  GLASS_ML,
  STEPS,
  computeResult,
  formatLitersShort,
  formatWhatsapp,
  needsMedicalClearance,
  planStep,
  selectedConditions,
  validMeasures,
  waterTargetMl,
  type Answers,
  type DiagnosticResult,
  type Step,
} from "@/lib/diagnostico";
import type { Plan } from "@/lib/worker-api";
import { cn } from "@/lib/utils";

/*
 * Quiz público: uma pergunta por tela, avanço automático nas escolhas únicas, progresso salvo no
 * aparelho (dá para fechar e voltar). O resultado só aparece depois do e-mail e do WhatsApp.
 */

const STORE = "treinai.diagnostico";
const AUTO_ADVANCE_MS = 320;
const ANALYSIS_MS = 3200;

type View = "intro" | "quiz" | "analise" | "contato" | "resultado";

interface Saved {
  v: 1;
  view: View;
  index: number;
  answers: Answers;
  email: string;
  whatsapp: string;
  utm: Record<string, string>;
}

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(STORE);
    const saved = raw ? (JSON.parse(raw) as Saved) : null;
    return saved?.v === 1 ? saved : null;
  } catch {
    return null;
  }
}

function persist(state: Saved) {
  try {
    localStorage.setItem(STORE, JSON.stringify(state));
  } catch {
    // Aba anônima ou armazenamento cheio: o quiz funciona, só não retoma depois
  }
}

const ANALYSIS_LINES = [
  "Organizando seu treino",
  "Medindo sua constância",
  "Avaliando seu sono",
  "Olhando o seu prato",
  "Calculando sua meta de água",
  "Montando seu plano",
];

export function DiagnosticoQuiz({ plans, trialDays }: { plans: Plan[]; trialDays: number }) {
  const reduceMotion = useReducedMotion();
  const [view, setView] = useState<View>("intro");
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Answers>({});
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [utm, setUtm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [saving, startSaving] = useTransition();
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Retoma de onde parou e guarda a campanha (utm_*) da primeira visita
  useEffect(() => {
    const saved = load();
    const params = new URLSearchParams(window.location.search);
    const fromUrl = Object.fromEntries([...params].filter(([k]) => k.startsWith("utm_")));
    /* eslint-disable react-hooks/set-state-in-effect -- leitura única do localStorage, só existe no navegador */
    if (saved) {
      setView(saved.view === "analise" ? "contato" : saved.view);
      setIndex(Math.min(saved.index, STEPS.length - 1));
      setAnswers(saved.answers);
      setEmail(saved.email);
      setWhatsapp(saved.whatsapp);
      setUtm(Object.keys(fromUrl).length ? fromUrl : saved.utm);
    } else {
      setUtm(fromUrl);
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (hydrated) persist({ v: 1, view, index, answers, email, whatsapp, utm });
  }, [hydrated, view, index, answers, email, whatsapp, utm]);

  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view, index]);

  // Tela de análise: só uma pausa para o resultado não parecer instantâneo
  useEffect(() => {
    if (view !== "analise") return;
    const t = setTimeout(() => setView("contato"), reduceMotion ? 600 : ANALYSIS_MS);
    return () => clearTimeout(t);
  }, [view, reduceMotion]);

  const step = STEPS[index];
  const result = useMemo<DiagnosticResult | null>(
    () => (view === "resultado" || view === "contato" ? computeResult(answers) : null),
    [view, answers],
  );

  function go(nextIndex: number) {
    setError(null);
    if (nextIndex >= STEPS.length) {
      setView("analise");
      return;
    }
    setDirection(nextIndex >= index ? 1 : -1);
    setIndex(Math.max(0, nextIndex));
  }

  function back() {
    if (view === "contato") {
      setView("quiz");
      return;
    }
    if (index === 0) {
      setView("intro");
      return;
    }
    go(index - 1);
  }

  function answer(id: string, value: string, autoAdvance: boolean) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    if (!autoAdvance) return;
    clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => go(index + 1), reduceMotion ? 0 : AUTO_ADVANCE_MS);
  }

  function next() {
    if (step.kind === "multi" && !(answers[step.id] ?? "")) {
      setError("Marque pelo menos uma opção (ou \"Nenhuma dessas\").");
      return;
    }
    if (step.kind === "name" && (answers.nome ?? "").trim().length < 2) {
      setError("Digite seu primeiro nome, com pelo menos 2 letras.");
      return;
    }
    if (step.kind === "measures" && !validMeasures(answers)) {
      setError("Confere a altura (em cm) e o peso (em kg)?");
      return;
    }
    go(index + 1);
  }

  function submitContact(e: React.FormEvent) {
    e.preventDefault();
    if (!result) return;
    setError(null);
    startSaving(async () => {
      const res = await saveLeadAction({
        name: result.name,
        email,
        whatsapp,
        answers,
        score: result.score,
        phase: result.phase.name,
        utm,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setView("resultado");
    });
  }

  function restart() {
    setAnswers({});
    setIndex(0);
    setView("intro");
  }

  if (!hydrated) return <div className="min-h-dvh" />;

  // Zoom out suave: a tela entra um pouco ampliada e assenta; a que sai encolhe e some.
  // Voltando uma pergunta, o movimento se inverte. Com "reduzir movimento", só um fade curto.
  const zoom = (dir: number) =>
    reduceMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
      : {
          initial: { opacity: 0, scale: dir >= 0 ? 1.06 : 0.95 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: dir >= 0 ? 0.95 : 1.06 },
          transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
        };

  // A abertura some por conta própria (capa recolhe, textos esmaecem); aqui ela só sai de cena.
  // Quem chega dela entra subindo devagar, sem o zoom das trocas de pergunta.
  const viewMotion = (v: View) => {
    if (reduceMotion) return zoom(1);
    if (v === "intro") return { ...zoom(1), exit: { opacity: 0, transition: { duration: 0.01 } } };
    if (v === "quiz")
      return {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95 },
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
      };
    return zoom(1);
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-5 sm:max-w-lg">
      {/* Luz verde difusa no topo e na base da tela, fixa enquanto a página rola */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: [
            "radial-gradient(ellipse 110% 38% at 50% 0%, color-mix(in oklch, var(--primary) 13%, transparent), transparent 72%)",
            "radial-gradient(ellipse 110% 32% at 50% 100%, color-mix(in oklch, var(--primary) 11%, transparent), transparent 72%)",
          ].join(", "),
        }}
      />
      {view !== "intro" && view !== "resultado" && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
        <Header
          onBack={view === "analise" ? undefined : back}
          current={view === "quiz" ? index + 1 : STEPS.length}
          total={STEPS.length}
          reduceMotion={!!reduceMotion}
        />
        </motion.div>
      )}

      <AnimatePresence mode="wait" initial={false}>
      <motion.div key={view} {...viewMotion(view)} className="flex flex-1 flex-col">
      {view === "intro" && <Intro onStart={() => setView("quiz")} hasProgress={index > 0} onRestart={restart} />}

      {view === "quiz" && (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step.id} {...zoom(direction)} className="flex flex-1 flex-col">
            <StepView step={step} answers={answers} onAnswer={answer} />
            {error && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            )}
            {step.kind !== "single" && (
              <div className="mt-auto pt-6">
                <Button type="button" size="lg" className="cta-shine group h-14 w-full gap-2 rounded-full text-base font-semibold" onClick={next}>
                  Continuar
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {view === "analise" && <Analysis reduceMotion={!!reduceMotion} />}

      {view === "contato" && result && (
        <form onSubmit={submitContact} className="flex flex-1 flex-col">
          <div className="mb-6 rounded-2xl border border-border/60 bg-card p-4" aria-hidden="true">
            {/* Prévia borrada e fictícia: a nota real não pode estar no HTML antes do contato */}
            <div className="flex items-center gap-4 blur-[6px] select-none">
              <ScoreRing score={64} size={72} label="?" />
              <div className="flex-1 space-y-2">
                {[62, 38, 71, 45, 83].map((w) => (
                  <div key={w} className="h-2 rounded-full bg-primary/40" style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
            <Lock className="h-3.5 w-3.5" />
            Diagnóstico pronto
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">{result.name}, seu diagnóstico está pronto.</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Deixe seu e-mail e WhatsApp pra ver o resultado. O Théo pode te mandar dicas pra colocar o plano em prática.
          </p>
          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="dx-email" className="mb-1.5 block text-sm font-medium text-foreground">
                Seu melhor e-mail
              </label>
              <Input
                id="dx-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                spellCheck={false}
                required
                placeholder="voce@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div>
              <label htmlFor="dx-whats" className="mb-1.5 block text-sm font-medium text-foreground">
                Seu WhatsApp (com DDD)
              </label>
              <Input
                id="dx-whats"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                required
                placeholder="(11) 91234-5678"
                value={formatWhatsapp(whatsapp)}
                onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 11))}
                className="h-12 text-base"
              />
            </div>
          </div>
          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="mt-auto pt-6">
            <Button type="submit" size="lg" className="cta-shine group h-14 w-full gap-2 rounded-full text-base font-semibold" disabled={saving}>
              {saving ? "Liberando…" : "Ver meu diagnóstico"}
              {!saving && <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Seus dados ficam só com o Treinai. Sem spam, e dá pra sair da lista quando quiser.
            </p>
          </div>
        </form>
      )}

      {view === "resultado" && result && (
        <Result result={result} answers={answers} plans={plans} trialDays={trialDays} onRestart={restart} />
      )}
      </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Header({
  onBack,
  current,
  total,
  reduceMotion,
}: {
  onBack?: () => void;
  current: number;
  total: number;
  reduceMotion: boolean;
}) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        disabled={!onBack}
        aria-label="Voltar"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:invisible"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-label={`Etapa ${current} de ${total}`}
      >
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${(current / total) * 100}%` }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: "easeOut" }}
        />
      </div>
      <span className="tabular w-10 shrink-0 text-right text-xs text-muted-foreground">
        {current}/{total}
      </span>
    </div>
  );
}

/** Tempo para a capa recolher e os textos da abertura sumirem antes da primeira pergunta */
const LEAVE_MS = 700;

/** Números de exemplo que flutuam sobre a foto de capa: mostram o que o app acompanha */
const HERO_BADGES = [
  { key: "sono", icon: Moon, label: "Sono", value: "7h 32min", className: "top-[22%] left-4", delay: 0 },
  { key: "agua", icon: Droplet, label: "Água", value: "2,1 L", className: "top-[44%] right-4", delay: 1.2 },
] as const;

function Intro({ onStart, hasProgress, onRestart }: { onStart: () => void; hasProgress: boolean; onRestart: () => void }) {
  const reduceMotion = useReducedMotion();
  const [leaving, setLeaving] = useState(false);

  // Ao começar, a capa e os selos se recolhem para cima antes da primeira pergunta entrar
  function start() {
    if (reduceMotion) return onStart();
    setLeaving(true);
    setTimeout(onStart, LEAVE_MS);
  }

  return (
    <div className="-mx-4 -mt-5 flex flex-1 flex-col">
      <motion.div
        initial={false}
        animate={leaving ? { height: 0, opacity: 0 } : { height: "auto", opacity: 1 }}
        transition={{ duration: LEAVE_MS / 1000, ease: [0.65, 0, 0.35, 1] }}
        className="overflow-hidden"
      >
        <div className="relative aspect-square max-h-[58dvh] w-full overflow-hidden">
          <Image
            src="/quiz-fotos/hero.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 640px) 512px, 100vw"
            className="photo-zoom-in object-cover object-top"
          />
          {/* A base da foto some no fundo da página, para o título emendar */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background via-background/60 to-transparent" />
          {HERO_BADGES.map((b, i) => (
            <motion.div
              key={b.key}
              initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.25 + i * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={cn("absolute", b.className)}
            >
              <div
                className="hero-float flex items-center gap-2.5 rounded-2xl border border-white/10 bg-black/45 py-2 pr-3.5 pl-2 backdrop-blur-md"
                style={{ animationDelay: `${-b.delay}s` }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary">
                  <b.icon className="h-4.5 w-4.5" />
                </span>
                <span className="leading-tight">
                  <span className="block text-[11px] text-white/70">{b.label}</span>
                  <span className="block text-base font-bold text-white">{b.value}</span>
                </span>
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.55, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-[64%] left-10"
          >
            <div
              className="hero-float flex items-center gap-2.5 rounded-2xl border border-white/10 bg-black/45 py-2 pr-3.5 pl-2 backdrop-blur-md"
              style={{ animationDelay: "-2.4s" }}
            >
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
                  transition={{ delay: 0.7, duration: reduceMotion ? 0 : 1.2, ease: [0.33, 1, 0.68, 1] }}
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
        </div>
      </motion.div>

      <motion.div
        initial={false}
        animate={leaving ? { opacity: 0, y: -14 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 1, 1] }}
        className="relative -mt-6 flex flex-1 flex-col px-4 pb-6"
      >
        <Image src="/logo.png" alt="Treinai" width={92} height={108} className="mb-4 h-16 w-auto self-start" priority />
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.08em] text-primary uppercase">
          <Sparkles className="h-3.5 w-3.5" />
          Diagnóstico Treinai · grátis
        </p>
        <h1 className="mt-3 text-[2.1rem] leading-[1.1] font-bold tracking-[-0.02em] text-balance text-foreground">
          O que está travando a sua <span className="text-primary">evolução?</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Perguntas rápidas sobre cinco áreas: treino, constância, sono, alimentação e água. No fim, você vê sua nota de
          0 a 100 em cada uma e sabe por onde começar.
        </p>
        <Button
          type="button"
          size="lg"
          className="cta-shine group mt-7 h-14 w-full gap-2 rounded-full text-base font-semibold"
          onClick={start}
          disabled={leaving}
        >
          {hasProgress ? "Continuar meu diagnóstico" : "Começar meu diagnóstico"}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Button>
        {hasProgress ? (
          <button
            type="button"
            onClick={onRestart}
            className="mt-3 self-center text-sm text-muted-foreground hover:text-foreground"
          >
            Começar do zero
          </button>
        ) : (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Timer className="h-3.5 w-3.5 text-primary" />
            Leva uns 3 minutos. O resultado sai na hora.
          </p>
        )}
        <div className="mt-7 flex items-center gap-3">
          <Image
            src="/ai-coach-avatar.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-full ring-2 ring-primary/30"
          />
          <p className="text-sm text-foreground/80">
            Quem analisa é o <strong className="text-foreground">Théo</strong>, o personal de IA do Treinai.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/** Perguntas que abrem com uma foto da cena (public/quiz-fotos); as de lista longa ou com controle próprio ficam sem */
const QUESTION_PHOTO: Partial<Record<string, string>> = {
  objetivo: "/quiz-fotos/objetivo.jpg",
  experiencia: "/quiz-fotos/experiencia.jpg",
  carga: "/quiz-fotos/carga.jpg",
  bloqueio: "/quiz-fotos/bloqueio.jpg",
  recomecos: "/quiz-fotos/recomecos.jpg",
  sono: "/quiz-fotos/sono.jpg",
  ultraprocessados: "/quiz-fotos/ultraprocessados.jpg",
  proteina: "/quiz-fotos/proteina.jpg",
};

function PhotoCard({ src, priority, className }: { src: string; priority?: boolean; className?: string }) {
  return (
    <div className={cn("relative aspect-[16/9] overflow-hidden rounded-2xl border border-border/60 bg-card", className)}>
      <Image src={src} alt="" fill priority={priority} sizes="(min-width: 640px) 512px, 100vw" className="photo-zoom-in object-cover" />
      {/* Escurece a base para a foto emendar no fundo da página */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/70 to-transparent" />
    </div>
  );
}

function QuestionTitle({ step }: { step: Exclude<Step, { kind: "insight" }> }) {
  const photo = QUESTION_PHOTO[step.id];
  return (
    <div className="mb-5">
      {photo && <PhotoCard src={photo} priority className="mb-5" />}
      <p className="text-xs font-semibold tracking-wide text-primary uppercase">{step.section}</p>
      <h2 className="mt-1.5 text-xl leading-snug font-bold text-foreground">{step.title}</h2>
      {step.hint && <p className="mt-1 text-sm text-muted-foreground">{step.hint}</p>}
    </div>
  );
}

function StepView({
  step,
  answers,
  onAnswer,
}: {
  step: Step;
  answers: Answers;
  onAnswer: (id: string, value: string, autoAdvance: boolean) => void;
}) {
  switch (step.kind) {
    case "single": {
      const photoOptions = step.layout === "photos" ? step.options.filter((o) => o.image) : [];
      return (
        <div>
          <QuestionTitle step={step} />
          {photoOptions.length > 0 && (
            <div className="mb-2.5 grid grid-cols-2 gap-2.5">
              {photoOptions.map((o) => {
                const selected = answers[step.id] === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onAnswer(step.id, o.value, true)}
                    className={cn(
                      "group relative aspect-[3/4] overflow-hidden rounded-2xl border text-left transition-all active:scale-[0.98]",
                      selected ? "border-primary ring-2 ring-primary/50" : "border-border/60 hover:border-border",
                    )}
                  >
                    <Image
                      src={o.image!}
                      alt=""
                      fill
                      priority
                      sizes="(min-width: 640px) 250px, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3.5 text-base font-semibold text-white">
                      {o.label}
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
                          selected ? "border-primary bg-primary text-primary-foreground" : "border-white/50",
                        )}
                      >
                        {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div className={cn(step.layout === "chips" ? "grid grid-cols-2 gap-2.5" : "grid gap-2.5")}>
            {step.options.filter((o) => !photoOptions.includes(o)).map((o) => {
              const selected = answers[step.id] === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onAnswer(step.id, o.value, true)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-2xl border p-4 text-left text-base font-medium transition-all active:scale-[0.98]",
                    step.layout === "chips" && "justify-center text-center",
                    selected
                      ? "border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/40"
                      : "border-border/60 bg-card text-foreground hover:border-border hover:bg-muted/40",
                  )}
                >
                  {o.label}
                  {selected && step.layout !== "chips" && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case "multi": {
      const picked = new Set((answers[step.id] ?? "").split(",").filter(Boolean));
      const toggle = (value: string, exclusive?: boolean) => {
        const next = new Set(picked);
        if (next.has(value)) next.delete(value);
        else if (exclusive) {
          next.clear();
          next.add(value);
        } else {
          // Marcar uma condição desmarca "Nenhuma dessas"
          for (const o of step.options) if (o.exclusive) next.delete(o.value);
          next.add(value);
        }
        onAnswer(step.id, step.options.filter((o) => next.has(o.value)).map((o) => o.value).join(","), false);
      };
      return (
        <div>
          <QuestionTitle step={step} />
          <div className="grid gap-2">
            {step.options.map((o) => {
              const selected = picked.has(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  onClick={() => toggle(o.value, o.exclusive)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition-all active:scale-[0.98]",
                    selected
                      ? "border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/40"
                      : "border-border/60 bg-card text-foreground hover:border-border hover:bg-muted/40",
                  )}
                >
                  {o.label}
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                    )}
                  >
                    {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case "name":
      return (
        <div>
          <QuestionTitle step={step} />
          <Input
            autoFocus
            autoComplete="given-name"
            placeholder="Seu primeiro nome"
            maxLength={40}
            value={answers.nome ?? ""}
            onChange={(e) => onAnswer("nome", e.target.value, false)}
            className="h-14 text-lg"
          />
        </div>
      );

    case "glasses": {
      const count = Number(answers.copos ?? 0);
      const set = (n: number) => onAnswer("copos", String(Math.max(0, Math.min(GLASSES_MAX, n))), false);
      return (
        <div>
          <QuestionTitle step={step} />
          <p className="tabular text-4xl font-bold text-foreground">
            {count} <span className="text-base font-medium text-muted-foreground">{count === 1 ? "copo" : "copos"}</span>
          </p>
          <p className="text-sm text-primary">{formatLitersShort(count * GLASS_ML)} por dia</p>
          <div className="mt-5 grid grid-cols-6 gap-x-2 gap-y-3">
            {Array.from({ length: GLASSES_MAX }, (_, i) => {
              const full = i < count;
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={`${i + 1} ${i === 0 ? "copo" : "copos"}`}
                  aria-pressed={full}
                  onClick={() => set(i + 1 === count ? i : i + 1)}
                  className="group flex justify-center rounded-lg py-1 transition-transform active:scale-95"
                >
                  <WaterGlass full={full} delay={(i % 6) * 0.17} className="group-hover:opacity-90" />
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <Button type="button" variant="outline" size="icon" aria-label="Um copo a menos" onClick={() => set(count - 1)}>
              <Minus className="h-4 w-4" />
            </Button>
            <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => set(0)}>
              Quase nenhum
            </button>
            <Button type="button" variant="outline" size="icon" aria-label="Um copo a mais" onClick={() => set(count + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    case "measures":
      return (
        <div>
          <QuestionTitle step={step} />
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { id: "altura", label: "Altura", unit: "cm", placeholder: "165" },
                { id: "peso", label: "Peso", unit: "kg", placeholder: "68" },
              ] as const
            ).map((f) => (
              <div key={f.id}>
                <label htmlFor={`dx-${f.id}`} className="mb-2 block text-sm font-medium text-muted-foreground">
                  {f.label}
                </label>
                <div className="relative">
                  <Input
                    id={`dx-${f.id}`}
                    inputMode="decimal"
                    placeholder={f.placeholder}
                    value={answers[f.id] ?? ""}
                    onChange={(e) => onAnswer(f.id, e.target.value.replace(/[^\d,.]/g, "").slice(0, 5), false)}
                    className="tabular h-16 pr-11 text-center text-3xl font-bold md:text-3xl"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                    {f.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "insight":
      return <Insight id={step.id} section={step.section} answers={answers} />;
  }
}

function Insight({ id, section, answers }: { id: string; section: string; answers: Answers }) {
  const reduceMotion = useReducedMotion();
  if (id === "i_progressao") {
    const already = answers.carga === "sempre";
    return (
      <div>
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">{section}</p>
        <p className="mt-4 text-5xl font-bold text-primary">
          <CountUp to={2.5} decimals={1} prefix="+" suffix=" kg" />
        </p>
        <h2 className="mt-3 text-2xl font-bold text-foreground">
          {already ? "Você já faz o que mais importa." : "Sem progressão, o corpo para de mudar."}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          O músculo só continua respondendo quando o treino fica um pouco mais difícil com o tempo: mais carga ou mais
          repetições. {already ? "O Théo faz essa conta por você, série por série." : "É exatamente isso que o Théo acompanha, série por série, e te avisa quando subir."}
        </p>
      </div>
    );
  }

  if (id === "i_sono") {
    const good = answers.sono === "7-9" || answers.sono === "9+";
    return (
      <div>
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">{section}</p>
        <p className="mt-4 text-5xl font-bold text-primary">
          <CountUp to={385} prefix="+" />
        </p>
        <p className="text-sm text-muted-foreground">kcal por dia</p>
        <h2 className="mt-3 text-2xl font-bold text-foreground">
          {good ? "Seu sono joga a seu favor." : "Dormir pouco dá fome."}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Numa revisão de estudos, quem dormiu menos do que precisava comeu, em média, 385 kcal a mais por dia. É como
          um lanche extra todo dia, sem perceber.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Fonte: Al Khatib e colegas, European Journal of Clinical Nutrition, 2017.
        </p>
      </div>
    );
  }

  // i_agua
  const weight = Number((answers.peso ?? "").replace(",", "."));
  const target = waterTargetMl(weight);
  const today = Number(answers.copos ?? 0) * GLASS_ML;
  const missing = Math.max(0, target - today);
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-primary uppercase">{section}</p>
      <div className="mt-5 flex items-end gap-6">
        {[
          { label: "Hoje", ml: today, tone: "bg-muted-foreground/40" },
          { label: "Meta", ml: target, tone: "bg-sky-400" },
        ].map((bar) => (
          <div key={bar.label} className="flex flex-col items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              <CountLiters ml={bar.ml} />
            </span>
            <div className="flex h-36 w-14 items-end overflow-hidden rounded-xl bg-muted">
              <motion.div
                className={cn("w-full rounded-xl", bar.tone)}
                initial={{ height: reduceMotion ? `${Math.min(100, (bar.ml / target) * 100)}%` : "0%" }}
                animate={{ height: `${Math.min(100, (bar.ml / target) * 100)}%` }}
                transition={{ duration: reduceMotion ? 0 : 1.1, ease: [0.33, 1, 0.68, 1] }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{bar.label}</span>
          </div>
        ))}
      </div>
      <h2 className="mt-6 text-2xl font-bold text-foreground">
        Sua meta: <CountLiters ml={target} /> de água por dia
      </h2>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
        {missing > 0
          ? `Hoje você bebe cerca de ${formatLitersShort(today)}. Faltam ${formatLitersShort(missing)} por dia. `
          : "Você já bate a meta. Ótimo! "}
        Estudos com adultos saudáveis mostram que uma desidratação leve já piora o humor e a concentração.
      </p>
      <p className="mt-4 text-xs text-muted-foreground">
        Fontes: Armstrong e colegas, Journal of Nutrition, 2012; Ganio e colegas, British Journal of Nutrition, 2011.
      </p>
    </div>
  );
}

function Analysis({ reduceMotion }: { reduceMotion: boolean }) {
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (reduceMotion) return;
    const step = ANALYSIS_MS / (ANALYSIS_LINES.length + 1);
    const timer = setInterval(() => setDone((d) => Math.min(ANALYSIS_LINES.length, d + 1)), step);
    return () => clearInterval(timer);
  }, [reduceMotion]);
  const pct = reduceMotion ? 100 : Math.round((done / ANALYSIS_LINES.length) * 100);

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-10" role="status" aria-live="polite">
      <ScoreRing score={pct} size={140} label={`${pct}%`} />
      <h1 className="mt-8 text-center text-xl font-bold text-foreground">Analisando suas respostas</h1>
      {/* Lista num cartão centralizado: os itens ficam alinhados entre si e o bloco, alinhado ao anel e ao título */}
      <ul className="mt-5 w-full max-w-[17.5rem] space-y-3 rounded-2xl border border-border/60 bg-card/60 px-5 py-4">
        {ANALYSIS_LINES.map((line, i) => {
          const ok = reduceMotion || i < done;
          return (
            <li key={line} className={cn("flex items-center gap-3 text-sm transition-colors", ok ? "text-foreground" : "text-muted-foreground/50")}>
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  ok ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30",
                )}
              >
                {ok && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              {line}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Sobe de 0 até `to` desacelerando no fim; com "reduzir movimento", já mostra o valor final */
function useCountUp(to: number, duration = 1100): number {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(reduceMotion ? to : 0);
  useEffect(() => {
    if (reduceMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sem animação, o valor final vem direto
      setValue(to);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, duration, reduceMotion]);
  return value;
}

function CountUp({ to, decimals = 0, prefix = "", suffix = "" }: { to: number; decimals?: number; prefix?: string; suffix?: string }) {
  const value = useCountUp(to);
  const text = value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <span className="tabular" aria-label={`${prefix}${to.toLocaleString("pt-BR", { maximumFractionDigits: decimals })}${suffix}`}>
      {prefix}
      {text}
      {suffix}
    </span>
  );
}

/** Litros com a vírgula do pt-BR, subindo junto com a barra */
function CountLiters({ ml }: { ml: number }) {
  return <CountUp to={ml / 1000} decimals={1} suffix=" L" />;
}

/** Anel da nota: enche junto com o número (sem `animate`, fica parado no valor) */
function ScoreRing({ score, size, label, animate }: { score: number; size: number; label?: string; animate?: boolean }) {
  const counted = useCountUp(animate ? score : 0);
  const shown = animate ? counted : score;
  const stroke = Math.max(6, size / 14);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn("stroke-primary", !animate && "transition-[stroke-dashoffset] duration-500")}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.max(0, Math.min(100, shown)) / 100)}
        />
      </svg>
      <span
        className="tabular absolute inset-0 flex items-center justify-center font-bold text-foreground"
        style={{ fontSize: size / 4 }}
        aria-label={label ?? String(score)}
      >
        {label ?? Math.round(shown)}
      </span>
    </div>
  );
}

function scoreTone(score: number) {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-400";
  return "bg-rose-500";
}

function Result({
  result,
  answers,
  plans,
  trialDays,
  onRestart,
}: {
  result: DiagnosticResult;
  answers: Answers;
  plans: Plan[];
  trialDays: number;
  onRestart: () => void;
}) {
  const sortedAreas = [...result.areas].sort((a, b) => a.score - b.score);
  const pitch = BLOQUEIO_PITCH[answers.bloqueio ?? ""];
  const conditions = selectedConditions(answers);

  return (
    <div className="pb-10">
      <header className="flex items-center gap-5 pt-4">
        <ScoreRing score={result.score} size={104} animate />
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">Fase · {result.phase.name}</p>
          <h1 className="mt-1 text-2xl leading-tight font-bold text-foreground">
            {result.name}, sua nota é {result.score} de 100
          </h1>
        </div>
      </header>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">{result.phase.text}</p>

      <section className="mt-8" aria-labelledby="dx-areas">
        <h2 id="dx-areas" className="text-lg font-bold text-foreground">
          Sua nota em cada área
        </h2>
        <ul className="mt-4 space-y-3.5">
          {sortedAreas.map((a) => (
            <li key={a.key}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{a.label}</span>
                <span className="tabular font-semibold text-foreground">{a.score}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", scoreTone(a.score))} style={{ width: `${Math.max(4, a.score)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8" aria-labelledby="dx-numeros">
        <h2 id="dx-numeros" className="text-lg font-bold text-foreground">
          Seus números
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { value: formatLitersShort(result.waterTargetMl), label: "de água por dia" },
            { value: `~${result.kcalTarget.toLocaleString("pt-BR")}`, label: "kcal por dia (estimativa)" },
            { value: `~${result.proteinG} g`, label: "de proteína por dia" },
            { value: `${result.trainingDays}x`, label: "treinos por semana" },
          ].map((n) => (
            <div key={n.label} className="rounded-2xl border border-border/60 bg-card p-4">
              <p className="tabular text-2xl font-bold text-foreground">{n.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{n.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="dx-plano">
        <h2 id="dx-plano" className="text-lg font-bold text-foreground">
          Seu plano começa por aqui
        </h2>
        <ol className="mt-4 space-y-3">
          {result.focus.map((area, i) => {
            const s = planStep(area, result);
            return (
              <li key={area} className="flex gap-3 rounded-2xl border border-border/60 bg-card p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">{s.title}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{s.text}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {conditions.length > 0 && (
        <section className="mt-8 rounded-2xl border border-amber-400/40 bg-amber-400/5 p-4" aria-labelledby="dx-cuidados">
          <h2 id="dx-cuidados" className="text-base font-bold text-foreground">
            Cuidados com o seu corpo
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Você marcou: {conditions.map((c) => c.label).join("; ")}.
          </p>
          <p className="mt-2 text-sm text-foreground/90">
            Conte isso ao Théo quando ele for montar seu treino: ele troca ou adapta os exercícios que forçam essas
            regiões e ajusta a carga com calma.
          </p>
          {needsMedicalClearance(conditions) && (
            <p className="mt-2 text-sm font-medium text-amber-300">
              Antes de começar, converse com seu médico e peça liberação para treinar.
            </p>
          )}
        </section>
      )}

      <section className="mt-10 rounded-3xl border border-primary/30 bg-primary/5 p-5" aria-labelledby="dx-oferta">
        <div className="mb-4 flex items-center gap-3">
          <Image
            src="/ai-coach-avatar.png"
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-full ring-2 ring-primary/30"
          />
          <h2 id="dx-oferta" className="text-lg leading-snug font-bold text-foreground">
            O Théo coloca esse plano em prática com você
          </h2>
        </div>
        {pitch && <p className="mb-5 text-sm leading-relaxed text-foreground/90">{pitch}</p>}
        <PlanCards plans={plans} mode="trial" trialDays={trialDays} signupHref="/cadastro?origem=diagnostico" />
      </section>

      <div className="mt-6 flex flex-col items-center gap-2 text-sm">
        <Link href="/login" className="text-muted-foreground hover:text-foreground">
          Já tenho conta
        </Link>
        <button type="button" onClick={onRestart} className="text-muted-foreground hover:text-foreground">
          Refazer o diagnóstico
        </button>
      </div>
    </div>
  );
}
