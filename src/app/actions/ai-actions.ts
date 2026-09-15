"use server";

import { auth } from "@/auth";
import { workerApi, WorkerApiError } from "@/lib/worker-api";

export interface AskCoachResult {
  reply?: string;
  actions?: { type: "workout_created" | "workout_updated"; workoutId: string; name: string }[];
  error?: string;
}

export async function askCoachAction(message: string): Promise<AskCoachResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada. Entre novamente." };

  const trimmed = message.trim();
  if (!trimmed) return { error: "Escreva sua pergunta ou pedido." };

  try {
    const { reply, actions } = await workerApi.askCoach(session.user.id, trimmed);
    return { reply, actions };
  } catch (err) {
    if (err instanceof WorkerApiError && err.status === 503) {
      return { error: "O assistente de IA ainda não foi configurado neste app." };
    }
    return { error: "Não foi possível falar com o personal trainer agora. Tente novamente." };
  }
}
