"use client";

import { useState, useTransition } from "react";
import { Plus, Target } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@/lib/types";
import { createGoalAction } from "@/app/actions/goal-actions";

interface ExerciseOption {
  id: string;
  name: string;
  muscle_group: string;
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

export function CreateGoalDialog({ exercises }: { exercises: ExerciseOption[] }) {
  const [open, setOpen] = useState(false);
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? "");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetReps, setTargetReps] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const grouped = MUSCLE_GROUP_ORDER.map((group) => ({
    group,
    items: exercises.filter((e) => e.muscle_group === group),
  })).filter((g) => g.items.length > 0);

  function handleSubmit() {
    setError(null);
    const weight = Number(targetWeight.replace(",", "."));
    if (!weight || weight <= 0) {
      setError("Informe uma carga alvo válida.");
      return;
    }
    startTransition(async () => {
      const result = await createGoalAction({
        exerciseId,
        targetWeight: weight,
        targetReps: Number(targetReps) || 1,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setTargetWeight("");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-full">
            <Plus className="h-3.5 w-3.5" />
            Nova meta
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Nova meta de carga
          </DialogTitle>
          <DialogDescription>
            Escolha um exercício e a carga que você quer alcançar. Acompanhamos seu progresso automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Exercício</Label>
            <Select value={exerciseId} onValueChange={(v) => setExerciseId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um exercício" />
              </SelectTrigger>
              <SelectContent>
                {grouped.map(({ group, items }) => (
                  <SelectGroup key={group}>
                    <SelectLabel>{MUSCLE_GROUP_LABEL[group]}</SelectLabel>
                    {items.map((ex) => (
                      <SelectItem key={ex.id} value={ex.id}>
                        {ex.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Carga alvo (kg)</Label>
              <Input
                inputMode="decimal"
                placeholder="Ex.: 100"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Repetições</Label>
              <Input
                type="number"
                min={1}
                value={targetReps}
                onChange={(e) => setTargetReps(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={pending}>
            {pending ? "Criando…" : "Criar meta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
