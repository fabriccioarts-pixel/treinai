"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, Check, ChevronLeft, ChevronRight, Timer, Trophy, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
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
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [prBanner, setPrBanner] = useState<string[] | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

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

  const exercise = exercises[index];
  const loggedSets = loggedByExercise[exercise.exercise_id] ?? [];
  const isLastExercise = index === exercises.length - 1;

  function formatElapsed(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  function handleLogSet() {
    setError(null);
    const weightNum = Number(weight.replace(",", "."));
    const repsNum = Number(reps);
    if (!weight || Number.isNaN(weightNum) || weightNum < 0) {
      setError("Informe uma carga válida.");
      return;
    }
    if (!reps || Number.isNaN(repsNum) || repsNum <= 0) {
      setError("Informe as repetições feitas.");
      return;
    }

    startTransition(async () => {
      const result = await logSetAction({
        sessionId,
        exerciseId: exercise.exercise_id,
        setNumber: loggedSets.length + 1,
        weight: weightNum,
        reps: repsNum,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setLoggedByExercise((prev) => ({
        ...prev,
        [exercise.exercise_id]: [
          ...(prev[exercise.exercise_id] ?? []),
          { set_number: loggedSets.length + 1, weight: weightNum, reps: repsNum },
        ],
      }));
      setReps("");
      setRestRemaining(exercise.rest_time);
      if (result.newPRs && result.newPRs.length > 0) {
        setPrBanner(result.newPRs.map((pr) => `${PR_LABEL[pr.type] ?? pr.type}: ${pr.weight}kg × ${pr.reps}`));
      }
    });
  }

  function goTo(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= exercises.length) return;
    setError(null);
    setReps("");
    setRestRemaining(null);
    setIndex(nextIndex);
  }

  function formatRest(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return minutes > 0 ? `${minutes}:${rest.toString().padStart(2, "0")}` : `${rest}s`;
  }

  if (finishing) {
    return (
      <FinishPanel
        sessionId={sessionId}
        elapsedSeconds={Math.floor(elapsed / 1000)}
        onBack={() => setFinishing(false)}
      />
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{workoutName}</p>
          <p className="tabular text-2xl font-semibold tracking-tight text-foreground">
            {formatElapsed(elapsed)}
          </p>
        </div>
        <Button
          type="button"
          className="h-9 px-4 text-sm font-semibold"
          onClick={() => {
            setRestRemaining(null);
            setFinishing(true);
          }}
        >
          Finalizar
        </Button>
      </div>

      {restRemaining !== null && restRemaining > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-primary/10 p-3">
          <div className="flex items-center gap-2 text-primary">
            <Timer className="h-4 w-4" />
            <span className="text-sm font-medium">Descanso</span>
            <span className="tabular text-lg font-semibold">{formatRest(restRemaining)}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary"
            onClick={() => setRestRemaining(null)}
          >
            Pular
          </Button>
        </div>
      )}

      {prBanner && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-gold/15 p-3 text-sm text-gold">
          <Trophy className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-semibold">Novo recorde pessoal!</p>
            {prBanner.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          aria-label="Exercício anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <p className="text-xs font-medium text-muted-foreground">
          Exercício {index + 1} de {exercises.length}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => goTo(index + 1)}
          disabled={isLastExercise}
          aria-label="Próximo exercício"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <Card className="gap-4 p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {MUSCLE_GROUP_LABEL[exercise.muscle_group as MuscleGroup] ?? exercise.muscle_group}
          </p>
          <h1 className="text-xl font-semibold text-foreground">{exercise.exercise_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Alvo: {exercise.target_sets}x {exercise.target_reps_min}–{exercise.target_reps_max} ·
            descanso {exercise.rest_time}s
          </p>
          {exercise.notes && (
            <p className="mt-1 text-sm text-muted-foreground italic">{exercise.notes}</p>
          )}
        </div>

        {loggedSets.length > 0 && (
          <div className="space-y-1.5">
            {loggedSets.map((set) => (
              <div
                key={set.set_number}
                className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2 text-foreground">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  Série {set.set_number}
                </span>
                <span className="tabular text-muted-foreground">
                  {set.weight}kg × {set.reps}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Carga (kg)</Label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              placeholder="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Repetições</Label>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="0"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="button"
          size="lg"
          className="h-11 w-full text-base font-semibold"
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
  onBack,
}: {
  sessionId: string;
  elapsedSeconds: number;
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

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label="Voltar">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Finalizar treino</h1>
      </div>

      <Card className="gap-4 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Registrar uma foto (opcional)</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Guarde uma foto desse treino — do resultado, do local ou de como você está se sentindo.
          </p>
        </div>

        {previewUrl ? (
          <div className="relative overflow-hidden rounded-xl">
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
              className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-sm"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-muted-foreground transition-colors hover:bg-muted/40">
            <Camera className="h-6 w-6" />
            <span className="text-sm font-medium">Tirar ou escolher uma foto</span>
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
          size="lg"
          className="h-12 w-full text-base font-semibold"
          onClick={handleFinish}
          disabled={pending}
        >
          {pending ? "Salvando…" : "Concluir treino"}
        </Button>
      </Card>
    </div>
  );
}
