"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, Trash2, ChevronUp, ChevronDown, Search, Check, StickyNote } from "lucide-react";
import { WorkoutIcon, RestIcon, SetsIcon } from "@/components/ui/app-icon";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import { MUSCLE_GROUP_COLOR } from "@/lib/muscle-colors";
import { cn } from "@/lib/utils";
import type { MuscleGroup } from "@/lib/types";
import { createWorkoutAction } from "@/app/actions/workout-actions";

interface ExerciseOption {
  id: string;
  name: string;
  muscle_group: string;
}

interface BuilderRow {
  uid: number;
  exerciseId: string;
  name: string;
  muscleGroup: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restTime: number;
  notes: string;
  showNotes: boolean;
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

/** Tempo médio de execução de uma série, usado na estimativa de duração */
const SET_EXECUTION_SECONDS = 40;

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function muscleColor(group: string) {
  return MUSCLE_GROUP_COLOR[group as MuscleGroup] ?? "var(--primary)";
}

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = (v) => String(v),
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <div className="flex h-10 items-center rounded-xl border border-border/60 bg-secondary/40">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          disabled={value <= min}
          aria-label={`Diminuir ${label.toLowerCase()}`}
          className="flex h-full w-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="tabular flex-1 text-center text-sm font-semibold text-foreground">
          {format(value)}
        </span>
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          disabled={value >= max}
          aria-label={`Aumentar ${label.toLowerCase()}`}
          className="flex h-full w-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function formatRest(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}min${s}` : `${m}min`;
}

export function WorkoutBuilder({ exercises }: { exercises: ExerciseOption[] }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [rows, setRows] = useState<BuilderRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<MuscleGroup | "todos">("todos");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const uidRef = useRef(0);

  const availableGroups = useMemo(
    () => MUSCLE_GROUP_ORDER.filter((g) => exercises.some((e) => e.muscle_group === g)),
    [exercises],
  );

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return MUSCLE_GROUP_ORDER.map((group) => ({
      group,
      items: exercises.filter(
        (e) =>
          e.muscle_group === group &&
          (groupFilter === "todos" || groupFilter === group) &&
          (!q || normalize(e.name).includes(q)),
      ),
    })).filter((g) => g.items.length > 0);
  }, [exercises, query, groupFilter]);

  const addedCount = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((r) => counts.set(r.exerciseId, (counts.get(r.exerciseId) ?? 0) + 1));
    return counts;
  }, [rows]);

  const totalSets = rows.reduce((sum, r) => sum + r.targetSets, 0);
  const estimatedMinutes = Math.round(
    rows.reduce((sum, r) => sum + r.targetSets * (SET_EXECUTION_SECONDS + r.restTime), 0) / 60,
  );
  const canSave = name.trim().length > 0 && rows.length > 0;

  function addExercise(exercise: ExerciseOption) {
    setRows((prev) => [
      ...prev,
      {
        uid: ++uidRef.current,
        exerciseId: exercise.id,
        name: exercise.name,
        muscleGroup: exercise.muscle_group,
        targetSets: 3,
        targetRepsMin: 8,
        targetRepsMax: 12,
        restTime: 90,
        notes: "",
        showNotes: false,
      },
    ]);
  }

  function updateRow(uid: number, patch: Partial<BuilderRow>) {
    setRows((prev) => prev.map((row) => (row.uid === uid ? { ...row, ...patch } : row)));
  }

  function removeRow(uid: number) {
    setRows((prev) => prev.filter((row) => row.uid !== uid));
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

  function openPicker() {
    setQuery("");
    setPickerOpen(true);
  }

  function handleSave() {
    if (!canSave) return;
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
        })),
      );
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-7">
      {/* Identificação do treino */}
      <section className="space-y-2">
        <Label htmlFor="workout-name" className="sr-only">
          Nome do treino
        </Label>
        <Input
          id="workout-name"
          placeholder="Nome do treino (ex.: Treino A — Peito e Tríceps)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-12 rounded-xl text-base font-semibold"
          autoComplete="off"
        />
        {showDescription ? (
          <Input
            id="workout-description"
            placeholder="Descrição (ex.: Full body — retorno aos treinos)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-10 rounded-xl"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowDescription(true)}
            className="inline-flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar descrição
          </button>
        )}
      </section>

      {/* Exercícios */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Exercícios
            {rows.length > 0 && (
              <span className="ml-1.5 text-muted-foreground">({rows.length})</span>
            )}
          </h2>
          {rows.length > 0 && (
            <p className="tabular text-xs text-muted-foreground">
              {totalSets} séries · ~{estimatedMinutes} min
            </p>
          )}
        </div>

        {rows.length === 0 ? (
          <button
            type="button"
            onClick={openPicker}
            className="group flex w-full items-center gap-3 rounded-xl border border-dashed border-border px-4 py-4 text-left transition-colors hover:border-primary/50"
          >
            <WorkoutIcon className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">
                Nenhum exercício ainda
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                Escolha os exercícios do treino
              </span>
            </span>
            <Plus className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
          </button>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {rows.map((row, index) => (
                <motion.div
                  key={row.uid}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Card className="relative gap-4 overflow-hidden p-4 pl-5">
                    <span
                      className="absolute inset-y-0 left-0 w-1"
                      style={{ background: muscleColor(row.muscleGroup) }}
                    />

                    <div className="flex items-start gap-3">
                      <span className="tabular mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">{row.name}</p>
                        <p
                          className="text-xs font-medium"
                          style={{ color: muscleColor(row.muscleGroup) }}
                        >
                          {MUSCLE_GROUP_LABEL[row.muscleGroup as MuscleGroup] ?? row.muscleGroup}
                        </p>
                      </div>
                      <div className="-mr-1.5 -mt-1 flex items-center">
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
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeRow(row.uid)}
                          aria-label="Remover exercício"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <Stepper
                        label="Séries"
                        value={row.targetSets}
                        min={1}
                        max={10}
                        onChange={(v) => updateRow(row.uid, { targetSets: v })}
                      />
                      <Stepper
                        label="Descanso"
                        value={row.restTime}
                        min={0}
                        max={300}
                        step={15}
                        format={formatRest}
                        onChange={(v) => updateRow(row.uid, { restTime: v })}
                      />
                      <Stepper
                        label="Reps mín."
                        value={row.targetRepsMin}
                        min={1}
                        max={50}
                        onChange={(v) =>
                          updateRow(row.uid, {
                            targetRepsMin: v,
                            targetRepsMax: Math.max(v, row.targetRepsMax),
                          })
                        }
                      />
                      <Stepper
                        label="Reps máx."
                        value={row.targetRepsMax}
                        min={1}
                        max={50}
                        onChange={(v) =>
                          updateRow(row.uid, {
                            targetRepsMax: v,
                            targetRepsMin: Math.min(v, row.targetRepsMin),
                          })
                        }
                      />
                    </div>

                    {row.showNotes || row.notes ? (
                      <Input
                        placeholder="Observação: técnica, ajuste do equipamento…"
                        value={row.notes}
                        onChange={(e) => updateRow(row.uid, { notes: e.target.value })}
                        className="h-10 rounded-xl text-sm"
                        autoFocus={row.showNotes && !row.notes}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => updateRow(row.uid, { showNotes: true })}
                        className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                      >
                        <StickyNote className="h-3.5 w-3.5" />
                        Adicionar observação
                      </button>
                    )}
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            <button
              type="button"
              onClick={openPicker}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
            >
              <Plus className="h-4 w-4" />
              Adicionar exercícios
            </button>
          </div>
        )}
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Barra de salvar fixa acima da navegação inferior */}
      <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 -mx-1 rounded-2xl border border-border/60 bg-background/85 p-2 shadow-lg shadow-black/20 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 pl-2">
            {canSave ? (
              <p className="tabular flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <SetsIcon className="h-3.5 w-3.5" />
                  {rows.length} exerc.
                </span>
                <span className="inline-flex items-center gap-1">
                  <RestIcon className="h-3.5 w-3.5" />~{estimatedMinutes} min
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {!name.trim() ? "Dê um nome ao treino" : "Adicione ao menos 1 exercício"}
              </p>
            )}
          </div>
          <Button
            type="button"
            className="h-11 shrink-0 rounded-xl px-6 font-semibold"
            onClick={handleSave}
            disabled={pending || !canSave}
          >
            {pending ? "Salvando…" : "Salvar treino"}
          </Button>
        </div>
      </div>

      {/* Seletor de exercícios */}
      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto flex max-h-[88dvh] max-w-lg flex-col gap-0 rounded-t-3xl p-0"
        >
          <SheetHeader className="pb-3">
            <SheetTitle className="text-lg font-bold">Adicionar exercícios</SheetTitle>
            <SheetDescription>Toque para adicionar. Pode escolher vários.</SheetDescription>
          </SheetHeader>

          <div className="space-y-3 px-4 pb-3">
            <div className="flex h-11 items-center gap-2 rounded-xl border border-border/60 bg-secondary/40 px-3 focus-within:border-primary/40">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar exercício"
                className="h-full flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
              />
            </div>
            <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
              {(["todos", ...availableGroups] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroupFilter(g)}
                  className={cn(
                    "h-8 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-colors",
                    groupFilter === g
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {g === "todos" ? "Todos" : MUSCLE_GROUP_LABEL[g]}
                </button>
              ))}
            </div>
          </div>

          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto border-t border-border/50 px-2 pb-2">
            {filtered.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Nenhum exercício encontrado.
              </p>
            ) : (
              filtered.map(({ group, items }) => (
                <div key={group} className="pt-3">
                  <p
                    className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: muscleColor(group) }}
                  >
                    {MUSCLE_GROUP_LABEL[group]}
                  </p>
                  {items.map((ex) => {
                    const count = addedCount.get(ex.id) ?? 0;
                    return (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => addExercise(ex)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-secondary/60 active:bg-secondary"
                      >
                        <span className="flex-1 text-sm text-foreground">{ex.name}</span>
                        {count > 0 ? (
                          <span className="tabular flex h-7 min-w-7 items-center justify-center gap-0.5 rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
                            <Check className="h-3.5 w-3.5" />
                            {count > 1 && count}
                          </span>
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 text-muted-foreground">
                            <Plus className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border/50 p-3 safe-bottom">
            <Button
              type="button"
              className="h-11 w-full rounded-xl font-semibold"
              onClick={() => setPickerOpen(false)}
            >
              {rows.length > 0
                ? `Concluir · ${rows.length} ${rows.length === 1 ? "exercício" : "exercícios"}`
                : "Fechar"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
