"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Award, Camera, Check, ChevronLeft, ChevronRight, Play, Target, Trophy, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import { MUSCLE_GROUP_COLOR } from "@/lib/muscle-colors";
import type { MuscleGroup } from "@/lib/types";
import { logSetAction, uploadSessionPhotoAction, finishWorkoutAction } from "@/app/actions/session-actions";

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
}

interface LoggedSetVM {
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

function formatKg(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function NumberStepper({
  value,
  onChange,
  step,
  min,
  unit,
  formatValue,
}: {
  value: number;
  onChange: (next: number) => void;
  step: number;
  min: number;
  unit: string;
  formatValue?: (n: number) => string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-muted px-3 py-2.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, Math.round((value - step) * 10) / 10))}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-lg font-semibold text-foreground"
        aria-label={`Diminuir ${unit}`}
      >
        −
      </button>
      <div className="text-center">
        <p className="tabular text-[22px] leading-none font-bold text-foreground">
          {formatValue ? formatValue(value) : value}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">{unit}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.round((value + step) * 10) / 10)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-lg font-semibold text-foreground"
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
}: {
  sessionId: string;
  workoutName: string;
  startedAt: string;
  exercises: ExerciseVM[];
  initialSets: { exercise_id: string; set_number: number; weight: number; reps: number }[];
}) {
  const [index, setIndex] = useState(0);
  const [loggedByExercise, setLoggedByExercise] = useState<Record<string, LoggedSetVM[]>>(() => {
    const grouped: Record<string, LoggedSetVM[]> = {};
    for (const set of initialSets) {
      (grouped[set.exercise_id] ??= []).push({
        set_number: set.set_number,
        weight: set.weight,
        reps: set.reps,
      });
    }
    return grouped;
  });
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(exercises[0].target_reps_min);
  const [settledIndex, setSettledIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [prBanner, setPrBanner] = useState<string[] | null>(null);
  const [totalPRs, setTotalPRs] = useState(0);
  const [goalBanner, setGoalBanner] = useState<string[] | null>(null);
  const [badgeBanner, setBadgeBanner] = useState<{ label: string; description: string }[] | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const exercise = exercises[index];
  const muscleColor = MUSCLE_GROUP_COLOR[exercise.muscle_group as MuscleGroup] ?? "var(--muted-foreground)";
  const loggedSets = loggedByExercise[exercise.exercise_id] ?? [];
  const isLastExercise = index === exercises.length - 1;

  if (index !== settledIndex) {
    setSettledIndex(index);
    const sets = loggedByExercise[exercise.exercise_id] ?? [];
    const last = sets[sets.length - 1];
    setWeight(last ? last.weight : 0);
    setReps(last ? last.reps : exercise.target_reps_min);
  }

  useEffect(() => {
    if (restRemaining === null || restRemaining <= 0) return;
    const timer = setTimeout(() => setRestRemaining((r) => (r === null ? null : r - 1)), 1000);
    return () => clearTimeout(timer);
  }, [restRemaining]);

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

  function formatElapsed(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  function formatRest(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return minutes > 0 ? `${minutes}:${rest.toString().padStart(2, "0")}` : `0:${rest.toString().padStart(2, "0")}`;
  }

  function handleLogSet() {
    setError(null);
    if (reps < 1) {
      setError("Informe as repetições feitas.");
      return;
    }

    startTransition(async () => {
      const result = await logSetAction({
        sessionId,
        exerciseId: exercise.exercise_id,
        setNumber: loggedSets.length + 1,
        weight,
        reps,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setLoggedByExercise((prev) => ({
        ...prev,
        [exercise.exercise_id]: [
          ...(prev[exercise.exercise_id] ?? []),
          { set_number: loggedSets.length + 1, weight, reps },
        ],
      }));
      setRestRemaining(exercise.rest_time);
      if (result.newPRs && result.newPRs.length > 0) {
        setTotalPRs((n) => n + result.newPRs!.length);
        setPrBanner(result.newPRs.map((pr) => `${PR_LABEL[pr.type] ?? pr.type}: ${pr.weight}kg × ${pr.reps}`));
      }
      if (result.newGoals && result.newGoals.length > 0) {
        setGoalBanner(
          result.newGoals.map((g) => `${g.exerciseName}: ${g.targetWeight}kg alcançados`)
        );
      }
      if (result.newBadges && result.newBadges.length > 0) {
        setBadgeBanner(result.newBadges.map((b) => ({ label: b.label, description: b.description })));
      }
    });
  }

  function goTo(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= exercises.length) return;
    setError(null);
    setRestRemaining(null);
    setIndex(nextIndex);
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

  const restPct = restRemaining !== null ? Math.max(0, (restRemaining / exercise.rest_time) * 100) : 0;
  const filledDots = Math.min(exercise.target_sets, loggedSets.length);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{workoutName}</p>
          <p className="tabular text-[30px] leading-none font-bold tracking-tight text-foreground">
            {formatElapsed(elapsed)}
          </p>
        </div>
        <Button
          type="button"
          className="h-10 rounded-full px-5 text-sm font-semibold"
          onClick={() => {
            setRestRemaining(null);
            setFinishing(true);
          }}
        >
          Finalizar
        </Button>
      </div>

      <div className="mb-1.5 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full"
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
          className="rounded-full"
          onClick={() => goTo(index + 1)}
          disabled={isLastExercise}
          aria-label="Próximo exercício"
        >
          <ChevronRight className="h-[18px] w-[18px]" />
        </Button>
      </div>
      <div className="mb-4 h-[3px] overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${((index + 1) / exercises.length) * 100}%`, background: muscleColor }}
        />
      </div>

      {restRemaining !== null && restRemaining > 0 && (
        <div
          className="mb-4 flex items-center gap-3 rounded-2xl p-3"
          style={{ background: "color-mix(in oklch, var(--primary), transparent 88%)" }}
        >
          <div
            className="relative h-11 w-11 shrink-0 rounded-full"
            style={{ background: `conic-gradient(var(--primary) ${restPct}%, var(--muted) ${restPct}% 100%)` }}
          >
            <div className="absolute inset-[3px] flex items-center justify-center rounded-full bg-background">
              <span className="tabular text-xs font-bold text-foreground">{formatRest(restRemaining)}</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-foreground">Descansando</p>
            <p className="text-xs text-muted-foreground">Próxima série em instantes</p>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-[30px] rounded-full bg-muted px-3 text-xs font-semibold text-foreground hover:bg-muted/70"
            onClick={() => setRestRemaining(null)}
          >
            Pular
          </Button>
        </div>
      )}

      {prBanner && (
        <div
          className="mb-4 flex items-start gap-2 rounded-2xl p-3 text-sm"
          style={{ background: "color-mix(in oklch, var(--gold), transparent 85%)", boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--gold), transparent 65%)" }}
        >
          <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <div className="space-y-0.5">
            <p className="font-bold text-gold">Novo recorde pessoal!</p>
            {prBanner.map((line) => (
              <p key={line} className="text-foreground">{line}</p>
            ))}
          </div>
        </div>
      )}

      {goalBanner && (
        <div
          className="mb-4 flex items-start gap-2 rounded-2xl p-3 text-sm"
          style={{ background: "color-mix(in oklch, var(--primary), transparent 85%)", boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--primary), transparent 65%)" }}
        >
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="space-y-0.5">
            <p className="font-bold text-primary">Meta batida! 🎯</p>
            {goalBanner.map((line) => (
              <p key={line} className="text-foreground">{line}</p>
            ))}
          </div>
        </div>
      )}

      {badgeBanner && (
        <div
          className="mb-4 flex items-start gap-2 rounded-2xl p-3 text-sm"
          style={{ background: "color-mix(in oklch, var(--accent), transparent 85%)", boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--accent), transparent 65%)" }}
        >
          <Award className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div className="space-y-0.5">
            <p className="font-bold text-accent">Conquista desbloqueada!</p>
            {badgeBanner.map((b) => (
              <p key={b.label} className="text-foreground">
                <span className="font-semibold">{b.label}</span> — {b.description}
              </p>
            ))}
          </div>
        </div>
      )}

      <Card className="relative gap-4 overflow-hidden p-[18px]">
        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: muscleColor }} />

        <div className="flex items-start justify-between gap-2.5">
          <div>
            <p className="text-xs font-semibold" style={{ color: muscleColor }}>
              {MUSCLE_GROUP_LABEL[exercise.muscle_group as MuscleGroup] ?? exercise.muscle_group}
            </p>
            <h1 className="mt-0.5 text-xl leading-tight font-bold text-foreground">{exercise.exercise_name}</h1>
          </div>
          <div className="mt-1 flex shrink-0 gap-1">
            {Array.from({ length: exercise.target_sets }).map((_, i) => (
              <span
                key={i}
                className="h-[7px] w-[7px] rounded-full"
                style={{ background: i < filledDots ? muscleColor : "var(--muted)" }}
              />
            ))}
          </div>
        </div>

        <div className="-mt-2">
          <p className="text-sm text-muted-foreground">
            Alvo {exercise.target_sets}x {exercise.target_reps_min}–{exercise.target_reps_max} · descanso{" "}
            {exercise.rest_time}s
          </p>
          {exercise.notes && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground italic">{exercise.notes}</p>
          )}
        </div>

        {loggedSets.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {loggedSets.map((set) => (
              <div
                key={set.set_number}
                className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2 text-foreground">
                  <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
                  Série {set.set_number}
                </span>
                <span className="tabular text-muted-foreground">
                  {formatKg(set.weight)}kg × {set.reps}
                </span>
              </div>
            ))}
          </div>
        )}

        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Série {loggedSets.length + 1}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <NumberStepper value={weight} onChange={setWeight} step={2.5} min={0} unit="kg" formatValue={formatKg} />
            <NumberStepper value={reps} onChange={setReps} step={1} min={0} unit="reps" />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="button"
          className="h-[50px] w-full text-base font-bold"
          onClick={handleLogSet}
          disabled={pending}
        >
          {pending ? "Salvando…" : `Registrar série ${loggedSets.length + 1}`}
        </Button>
      </Card>

      {!isLastExercise && (
        <Button
          type="button"
          variant="ghost"
          className="mt-3 w-full gap-1.5 text-muted-foreground"
          onClick={() => goTo(index + 1)}
        >
          Próximo exercício
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
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
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground"
        >
          <ChevronLeft className="h-[18px] w-[18px]" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Finalizar treino</h1>
      </div>

      <div className="mb-5 flex rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex-1 text-center">
          <p className="tabular text-[19px] font-bold text-foreground">{formatDuration(elapsedSeconds)}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Duração</p>
        </div>
        <div className="mx-2 w-px bg-border" />
        <div className="flex-1 text-center">
          <p className="tabular text-[19px] font-bold text-foreground">{totalSets}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Séries</p>
        </div>
        <div className="mx-2 w-px bg-border" />
        <div className="flex flex-1 flex-col items-center text-center">
          <span className="flex items-center gap-1">
            <Trophy className="h-4 w-4 text-gold" />
            <span className="tabular text-[19px] font-bold text-gold">{totalPRs}</span>
          </span>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Novo PR</p>
        </div>
      </div>

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
              className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
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
              <Camera className="h-[22px] w-[22px] text-primary" strokeWidth={1.75} />
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
          <Play className="h-4 w-4 fill-current" />
          {pending ? "Salvando…" : "Concluir treino"}
        </Button>
      </Card>
    </div>
  );
}
