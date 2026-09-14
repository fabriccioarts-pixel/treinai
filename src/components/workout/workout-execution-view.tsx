"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@/lib/types";
import { PrCelebration } from "@/components/workout/pr-celebration";
import { logSetAction, finishWorkoutAction } from "@/app/actions/session-actions";

export interface ExecutionExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restTime: number;
  notes: string | null;
}

export interface ExistingSet {
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  completed: boolean;
}

interface SetRow {
  weight: number;
  reps: number;
  completed: boolean;
  saving: boolean;
}

function buildInitialRows(exercise: ExecutionExercise, existing: ExistingSet[]): SetRow[] {
  const rows: SetRow[] = [];
  for (let i = 0; i < exercise.targetSets; i++) {
    const found = existing.find((s) => s.exerciseId === exercise.exerciseId && s.setNumber === i + 1);
    if (found) {
      rows.push({ weight: found.weight, reps: found.reps, completed: true, saving: false });
    } else {
      const prevWeight = rows.length > 0 ? rows[rows.length - 1].weight : 0;
      rows.push({ weight: prevWeight, reps: exercise.targetRepsMin, completed: false, saving: false });
    }
  }
  return rows;
}

export function WorkoutExecutionView({
  sessionId,
  workoutName,
  exercises,
  existingSets,
}: {
  sessionId: string;
  workoutName: string;
  exercises: ExecutionExercise[];
  existingSets: ExistingSet[];
}) {
  const startedAtRef = useRef<number | null>(null);
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  const [rowsByExercise, setRowsByExercise] = useState<Record<string, SetRow[]>>(() =>
    Object.fromEntries(exercises.map((ex) => [ex.exerciseId, buildInitialRows(ex, existingSets)]))
  );
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [celebration, setCelebration] = useState<{
    exerciseName: string;
    weight: number;
    reps: number;
  } | null>(null);

  const exercise = exercises[index];
  const rows = rowsByExercise[exercise.exerciseId];
  const isLast = index === exercises.length - 1;
  const completedCount = rows.filter((r) => r.completed).length;

  const totalCompleted = useMemo(
    () =>
      Object.values(rowsByExercise).reduce(
        (sum, exRows) => sum + exRows.filter((r) => r.completed).length,
        0
      ),
    [rowsByExercise]
  );

  function updateRow(setIdx: number, patch: Partial<SetRow>) {
    setRowsByExercise((prev) => ({
      ...prev,
      [exercise.exerciseId]: prev[exercise.exerciseId].map((row, i) =>
        i === setIdx ? { ...row, ...patch } : row
      ),
    }));
  }

  async function completeSet(setIdx: number) {
    const row = rows[setIdx];
    if (row.completed || row.saving) return;
    updateRow(setIdx, { saving: true });

    const result = await logSetAction({
      sessionId,
      exerciseId: exercise.exerciseId,
      setNumber: setIdx + 1,
      weight: row.weight,
      reps: row.reps,
    });

    if (result.error) {
      updateRow(setIdx, { saving: false });
      return;
    }

    updateRow(setIdx, { completed: true, saving: false });

    // Herda a carga para a próxima série ainda não registrada (comum manter o mesmo peso).
    setRowsByExercise((prev) => {
      const exRows = prev[exercise.exerciseId];
      const nextIdx = setIdx + 1;
      if (nextIdx >= exRows.length || exRows[nextIdx].completed) return prev;
      const updated = [...exRows];
      updated[nextIdx] = { ...updated[nextIdx], weight: row.weight };
      return { ...prev, [exercise.exerciseId]: updated };
    });

    if (result.newPRs && result.newPRs.length > 0) {
      setCelebration({ exerciseName: exercise.exerciseName, weight: row.weight, reps: row.reps });
      setTimeout(() => setCelebration(null), 2800);
    }
  }

  async function handleFinish() {
    setFinishing(true);
    const durationSeconds = Math.round((Date.now() - (startedAtRef.current ?? Date.now())) / 1000);
    await finishWorkoutAction(sessionId, durationSeconds);
  }

  return (
    <div className="space-y-5">
      <PrCelebration
        visible={celebration !== null}
        exerciseName={celebration?.exerciseName ?? ""}
        weight={celebration?.weight ?? 0}
        reps={celebration?.reps ?? 0}
      />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Exercício {index + 1} de {exercises.length} — {workoutName}
          </p>
          <h1 className="text-lg font-semibold text-foreground">{exercise.exerciseName}</h1>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Encerrar treino"
          onClick={() => {
            if (window.confirm("Encerrar o treino agora? As séries já salvas continuam registradas.")) {
              handleFinish();
            }
          }}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <Card className="gap-3 p-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{MUSCLE_GROUP_LABEL[exercise.muscleGroup as MuscleGroup] ?? exercise.muscleGroup}</span>
          <span className="tabular">
            Meta: {exercise.targetSets}x {exercise.targetRepsMin}–{exercise.targetRepsMax} · descanso{" "}
            {exercise.restTime}s
          </span>
        </div>
        {exercise.notes && <p className="text-sm text-muted-foreground">{exercise.notes}</p>}
      </Card>

      <div className="space-y-3">
        {rows.map((row, setIdx) => (
          <Card
            key={setIdx}
            className={`gap-3 p-4 ${row.completed ? "ring-1 ring-primary/30" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                {row.completed && <Check className="h-4 w-4 text-primary" />}
                Série {setIdx + 1}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Carga (kg)</p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={row.completed}
                    onClick={() => updateRow(setIdx, { weight: Math.max(0, row.weight - 2.5) })}
                    aria-label="Diminuir carga"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="tabular min-w-12 text-center text-base font-semibold text-foreground">
                    {row.weight}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={row.completed}
                    onClick={() => updateRow(setIdx, { weight: row.weight + 2.5 })}
                    aria-label="Aumentar carga"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Repetições</p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={row.completed}
                    onClick={() => updateRow(setIdx, { reps: Math.max(1, row.reps - 1) })}
                    aria-label="Diminuir repetições"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="tabular min-w-8 text-center text-base font-semibold text-foreground">
                    {row.reps}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={row.completed}
                    onClick={() => updateRow(setIdx, { reps: row.reps + 1 })}
                    aria-label="Aumentar repetições"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <Button
              type="button"
              className="h-10 w-full font-medium"
              variant={row.completed ? "secondary" : "default"}
              disabled={row.completed || row.saving}
              onClick={() => completeSet(setIdx)}
            >
              {row.completed ? "Série concluída" : row.saving ? "Salvando…" : "Concluir série"}
            </Button>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 gap-1"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>

        {isLast ? (
          <Button
            type="button"
            className="h-11 flex-1 font-semibold"
            onClick={handleFinish}
            disabled={finishing}
          >
            {finishing ? "Concluindo…" : "Concluir treino"}
          </Button>
        ) : (
          <Button
            type="button"
            className="h-11 flex-1 gap-1 font-semibold"
            onClick={() => setIndex((i) => Math.min(exercises.length - 1, i + 1))}
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <p className="tabular text-center text-xs text-muted-foreground">
        {totalCompleted} de {exercises.reduce((s, e) => s + e.targetSets, 0)} séries concluídas · exercício
        atual: {completedCount}/{rows.length}
      </p>
    </div>
  );
}
