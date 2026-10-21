"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { auth } from "@/auth";
import { workerApi, WorkerApiError } from "@/lib/worker-api";

export interface WorkoutExerciseInput {
  exerciseId: string;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restTime: number;
  notes?: string;
  /** Exercícios seguidos com o mesmo número formam um conjugado */
  supersetGroup?: number;
  technique?: string;
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
  if (!session?.user?.id) redirect("/login");
  try {
    await workerApi.deleteWorkout(session.user.id, id);
  } catch (err) {
    // 404: já foi apagado ou não é deste usuário; em ambos os casos não há o que mostrar
    if (!(err instanceof WorkerApiError && err.status === 404)) throw err;
  }
  refresh();
  redirect("/treinos");
}
