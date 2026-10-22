"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Lightbulb, Link2, Undo2, X, Zap } from "lucide-react";
import { PhotoIcon, StartIcon, GoalIcon, PrIcon } from "@/components/ui/app-icon";
import { Card } from "@/components/ui/card";
import { BadgeIcon } from "@/components/profile/badge-icon";
import { Confetti } from "@/components/gamification/confetti";
import { ExerciseDemo } from "@/components/workout/exercise-demo";
import { Button } from "@/components/ui/button";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import { MUSCLE_GROUP_COLOR } from "@/lib/muscle-colors";
import type { MuscleGroup } from "@/lib/types";
import { usePreferences } from "@/lib/preferences";
import { supersetLabel, techniqueInfo, toExerciseBlocks } from "@/lib/training-methods";
import { cn } from "@/lib/utils";
import { getExerciseTips } from "@/lib/exercise-tips";
import {
  logSetAction,
  undoSetAction,
  uploadSessionPhotoAction,
  finishWorkoutAction,
  discardSessionAction,
} from "@/app/actions/session-actions";

interface ExerciseVM {
  id: string;
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  rest_time: number;
  notes: string | null;
  superset_group?: number | null;
  technique?: string | null;
}

interface LoggedSetVM {
  id: string;
  set_number: number;
  weight: number;
  reps: number;
}

/** Série da última sessão em que o exercício foi feito */
export interface PreviousSetVM {
  set_number: number;
  weight: number;
  reps: number;
}

const PR_LABEL: Record<string, string> = {
  carga: "Carga",
  repeticoes: "Repetições",
  "1rm": "1RM estimado",
  volume: "Volume",
};

const REST_EXTENSION_SECONDS = 30;

function formatKg(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Valores iniciais da próxima série: o que já foi feito nesta sessão,
 * senão a primeira série da última vez, senão carga zero e o mínimo de repetições.
 */
function prefillFor(exercise: ExerciseVM, logged: LoggedSetVM[], previous: PreviousSetVM[] | undefined) {
  const last = logged.at(-1);
  if (last) return { weight: last.weight, reps: last.reps };
  const first = previous?.find((s) => s.set_number === 1) ?? previous?.[0];
  return { weight: first?.weight ?? 0, reps: first?.reps ?? exercise.target_reps_min };
}

/**
 * Para onde ir depois de registrar uma série. Exercício sozinho: fica e descansa. Conjugado: segue
 * sem descanso para o próximo da volta; no fim da volta, descansa e recomeça pelo primeiro que falta.
 */
function stepAfterSet(block: number[], current: number, isDone: (i: number) => boolean, blockRest: number) {
  if (block.length === 1) return { nextIndex: current, restSeconds: blockRest };
  const laterInRound = block.slice(block.indexOf(current) + 1).find((i) => !isDone(i));
  if (laterInRound !== undefined) return { nextIndex: laterInRound, restSeconds: 0 };
  return { nextIndex: block.find((i) => !isDone(i)) ?? current, restSeconds: blockRest };
}

/**
 * Descanso contado a partir de agora. Fica fora do componente porque o compilador do React não
 * acompanha o caminho do conjugado e acha que o relógio é lido durante a renderização; só roda após registrar uma série.
 */
function restFromNow(seconds: number) {
  const now = Date.now();
  return { now, rest: seconds > 0 ? { endsAt: now + seconds * 1000, total: seconds } : null };
}

/** Vibração e dois bipes curtos, conforme as preferências. O AudioContext é criado num toque do usuário (exigência do iOS). */
function alertRestOver(audio: AudioContext | null, { sound, vibration }: { sound: boolean; vibration: boolean }) {
  if (vibration && "vibrate" in navigator) navigator.vibrate([200, 100, 200]);
  if (!sound || !audio) return;
  const start = audio.currentTime;
  for (const offset of [0, 0.25]) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(0.25, start + offset + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.18);
    osc.connect(gain).connect(audio.destination);
    osc.start(start + offset);
    osc.stop(start + offset + 0.2);
  }
}

/** Mantém a tela acesa durante o treino; o navegador solta a trava ao esconder a aba, então ela é pedida de novo ao voltar. */
function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire() {
      if (document.visibilityState !== "visible") return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) void next.release();
        else sentinel = next;
      } catch {
        // Recusado (ex.: modo economia de energia): o treino segue normalmente
      }
    }

    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      void sentinel?.release();
    };
  }, [enabled]);
}

function NumberStepper({
  value,
  onChange,
  step,
  min,
  unit,
  label,
  integer = false,
  formatValue,
}: {
  value: number;
  onChange: (next: number) => void;
  step: number;
  min: number;
  unit: string;
  label: string;
  integer?: boolean;
  formatValue?: (n: number) => string;
}) {
  // Texto em edição; null quando o campo não está focado
  const [draft, setDraft] = useState<string | null>(null);
  const display = formatValue ? formatValue(value) : String(value);
  const round = (n: number) => (integer ? Math.round(n) : Math.round(n * 10) / 10);

  function commit(raw: string) {
    const parsed = Number(raw.replace(",", ".").trim());
    if (raw.trim() !== "" && Number.isFinite(parsed)) onChange(Math.max(min, round(parsed)));
    setDraft(null);
  }

  return (
    <div className="flex items-center justify-between gap-1 rounded-2xl bg-muted px-2 py-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, round(value - step)))}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-xl font-semibold text-foreground active:scale-95"
        aria-label={`Diminuir ${unit}`}
      >
        −
      </button>
      <label className="min-w-0 flex-1 text-center">
        <input
          type="text"
          inputMode={integer ? "numeric" : "decimal"}
          enterKeyHint="done"
          aria-label={label}
          value={draft ?? display}
          onFocus={(e) => {
            setDraft(display);
            e.target.select();
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="tabular w-full bg-transparent text-center text-[22px] leading-none font-bold text-foreground outline-none"
        />
        <span className="mt-1 block text-[11px] text-muted-foreground">{unit}</span>
      </label>
      <button
        type="button"
        onClick={() => onChange(round(value + step))}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-xl font-semibold text-foreground active:scale-95"
        aria-label={`Aumentar ${unit}`}
      >
        +
      </button>
    </div>
  );
}

export function WorkoutExecutor({
  sessionId,
  workoutName,
  startedAt,
  exercises,
  initialSets,
  previousSets,
}: {
  sessionId: string;
  workoutName: string;
  startedAt: string;
  exercises: ExerciseVM[];
  initialSets: { id: string; exercise_id: string; set_number: number; weight: number; reps: number }[];
  previousSets: Record<string, PreviousSetVM[]>;
}) {
  const [index, setIndex] = useState(0);
  const [showTips, setShowTips] = useState(false);
  const [loggedByExercise, setLoggedByExercise] = useState<Record<string, LoggedSetVM[]>>(() => {
    const grouped: Record<string, LoggedSetVM[]> = {};
    for (const set of initialSets) {
      (grouped[set.exercise_id] ??= []).push({
        id: set.id,
        set_number: set.set_number,
        weight: set.weight,
        reps: set.reps,
      });
    }
    return grouped;
  });
  const [weight, setWeight] = useState(
    () => prefillFor(exercises[0], loggedByExercise[exercises[0].exercise_id] ?? [], previousSets[exercises[0].exercise_id]).weight
  );
  const [reps, setReps] = useState(
    () => prefillFor(exercises[0], loggedByExercise[exercises[0].exercise_id] ?? [], previousSets[exercises[0].exercise_id]).reps
  );
  const [settledIndex, setSettledIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [prBanner, setPrBanner] = useState<string[] | null>(null);
  const [totalPRs, setTotalPRs] = useState(0);
  const [goalBanner, setGoalBanner] = useState<string[] | null>(null);
  const [badgeBanner, setBadgeBanner] = useState<
    { key: string; label: string; description: string; icon?: string }[] | null
  >(null);
  const [finishing, setFinishing] = useState(false);
  // Descanso guardado como horário de término: não atrasa quando o navegador segura os timers com a tela bloqueada
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const [undoing, startUndo] = useTransition();
  const audioRef = useRef<AudioContext | null>(null);
  const prsBySetRef = useRef<Record<string, number>>({});

  const prefs = usePreferences();
  useWakeLock(prefs.keepScreenOn);

  const exercise = exercises[index];
  const nextExercise = exercises[index + 1];
  const muscleColor = MUSCLE_GROUP_COLOR[exercise.muscle_group as MuscleGroup] ?? "var(--muted-foreground)";
  const loggedSets = loggedByExercise[exercise.exercise_id] ?? [];
  const previous = previousSets[exercise.exercise_id];
  const previousForNextSet = previous?.find((s) => s.set_number === loggedSets.length + 1);
  const isLastExercise = index === exercises.length - 1;
  const targetDone = loggedSets.length >= exercise.target_sets;
  const technique = techniqueInfo(exercise.technique);
  const tips = getExerciseTips(exercise.exercise_id);

  // Conjugados como listas de índices; exercício sozinho é um bloco de 1
  const blocks = useMemo(
    () =>
      toExerciseBlocks(exercises.map((e, i) => ({ superset_group: e.superset_group ?? null, index: i }))).map((b) =>
        b.map((x) => x.index),
      ),
    [exercises],
  );
  const block = blocks.find((b) => b.includes(index)) ?? [index];
  const inSuperset = block.length > 1;
  const positionInBlock = block.indexOf(index);
  const blockRest = exercises[block.at(-1)!].rest_time;
  const isDone = (i: number) => (loggedByExercise[exercises[i].exercise_id]?.length ?? 0) >= exercises[i].target_sets;
  const blockDone = block.every((i) => isDone(i));
  const nextInBlock = block.slice(positionInBlock + 1).find((i) => !isDone(i)) ?? block.find((i) => i !== index && !isDone(i));
  const afterBlock = exercises[block.at(-1)! + 1];

  if (index !== settledIndex) {
    setSettledIndex(index);
    const next = prefillFor(exercise, loggedByExercise[exercise.exercise_id] ?? [], previous);
    setWeight(next.weight);
    setReps(next.reps);
  }

  useEffect(() => {
    if (!rest) return;
    const timer = setInterval(() => {
      const t = Date.now();
      if (t >= rest.endsAt) {
        setRest(null);
        alertRestOver(audioRef.current, { sound: prefs.restSound, vibration: prefs.restVibration });
      } else {
        setNow(t);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [rest, prefs.restSound, prefs.restVibration]);

  const [elapsed, setElapsed] = useState(() => Math.max(0, Date.now() - new Date(startedAt).getTime()));
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.max(0, Date.now() - new Date(startedAt).getTime()));
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  useEffect(() => {
    if (!prBanner) return;
    const timeout = setTimeout(() => setPrBanner(null), 5000);
    return () => clearTimeout(timeout);
  }, [prBanner]);

  useEffect(() => {
    if (!goalBanner) return;
    const timeout = setTimeout(() => setGoalBanner(null), 6000);
    return () => clearTimeout(timeout);
  }, [goalBanner]);

  useEffect(() => {
    if (!badgeBanner) return;
    const timeout = setTimeout(() => setBadgeBanner(null), 6000);
    return () => clearTimeout(timeout);
  }, [badgeBanner]);

  useEffect(() => () => void audioRef.current?.close(), []);

  function formatElapsed(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  function formatRest(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes}:${rest.toString().padStart(2, "0")}`;
  }

  function primeAudio() {
    try {
      audioRef.current ??= new AudioContext();
      void audioRef.current.resume();
    } catch {
      // Sem Web Audio: o aviso fica só na vibração
    }
  }

  function startRest(seconds: number) {
    const next = restFromNow(seconds);
    setNow(next.now);
    setRest(next.rest);
  }

  function handleLogSet() {
    setError(null);
    if (reps < 1) {
      setError("Informe as repetições feitas.");
      return;
    }
    primeAudio();

    startTransition(async () => {
      const result = await logSetAction({
        sessionId,
        exerciseId: exercise.exercise_id,
        setNumber: loggedSets.length + 1,
        weight,
        reps,
      });
      if (result.error || !result.id) {
        setError(result.error ?? "Não foi possível salvar a série. Tente novamente.");
        return;
      }
      const setId = result.id;
      setLoggedByExercise((prev) => ({
        ...prev,
        [exercise.exercise_id]: [
          ...(prev[exercise.exercise_id] ?? []),
          // O servidor numera a série; a contagem local é só para worker antigo
          { id: setId, set_number: result.setNumber ?? loggedSets.length + 1, weight, reps },
        ],
      }));
      // Conta a série recém-registrada (o estado ainda não atualizou)
      const doneAfterThisSet = (i: number) =>
        (loggedByExercise[exercises[i].exercise_id]?.length ?? 0) + (i === index ? 1 : 0) >= exercises[i].target_sets;
      const step = stepAfterSet(block, index, doneAfterThisSet, blockRest);
      startRest(step.restSeconds);
      if (step.nextIndex !== index) setIndex(step.nextIndex);
      if (result.newPRs && result.newPRs.length > 0) {
        prsBySetRef.current[setId] = result.newPRs.length;
        setTotalPRs((n) => n + result.newPRs!.length);
        setPrBanner(result.newPRs.map((pr) => `${PR_LABEL[pr.type] ?? pr.type}: ${pr.weight}kg × ${pr.reps}`));
        // Recorde é o momento de comemorar: vibração longa além do confete
        if ("vibrate" in navigator) navigator.vibrate([40, 60, 40, 60, 120]);
      }
      if (result.newGoals && result.newGoals.length > 0) {
        setGoalBanner(
          result.newGoals.map((g) => `${g.exerciseName}: ${g.targetWeight}kg alcançados`)
        );
      }
      if (result.newBadges && result.newBadges.length > 0) {
        setBadgeBanner(
          result.newBadges.map((b) => ({ key: b.key, label: b.label, description: b.description, icon: b.icon }))
        );
      }
    });
  }

  function handleUndoLastSet() {
    const last = loggedSets.at(-1);
    if (!last) return;
    setError(null);

    startUndo(async () => {
      const result = await undoSetAction(sessionId, last.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setLoggedByExercise((prev) => ({
        ...prev,
        [exercise.exercise_id]: (prev[exercise.exercise_id] ?? []).filter((s) => s.id !== last.id),
      }));
      setTotalPRs((n) => Math.max(0, n - (prsBySetRef.current[last.id] ?? 0)));
      delete prsBySetRef.current[last.id];
      // Volta os valores da série desfeita para o stepper: o caso comum é corrigir um número
      setWeight(last.weight);
      setReps(last.reps);
      setRest(null);
      setPrBanner(null);
    });
  }

  function goTo(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= exercises.length) return;
    setError(null);
    setRest(null);
    setIndex(nextIndex);
  }

  function openFinish() {
    setRest(null);
    setFinishing(true);
  }

  if (finishing) {
    const totalSetsLogged = Object.values(loggedByExercise).reduce((sum, arr) => sum + arr.length, 0);
    return (
      <FinishPanel
        sessionId={sessionId}
        elapsedSeconds={Math.floor(elapsed / 1000)}
        totalSets={totalSetsLogged}
        totalPRs={totalPRs}
        onBack={() => setFinishing(false)}
      />
    );
  }

  const restRemaining = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : null;
  const restPct = rest && restRemaining !== null ? Math.min(100, (restRemaining / rest.total) * 100) : 0;
  const filledDots = Math.min(exercise.target_sets, loggedSets.length);

  return (
    <div>
      <Confetti fireKey={prBanner ? prBanner.join("|") : null} />
      {/* Avisos de conquista por cima do conteúdo, para não empurrar o botão de registrar */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-50 mx-auto max-w-md space-y-2 px-4 pt-[calc(env(safe-area-inset-top)+12px)] sm:max-w-lg"
      >
        <AnimatePresence>
          {prBanner && (
            <Toast key="pr" onDismiss={() => setPrBanner(null)} tint="var(--gold)">
              <PrIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <div className="space-y-0.5">
                <p className="font-bold text-gold">Novo recorde pessoal!</p>
                {prBanner.map((line) => (
                  <p key={line} className="text-foreground">{line}</p>
                ))}
              </div>
            </Toast>
          )}
          {goalBanner && (
            <Toast key="goal" onDismiss={() => setGoalBanner(null)} tint="var(--primary)">
              <GoalIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="space-y-0.5">
                <p className="font-bold text-primary">Meta batida! 🎯</p>
                {goalBanner.map((line) => (
                  <p key={line} className="text-foreground">{line}</p>
                ))}
              </div>
            </Toast>
          )}
          {badgeBanner && (
            <Toast key="badge" onDismiss={() => setBadgeBanner(null)} tint="var(--accent)">
              <BadgeIcon badgeKey={badgeBanner[0].key} icon={badgeBanner[0].icon} unlocked size={52} />
              <div className="space-y-0.5">
                <p className="font-bold text-accent">Conquista desbloqueada!</p>
                {badgeBanner.map((b) => (
                  <p key={b.label} className="text-foreground">
                    <span className="font-semibold">{b.label}</span> — {b.description}
                  </p>
                ))}
              </div>
            </Toast>
          )}
        </AnimatePresence>
      </div>

      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{workoutName}</p>
          <p className="tabular text-[30px] leading-none font-bold tracking-tight text-foreground">
            {formatElapsed(elapsed)}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-full px-5 text-sm font-semibold"
          onClick={openFinish}
        >
          Finalizar
        </Button>
      </div>

      <div className="mb-1.5 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 rounded-full"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          aria-label="Exercício anterior"
        >
          <ChevronLeft className="h-[18px] w-[18px]" />
        </Button>
        <p className="text-xs font-semibold text-muted-foreground">
          Exercício {index + 1} de {exercises.length}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 rounded-full"
          onClick={() => goTo(index + 1)}
          disabled={isLastExercise}
          aria-label="Próximo exercício"
        >
          <ChevronRight className="h-[18px] w-[18px]" />
        </Button>
      </div>
      {/* Um segmento por exercício: verde quando as séries-alvo foram feitas, destacado o atual; toque leva até ele */}
      <div className="mb-4 flex gap-1" role="group" aria-label="Exercícios do treino">
        {exercises.map((ex, i) => {
          const done = (loggedByExercise[ex.exercise_id]?.length ?? 0) >= ex.target_sets;
          const started = (loggedByExercise[ex.exercise_id]?.length ?? 0) > 0;
          const current = i === index;
          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Exercício ${i + 1}: ${ex.exercise_name}${done ? ", concluído" : ""}`}
              aria-current={current ? "step" : undefined}
              className="flex h-5 flex-1 items-center"
            >
              <span
                className={cn(
                  "h-1.5 w-full rounded-full transition-colors",
                  done ? "bg-primary" : started ? "bg-primary/45" : "bg-muted",
                  current && "ring-2 ring-foreground/70 ring-offset-2 ring-offset-background",
                )}
              />
            </button>
          );
        })}
      </div>

      {rest && restRemaining !== null && (
        <div
          role="timer"
          aria-label="Tempo de descanso"
          className="mb-4 flex items-center gap-3 rounded-2xl p-3"
          style={{ background: "color-mix(in oklch, var(--primary), transparent 88%)" }}
        >
          <div
            className="relative h-12 w-12 shrink-0 rounded-full"
            style={{ background: `conic-gradient(var(--primary) ${restPct}%, var(--muted) ${restPct}% 100%)` }}
          >
            <div className="absolute inset-[3px] flex items-center justify-center rounded-full bg-background">
              <span className="tabular text-xs font-bold text-foreground">{formatRest(restRemaining)}</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Descansando</p>
            <p className="text-xs text-muted-foreground">
              {prefs.restSound && prefs.restVibration
                ? "Vibra e toca quando acabar"
                : prefs.restSound
                  ? "Toca quando acabar"
                  : prefs.restVibration
                    ? "Vibra quando acabar"
                    : "Aviso desligado nas preferências"}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-full bg-muted px-3 text-xs font-semibold text-foreground hover:bg-muted/70"
            onClick={() =>
              setRest((r) =>
                r ? { endsAt: r.endsAt + REST_EXTENSION_SECONDS * 1000, total: r.total + REST_EXTENSION_SECONDS } : r
              )
            }
          >
            +{REST_EXTENSION_SECONDS}s
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-full bg-muted px-3 text-xs font-semibold text-foreground hover:bg-muted/70"
            onClick={() => setRest(null)}
          >
            Pular
          </Button>
        </div>
      )}

      <Card className="relative gap-4 overflow-hidden p-[18px]">
        <div className="flex items-start justify-between gap-2.5">
          <div>
            <p className="text-xs font-semibold" style={{ color: muscleColor }}>
              {MUSCLE_GROUP_LABEL[exercise.muscle_group as MuscleGroup] ?? exercise.muscle_group}
            </p>
            <h1 className="mt-0.5 text-xl leading-tight font-bold text-foreground">{exercise.exercise_name}</h1>
          </div>
          {/* Contador de séries que vai enchendo; verde quando bate o alvo */}
          <span
            className={cn(
              "tabular mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
              targetDone ? "bg-primary/15 text-primary" : "bg-muted text-foreground/85",
            )}
          >
            {filledDots} de {exercise.target_sets} séries
          </span>
        </div>

        <div className="-mt-2">
          {/* Alvo em pílulas; "12 reps" quando mínimo e máximo são iguais, descanso em minutos */}
          <ul className="flex flex-wrap gap-1.5" aria-label="Alvo do exercício">
            {[
              `${exercise.target_sets} séries`,
              exercise.target_reps_min === exercise.target_reps_max
                ? `${exercise.target_reps_min} reps`
                : `${exercise.target_reps_min}–${exercise.target_reps_max} reps`,
              inSuperset ? `Descanso ${formatRest(blockRest)} ao fim da volta` : `Descanso ${formatRest(exercise.rest_time)}`,
            ].map((label) => (
              <li
                key={label}
                className="tabular rounded-full bg-muted/70 px-2.5 py-1 text-xs font-medium text-foreground/85"
              >
                {label}
              </li>
            ))}
          </ul>
          {inSuperset && (
            <div className="mt-2.5 rounded-xl bg-primary/10 px-3 py-2 text-xs">
              <p className="flex items-center gap-1.5 font-semibold text-primary">
                <Link2 className="h-3.5 w-3.5" />
                {supersetLabel(block.length)} · {positionInBlock + 1} de {block.length}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                {blockDone
                  ? "Conjugado concluído."
                  : nextInBlock !== undefined && nextInBlock > index
                    ? `Depois: ${exercises[nextInBlock].exercise_name}, sem descanso.`
                    : `Fim da volta: descanse ${blockRest}s.`}
              </p>
            </div>
          )}
          {technique && (
            <div className="mt-2.5 rounded-xl bg-accent/10 px-3 py-2 text-xs">
              <p className="flex items-center gap-1.5 font-semibold text-accent">
                <Zap className="h-3.5 w-3.5" />
                {technique.label}
              </p>
              <p className="mt-0.5 leading-relaxed text-muted-foreground">{technique.hint}</p>
            </div>
          )}
          {exercise.notes && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground italic">{exercise.notes}</p>
          )}
        </div>

        <ExerciseDemo
          key={exercise.exercise_id}
          exerciseId={exercise.exercise_id}
          exerciseName={exercise.exercise_name}
        />

        {/* Dicas de execução do catálogo; fica aberto ou fechado para os próximos exercícios também */}
        {tips && (
          <div className="-mt-1 rounded-2xl bg-muted/40">
            <button
              type="button"
              onClick={() => setShowTips((open) => !open)}
              aria-expanded={showTips}
              className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-semibold text-foreground"
            >
              <span className="inline-flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" aria-hidden />
                Como fazer
              </span>
              <ChevronDown
                className={cn("h-4 w-4 text-muted-foreground transition-transform", showTips && "rotate-180")}
                aria-hidden
              />
            </button>
            {showTips && (
              <ol className="space-y-2 px-3.5 pb-3">
                {tips.map((tip, i) => (
                  <li key={tip} className="flex gap-2.5 text-sm leading-relaxed text-foreground/85">
                    <span className="tabular mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background text-[11px] font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    {tip}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {loggedSets.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {loggedSets.map((set, i) => {
              const isLast = i === loggedSets.length - 1;
              return (
                <div
                  key={set.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2 text-foreground">
                    <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
                    Série {set.set_number}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular text-muted-foreground">
                      {formatKg(set.weight)}kg × {set.reps}
                    </span>
                    {isLast && (
                      <button
                        type="button"
                        onClick={handleUndoLastSet}
                        disabled={undoing || pending}
                        className="-my-1 flex h-8 items-center gap-1 rounded-full px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-foreground disabled:opacity-40"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                        {undoing ? "Desfazendo…" : "Desfazer"}
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {targetDone ? "Série extra" : `Série ${loggedSets.length + 1}`}
            </p>
            {previousForNextSet && (
              <p className="tabular truncate text-xs text-muted-foreground">
                Última vez: {formatKg(previousForNextSet.weight)}kg × {previousForNextSet.reps}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <NumberStepper
              value={weight}
              onChange={setWeight}
              step={prefs.weightStep}
              min={0}
              unit="kg"
              label="Carga em kg"
              formatValue={formatKg}
            />
            <NumberStepper value={reps} onChange={setReps} step={1} min={0} unit="reps" label="Repetições" integer />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="button"
          variant={targetDone ? "outline" : "default"}
          className="h-[50px] w-full text-base font-bold"
          onClick={handleLogSet}
          disabled={pending || undoing}
        >
          {pending ? "Salvando…" : targetDone ? "Registrar série extra" : `Registrar série ${loggedSets.length + 1}`}
        </Button>
      </Card>

      {inSuperset && blockDone ? (
        <Button
          type="button"
          className="mt-3 h-[52px] w-full gap-1.5 text-base font-bold"
          onClick={() => (afterBlock ? goTo(block.at(-1)! + 1) : openFinish())}
        >
          <span className="truncate">{afterBlock ? `Próximo: ${afterBlock.exercise_name}` : "Finalizar treino"}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      ) : inSuperset && targetDone && nextInBlock !== undefined ? (
        <Button
          type="button"
          className="mt-3 h-[52px] w-full gap-1.5 text-base font-bold"
          onClick={() => goTo(nextInBlock)}
        >
          <span className="truncate">Continuar: {exercises[nextInBlock].exercise_name}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      ) : targetDone ? (
        <Button
          type="button"
          className="mt-3 h-[52px] w-full gap-1.5 text-base font-bold"
          onClick={() => (nextExercise ? goTo(index + 1) : openFinish())}
        >
          <span className="truncate">{nextExercise ? `Próximo: ${nextExercise.exercise_name}` : "Finalizar treino"}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      ) : (
        !isLastExercise && (
          <Button
            type="button"
            variant="ghost"
            className="mt-3 h-11 w-full gap-1.5 text-muted-foreground"
            onClick={() => goTo(index + 1)}
          >
            Pular para o próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        )
      )}
    </div>
  );
}

function Toast({ tint, onDismiss, children }: { tint: string; onDismiss: () => void; children: React.ReactNode }) {
  return (
    // Toque fecha antes do tempo; sem foco de teclado porque some sozinho em poucos segundos
    <motion.div
      role="status"
      layout
      initial={{ opacity: 0, y: -16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      onClick={onDismiss}
      className="pointer-events-auto flex w-full cursor-pointer items-start gap-2 rounded-2xl p-3 text-left text-sm"
      style={{
        background: `color-mix(in oklch, ${tint} 16%, var(--card))`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${tint}, transparent 60%), 0 18px 40px -20px rgb(0 0 0 / 0.8)`,
      }}
    >
      {children}
    </motion.div>
  );
}

function FinishPanel({
  sessionId,
  elapsedSeconds,
  totalSets,
  totalPRs,
  onBack,
}: {
  sessionId: string;
  elapsedSeconds: number;
  totalSets: number;
  totalPRs: number;
  onBack: () => void;
}) {
  const router = useRouter();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhotoFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  function handleFinish() {
    setError(null);
    startTransition(async () => {
      if (photoFile) {
        const formData = new FormData();
        formData.set("photo", photoFile);
        const result = await uploadSessionPhotoAction(sessionId, formData);
        if (result.error) {
          setError(result.error);
          return;
        }
      }
      await finishWorkoutAction(sessionId, elapsedSeconds);
    });
  }

  function handleDiscard() {
    startTransition(async () => {
      await discardSessionAction(sessionId);
      router.push("/");
    });
  }

  function formatDuration(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes}:${rest.toString().padStart(2, "0")}`;
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar ao treino"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground"
        >
          <ChevronLeft className="h-[18px] w-[18px]" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Finalizar treino</h1>
      </div>

      <div className="mb-5 flex rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex-1 text-center">
          <p className="tabular text-[19px] font-bold text-foreground">{formatDuration(elapsedSeconds)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Duração</p>
        </div>
        <div className="mx-2 w-px bg-border" />
        <div className="flex-1 text-center">
          <p className="tabular text-[19px] font-bold text-foreground">{totalSets}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{totalSets === 1 ? "Série" : "Séries"}</p>
        </div>
        <div className="mx-2 w-px bg-border" />
        <div className="flex flex-1 flex-col items-center text-center">
          <span className="flex items-center gap-1">
            <PrIcon className="h-4 w-4 text-gold" />
            <span className="tabular text-[19px] font-bold text-gold">{totalPRs}</span>
          </span>
          <p className="mt-0.5 text-xs text-muted-foreground">{totalPRs === 1 ? "PR novo" : "PRs novos"}</p>
        </div>
      </div>

      {totalSets === 0 ? (
        // Concluir sem séries contaria um treino vazio na constância e nas estatísticas
        <Card className="gap-4 p-[18px]">
          <div>
            <p className="text-[15px] font-semibold text-foreground">Nenhuma série registrada</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Volte e registre o que fez, ou descarte esta sessão se começou o treino por engano.
            </p>
          </div>
          <Button type="button" className="h-[52px] w-full text-base font-bold" onClick={onBack} disabled={pending}>
            Voltar ao treino
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full text-destructive hover:text-destructive"
            onClick={handleDiscard}
            disabled={pending}
          >
            {pending ? "Descartando…" : "Descartar treino"}
          </Button>
        </Card>
      ) : (
        <Card className="gap-4 p-[18px]">
          <div>
            <p className="text-[15px] font-semibold text-foreground">Registrar uma foto</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Opcional — guarde o resultado, o local ou como você está se sentindo hoje.
            </p>
          </div>

          {previewUrl ? (
            <div className="relative overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Prévia da foto do treino" className="max-h-80 w-full object-cover" />
              <button
                type="button"
                aria-label="Remover foto"
                onClick={() => {
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPhotoFile(null);
                  setPreviewUrl(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute top-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-border py-9 text-center transition-colors hover:bg-muted/40">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: "color-mix(in oklch, var(--primary), transparent 85%)" }}
              >
                <PhotoIcon className="h-[22px] w-[22px] text-primary" strokeWidth={1.75} />
              </div>
              <span className="text-sm font-semibold text-foreground">Tirar ou escolher uma foto</span>
              <span className="text-xs text-muted-foreground">JPEG, PNG ou WebP · até 8MB</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="button"
            className="h-[52px] w-full gap-2 text-base font-bold"
            onClick={handleFinish}
            disabled={pending}
          >
            <StartIcon className="h-4 w-4" />
            {pending ? "Salvando…" : "Concluir treino"}
          </Button>
        </Card>
      )}
    </div>
  );
}
