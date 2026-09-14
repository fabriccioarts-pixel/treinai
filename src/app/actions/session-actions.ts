"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

export async function startWorkoutAction(workoutId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id: sessionId } = await workerApi.startSession(session.user.id, workoutId);
  redirect(`/treinos/${workoutId}/executar/${sessionId}`);
}

export interface LogSetResult {
  id?: string;
  newPRs?: { type: string; weight: number; reps: number }[];
  error?: string;
}

export async function logSetAction(input: {
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
}): Promise<LogSetResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada." };
  if (input.weight < 0 || input.reps <= 0) return { error: "Valores inválidos." };

  try {
    const { id, newPRs } = await workerApi.logSet(input);
    return { id, newPRs };
  } catch {
    return { error: "Não foi possível salvar a série. Tente novamente." };
  }
}

export async function finishWorkoutAction(
  sessionId: string,
  durationSeconds: number
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await workerApi.finishSession(sessionId, durationSeconds);
  redirect("/");
}
