"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Lock, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlanCards } from "@/components/billing/plan-cards";
import { saveLeadAction } from "@/app/actions/billing-actions";
import {
  BLOQUEIO_PITCH,
  GLASSES_MAX,
  GLASS_ML,
  STEPS,
  computeResult,
  formatLitersShort,
  formatWhatsapp,
  planStep,
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

  const offset = reduceMotion ? 0 : 40;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-5 sm:max-w-lg">
      {view !== "intro" && view !== "resultado" && (
        <Header
          onBack={view === "analise" ? undefined : back}
          current={view === "quiz" ? index + 1 : STEPS.length}
          total={STEPS.length}
          reduceMotion={!!reduceMotion}
        />
      )}

      {view === "intro" && <Intro onStart={() => setView("quiz")} hasProgress={index > 0} onRestart={restart} />}

      {view === "quiz" && (
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * offset }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -offset }}
            transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: "easeOut" }}
            className="flex flex-1 flex-col"
          >
            <StepView step={step} answers={answers} onAnswer={answer} />
            {error && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            )}
            {step.kind !== "single" && (
              <div className="mt-auto pt-6">
                <Button type="button" size="lg" className="h-12 w-full gap-2 text-base font-semibold" onClick={next}>
                  Continuar
                  <ArrowRight className="h-4 w-4" />
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
            <Button type="submit" size="lg" className="h-12 w-full gap-2 text-base font-semibold" disabled={saving}>
              {saving ? "Liberando…" : "Ver meu diagnóstico"}
              {!saving && <ArrowRight className="h-4 w-4" />}
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

function Intro({ onStart, hasProgress, onRestart }: { onStart: () => void; hasProgress: boolean; onRestart: () => void }) {
  return (
    <div className="flex flex-1 flex-col justify-center py-6">
      <Image src="/logo.png" alt="Treinai" width={120} height={32} className="mb-10 h-8 w-auto self-start" priority />
      <p className="text-xs font-semibold tracking-wide text-primary uppercase">Diagnóstico grátis</p>
      <h1 className="mt-2 text-3xl leading-tight font-bold tracking-[-0.02em] text-balance text-foreground">
        O que está travando a sua evolução?
      </h1>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
        Perguntas rápidas sobre treino, constância, sono, alimentação e água. No fim, você vê sua nota de 0 a 100 em
        cada área e um plano pra começar.
      </p>
      <div className="mt-8 flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4">
        <Image
          src="/ai-coach-avatar.png"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-full ring-1 ring-primary/30"
        />
        <p className="text-sm text-foreground/90">
          Oi, eu sou o <strong>Théo</strong>, o personal de IA do Treinai. Responde com sinceridade que eu te digo
          por onde começar.
        </p>
      </div>
      <Button type="button" size="lg" className="mt-8 h-12 w-full gap-2 text-base font-semibold" onClick={onStart}>
        {hasProgress ? "Continuar meu diagnóstico" : "Começar meu diagnóstico"}
        <ArrowRight className="h-4 w-4" />
      </Button>
      {hasProgress ? (
        <button type="button" onClick={onRestart} className="mt-3 text-sm text-muted-foreground hover:text-foreground">
          Começar do zero
        </button>
      ) : (
        <p className="mt-3 text-center text-xs text-muted-foreground">Leva uns 3 minutos. O resultado sai na hora.</p>
      )}
    </div>
  );
}

function QuestionTitle({ section, title, hint }: { section: string; title: string; hint?: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold tracking-wide text-primary uppercase">{section}</p>
      <h2 className="mt-1.5 text-xl leading-snug font-bold text-foreground">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
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
    case "single":
      return (
        <div>
          <QuestionTitle section={step.section} title={step.title} hint={step.hint} />
          <div className={cn(step.layout === "chips" ? "grid grid-cols-2 gap-2.5" : "grid gap-2.5")}>
            {step.options.map((o) => {
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

    case "name":
      return (
        <div>
          <QuestionTitle section={step.section} title={step.title} hint={step.hint} />
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
          <QuestionTitle section={step.section} title={step.title} hint={step.hint} />
          <p className="tabular text-4xl font-bold text-foreground">
            {count} <span className="text-base font-medium text-muted-foreground">{count === 1 ? "copo" : "copos"}</span>
          </p>
          <p className="text-sm text-primary">{formatLitersShort(count * GLASS_ML)} por dia</p>
          <div className="mt-5 grid grid-cols-6 gap-2">
            {Array.from({ length: GLASSES_MAX }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1} ${i === 0 ? "copo" : "copos"}`}
                onClick={() => set(i + 1 === count ? i : i + 1)}
                className={cn(
                  "h-12 rounded-b-xl rounded-t-sm border-2 transition-colors",
                  i < count ? "border-sky-400 bg-sky-400/70" : "border-border bg-transparent hover:border-muted-foreground/50",
                )}
              />
            ))}
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
          <QuestionTitle section={step.section} title={step.title} hint={step.hint} />
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
  if (id === "i_progressao") {
    const already = answers.carga === "sempre";
    return (
      <div>
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">{section}</p>
        <p className="mt-4 text-5xl font-bold text-primary">+1 rep</p>
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
        <p className="tabular mt-4 text-5xl font-bold text-primary">+385</p>
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
            <span className="tabular text-sm font-semibold text-foreground">{formatLitersShort(bar.ml)}</span>
            <div className="flex h-36 w-14 items-end overflow-hidden rounded-xl bg-muted">
              <div className={cn("w-full rounded-xl", bar.tone)} style={{ height: `${Math.min(100, (bar.ml / target) * 100)}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{bar.label}</span>
          </div>
        ))}
      </div>
      <h2 className="mt-6 text-2xl font-bold text-foreground">Sua meta: {formatLitersShort(target)} de água por dia</h2>
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
      <h1 className="mt-8 text-xl font-bold text-foreground">Analisando suas respostas</h1>
      <ul className="mt-5 w-full max-w-xs space-y-2.5">
        {ANALYSIS_LINES.map((line, i) => {
          const ok = reduceMotion || i < done;
          return (
            <li key={line} className={cn("flex items-center gap-2.5 text-sm transition-colors", ok ? "text-foreground" : "text-muted-foreground/50")}>
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border",
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

function ScoreRing({ score, size, label }: { score: number; size: number; label?: string }) {
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
          className="stroke-primary transition-[stroke-dashoffset] duration-500"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.max(0, Math.min(100, score)) / 100)}
        />
      </svg>
      <span
        className="tabular absolute inset-0 flex items-center justify-center font-bold text-foreground"
        style={{ fontSize: size / 4 }}
      >
        {label ?? score}
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

  return (
    <div className="pb-10">
      <header className="flex items-center gap-5 pt-4">
        <ScoreRing score={result.score} size={104} />
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
