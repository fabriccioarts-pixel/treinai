"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PrCard } from "@/components/pr/pr-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PR_FILTER_GROUPS } from "@/lib/muscle-groups";
import { formatDate } from "@/lib/format";
import type { MuscleGroup } from "@/lib/types";

export interface PrEntry {
  id: string;
  exerciseName: string;
  weight: number;
  reps: number;
  achievedAt: string;
  muscleGroup: MuscleGroup;
}

export function PrsView({ personalRecords }: { personalRecords: PrEntry[] }) {
  const [filter, setFilter] = useState<MuscleGroup | "todos">("todos");

  const filtered =
    filter === "todos"
      ? personalRecords
      : personalRecords.filter((pr) => pr.muscleGroup === filter);

  return (
    <div>
      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as MuscleGroup | "todos")}
        className="mb-4"
      >
        <TabsList className="w-full justify-start gap-1 overflow-x-auto no-scrollbar">
          {PR_FILTER_GROUPS.map((group) => (
            <TabsTrigger key={group.value} value={group.value}>
              {group.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((pr) => (
            <PrCard
              key={pr.id}
              exerciseName={pr.exerciseName}
              weight={pr.weight}
              reps={pr.reps}
              date={formatDate(pr.achievedAt.slice(0, 10))}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Trophy}
          title="Nenhum PR neste grupo ainda"
          description="Continue treinando para conquistar seu primeiro recorde por aqui."
        />
      )}
    </div>
  );
}
