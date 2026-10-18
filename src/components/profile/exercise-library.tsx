"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ExerciseThumb } from "@/components/progress/exercise-progress-list";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import { EQUIPMENT_LABEL } from "@/lib/exercise-labels";
import type { Equipment, MuscleGroup } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface LibraryExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  isCustom: boolean;
}

/** Busca sem acento e sem caixa: "supino", "SUPINO" e "súpino" acham o mesmo */
function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
}

export function ExerciseLibrary({ exercises }: { exercises: LibraryExercise[] }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<MuscleGroup | "todos">("todos");

  // Só os grupos que existem no catálogo, na ordem dos rótulos
  const groups = useMemo(
    () => (Object.keys(MUSCLE_GROUP_LABEL) as MuscleGroup[]).filter((g) => exercises.some((e) => e.muscleGroup === g)),
    [exercises],
  );

  const sections = useMemo(() => {
    const q = normalize(query.trim());
    const visible = exercises.filter(
      (e) =>
        (group === "todos" || e.muscleGroup === group) &&
        (!q || normalize(e.name).includes(q) || normalize(EQUIPMENT_LABEL[e.equipment] ?? "").includes(q)),
    );
    return groups
      .map((g) => ({ group: g, items: visible.filter((e) => e.muscleGroup === g) }))
      .filter((s) => s.items.length > 0);
  }, [exercises, group, groups, query]);

  const total = sections.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <div className="space-y-4">
      {/* Busca em pílula, no estilo da caixa de mensagem do ChatGPT */}
      <label className="flex h-13 items-center gap-3 rounded-full bg-muted pr-2 pl-5 shadow-[0_1px_2px_rgb(0_0_0/0.12),0_4px_16px_rgb(0_0_0/0.12)] ring-1 ring-foreground/5 transition-shadow focus-within:ring-foreground/15">
        <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar exercício ou aparelho"
          aria-label="Buscar exercício ou aparelho"
          className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpar busca"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-85"
          >
            <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          </button>
        )}
      </label>

      {/* Filtro por grupo: rola na horizontal sem barra, como chips */}
      <div role="radiogroup" aria-label="Grupo muscular" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {(["todos", ...groups] as const).map((g) => {
          const active = group === g;
          return (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setGroup(g)}
              className={cn(
                "h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/70",
              )}
            >
              {g === "todos" ? "Todos" : MUSCLE_GROUP_LABEL[g]}
            </button>
          );
        })}
      </div>

      <p className="px-1 text-sm text-muted-foreground" aria-live="polite">
        {total} {total === 1 ? "exercício" : "exercícios"}
      </p>

      {sections.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nenhum exercício encontrado.</p>
      ) : (
        sections.map((section) => (
          <section key={section.group}>
            <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">
              {MUSCLE_GROUP_LABEL[section.group]}
            </h2>
            <Card className="divide-y divide-border/50 p-0">
              {section.items.map((e) => (
                <Link
                  key={e.id}
                  href={`/perfil/exercicios/${e.id}`}
                  className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                >
                  <ExerciseThumb exerciseId={e.id} muscleGroup={e.muscleGroup} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{e.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {EQUIPMENT_LABEL[e.equipment] ?? e.equipment}
                      {e.isCustom && " · Personalizado"}
                    </p>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              ))}
            </Card>
          </section>
        ))
      )}
    </div>
  );
}
