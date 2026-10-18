"use server";

import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Ativa os lembretes neste aparelho e manda uma notificação de boas-vindas */
export async function enableRemindersAction(sub: PushSubscriptionInput): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada." };
  try {
    await workerApi.subscribePush(session.user.id, sub);
    await workerApi.sendTestPush(session.user.id).catch(() => null);
    return {};
  } catch (err) {
    console.error("Erro ao ativar lembretes:", err);
    return { error: "Não foi possível ativar os lembretes. Tente de novo." };
  }
}

export async function disableRemindersAction(endpoint: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada." };
  try {
    await workerApi.unsubscribePush(session.user.id, endpoint);
    return {};
  } catch (err) {
    console.error("Erro ao desativar lembretes:", err);
    return { error: "Não foi possível desativar os lembretes. Tente de novo." };
  }
}
