"use server";

import { auth } from "@/auth";
import { workerApi, WorkerApiError } from "@/lib/worker-api";

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

/** Manda agora o lembrete de água ou de treino, com a mensagem real, para conferir como chega */
export async function testReminderAction(kind: "agua" | "treino"): Promise<{ message: string; ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Sessão expirada." };
  try {
    const result = await workerApi.sendTestPush(session.user.id, kind);
    if (result.reason === "water_goal_met") return { ok: false, message: "Você já bateu a meta de água hoje, então não há lembrete." };
    if (result.reason === "no_workout") return { ok: false, message: "Crie um treino para receber o lembrete de treino." };
    if (result.sent === 0) return { ok: false, message: "Nenhum aparelho com lembretes ativos. Desative e ative de novo." };
    return { ok: true, message: "Enviado! A notificação deve chegar em alguns segundos." };
  } catch (err) {
    if (err instanceof WorkerApiError && err.status === 503) {
      return { ok: false, message: "As notificações ainda não estão configuradas no servidor (chaves VAPID)." };
    }
    console.error("Erro ao testar lembrete:", err);
    return { ok: false, message: "Não foi possível enviar agora. Tente de novo." };
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
