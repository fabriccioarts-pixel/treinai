"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

export interface WorkoutExerciseInput {
  exerciseId: string;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restTime: number;
  notes?: string;
}

export interface CreateWorkoutResult {
  error?: string;
}

export async function createWorkoutAction(
  name: string,
  description: string,
  exercises: WorkoutExerciseInput[]
): Promise<CreateWorkoutResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada. Entre novamente." };
  if (!name.trim()) return { error: "Dê um nome para o treino." };
  if (exercises.length === 0) return { error: "Adicione pelo menos um exercício." };

  try {
    await workerApi.createWorkout({
      userId: session.user.id,
      name: name.trim(),
      description: description.trim() || undefined,
      exercises,
    });
  } catch {
    return { error: "Não foi possível salvar o treino agora. Tente novamente." };
  }

  redirect("/treinos");
}

export async function deleteWorkoutAction(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await workerApi.deleteWorkout(id);
  redirect("/treinos");
}
