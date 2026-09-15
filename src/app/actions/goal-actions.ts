"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { workerApi, WorkerApiError } from "@/lib/worker-api";

export interface CreateGoalResult {
  error?: string;
}

export async function createGoalAction(input: {
  exerciseId: string;
  targetWeight: number;
  targetReps?: number;
  deadline?: string;
}): Promise<CreateGoalResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada." };
  if (!input.exerciseId) return { error: "Escolha um exercício." };
  if (!input.targetWeight || input.targetWeight <= 0) return { error: "Informe uma carga alvo válida." };

  try {
    await workerApi.createGoal({ userId: session.user.id, ...input });
  } catch (err) {
    if (err instanceof WorkerApiError && err.code === "target_below_current") {
      return { error: "Essa carga já é igual ou menor que a sua atual nesse exercício." };
    }
    return { error: "Não foi possível criar a meta agora. Tente novamente." };
  }

  revalidatePath("/progresso");
  return {};
}

export async function deleteGoalAction(goalId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await workerApi.deleteGoal(goalId).catch(() => {});
  revalidatePath("/progresso");
}
