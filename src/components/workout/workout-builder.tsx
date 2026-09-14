"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@/lib/types";
import { createWorkoutAction } from "@/app/actions/workout-actions";

interface ExerciseOption {
  id: string;
  name: string;
  muscle_group: string;
}

interface BuilderRow {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restTime: number;
  notes: string;
}

const MUSCLE_GROUP_ORDER: MuscleGroup[] = [
  "peito",
  "costas",
  "pernas",
  "ombros",
  "biceps",
  "triceps",
  "abdomen",
  "cardio",
];

export function WorkoutBuilder({ exercises }: { exercises: ExerciseOption[] }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<BuilderRow[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState(exercises[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const grouped = MUSCLE_GROUP_ORDER.map((group) => ({
    group,
    items: exercises.filter((e) => e.muscle_group === group),
  })).filter((g) => g.items.length > 0);

  function addExercise() {
    const exercise = exercises.find((e) => e.id === selectedExerciseId);
    if (!exercise) return;
    setRows((prev) => [
      ...prev,
      {
        exerciseId: exercise.id,
        name: exercise.name,
        muscleGroup: exercise.muscle_group,
        targetSets: 3,
        targetRepsMin: 8,
        targetRepsMax: 12,
        restTime: 90,
        notes: "",
      },
    ]);
  }

  function updateRow(index: number, patch: Partial<BuilderRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function moveRow(index: number, direction: -1 | 1) {
    setRows((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await createWorkoutAction(
        name,
        description,
        rows.map((row, i) => ({
          exerciseId: row.exerciseId,
          order: i + 1,
          targetSets: row.targetSets,
          targetRepsMin: row.targetRepsMin,
          targetRepsMax: row.targetRepsMax,
          restTime: row.restTime,
          notes: row.notes || undefined,
        }))
      );
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="workout-name">Nome do treino</Label>
          <Input
            id="workout-name"
            placeholder="Ex.: Treino A — Peito e Tríceps"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="workout-description">Descrição (opcional)</Label>
          <Input
            id="workout-description"
            placeholder="Ex.: Full body — retorno aos treinos"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <Card key={`${row.exerciseId}-${index}`} className="gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{row.name}</p>
                <p className="text-xs text-muted-foreground">
                  {MUSCLE_GROUP_LABEL[row.muscleGroup as MuscleGroup] ?? row.muscleGroup}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => moveRow(index, -1)}
                  disabled={index === 0}
                  aria-label="Mover para cima"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => moveRow(index, 1)}
                  disabled={index === rows.length - 1}
                  aria-label="Mover para baixo"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  onClick={() => removeRow(index)}
                  aria-label="Remover exercício"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Séries</Label>
                <Input
                  type="number"
                  min={1}
                  value={row.targetSets}
                  onChange={(e) => updateRow(index, { targetSets: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Reps mín.</Label>
                <Input
                  type="number"
                  min={1}
                  value={row.targetRepsMin}
                  onChange={(e) => updateRow(index, { targetRepsMin: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Reps máx.</Label>
                <Input
                  type="number"
                  min={1}
                  value={row.targetRepsMax}
                  onChange={(e) => updateRow(index, { targetRepsMax: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Descanso (segundos)</Label>
              <Input
                type="number"
                min={0}
                step={15}
                value={row.restTime}
                onChange={(e) => updateRow(index, { restTime: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Observação (opcional)</Label>
              <Input
                placeholder="Ex.: técnica, ajuste do equipamento…"
                value={row.notes}
                onChange={(e) => updateRow(index, { notes: e.target.value })}
              />
            </div>
          </Card>
        ))}
      </div>

      <Card className="gap-3 p-4">
        <Label className="text-xs text-muted-foreground">Adicionar exercício</Label>
        <div className="flex gap-2">
          <select
            className="h-9 flex-1 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
          >
            {grouped.map(({ group, items }) => (
              <optgroup key={group} label={MUSCLE_GROUP_LABEL[group]}>
                {items.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <Button type="button" onClick={addExercise} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="button"
        size="lg"
        className="h-12 w-full text-base font-semibold"
        onClick={handleSave}
        disabled={pending}
      >
        {pending ? "Salvando…" : "Salvar treino"}
      </Button>
    </div>
  );
}
