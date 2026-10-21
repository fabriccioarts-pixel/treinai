"use server";

import { auth } from "@/auth";
import { workerApi, WorkerApiError, type CoachAction } from "@/lib/worker-api";
import { PAYWALL_MESSAGE } from "@/lib/billing";

export interface AskCoachResult {
  reply?: string;
  actions?: CoachAction[];
  /** Conversa onde a troca foi salva; ausente se não deu para salvar */
  conversationId?: string;
  error?: string;
  /** O teste grátis acabou e não há assinatura: mostrar o convite para assinar */
  paywall?: boolean;
}

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export async function askCoachAction(
  message: string,
  options: { conversationId?: string; hidden?: boolean; history?: ChatHistoryMessage[] } = {}
): Promise<AskCoachResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada. Entre novamente." };

  const trimmed = message.trim();
  if (!trimmed) return { error: "Escreva sua pergunta ou pedido." };

  try {
    const { reply, actions, conversationId } = await workerApi.askCoach(session.user.id, trimmed, options);
    return { reply, actions, conversationId: conversationId ?? undefined };
  } catch (err) {
    console.error("[askCoachAction] Failed:", err);
    if (err instanceof WorkerApiError && err.status === 402) return { error: PAYWALL_MESSAGE, paywall: true };
    if (err instanceof WorkerApiError && err.status === 503) {
      return { error: "O assistente de IA ainda não foi configurado neste app." };
    }
    if (err instanceof WorkerApiError && err.status === 404) {
      return { error: "Essa conversa não existe mais. Comece uma nova pelo histórico." };
    }
    return { error: "Não foi possível falar com o personal trainer agora. Tente novamente." };
  }
}

export interface VoiceSession {
  token: string;
  expiresAt: string;
  setup: Record<string, unknown>;
  voiceSessionId?: string | null;
  /** A ligação acaba antes dos 15 min porque terminaram os minutos de voz do dia */
  endsByDailyLimit?: boolean;
  dailyLimitMinutes?: number;
}

export async function startVoiceSessionAction(
  conversationId?: string
): Promise<{ session?: VoiceSession; error?: string; paywall?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada. Entre novamente." };

  try {
    return { session: await workerApi.startVoiceSession(session.user.id, conversationId) };
  } catch (err) {
    console.error("[startVoiceSessionAction] Failed:", err);
    if (err instanceof WorkerApiError && err.status === 402) return { error: PAYWALL_MESSAGE, paywall: true };
    if (err instanceof WorkerApiError && err.status === 503) {
      return { error: "A conversa por voz ainda não foi configurada neste app." };
    }
    if (err instanceof WorkerApiError && err.status === 429) {
      return {
        error: "Você já usou seus minutos de voz de hoje. Amanhã tem mais! Enquanto isso, pode falar comigo por escrito.",
      };
    }
    return { error: "Não foi possível ligar para o Théo agora. Tente de novo." };
  }
}

/** Avisa o fim da ligação (para a contagem de minutos do dia); falha não incomoda o usuário */
export async function endVoiceSessionAction(voiceSessionId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await workerApi.endVoiceSession(session.user.id, voiceSessionId).catch(() => null);
}

export async function runVoiceToolAction(
  name: string,
  args: unknown
): Promise<{ output: string; actions: CoachAction[] }> {
  const session = await auth();
  if (!session?.user?.id) return { output: "Erro: sessão do usuário expirou.", actions: [] };

  try {
    return await workerApi.runVoiceTool(session.user.id, name, args);
  } catch (err) {
    console.error("[runVoiceToolAction] Failed:", err);
    return { output: `Erro ao executar ${name}. Avise o usuário e não tente de novo.`, actions: [] };
  }
}

export async function saveVoiceTurnAction(turn: {
  conversationId?: string;
  userText: string;
  reply: string;
  actions: CoachAction[];
}): Promise<{ conversationId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada." };

  try {
    return await workerApi.saveVoiceTurn(session.user.id, turn);
  } catch (err) {
    console.error("[saveVoiceTurnAction] Failed:", err);
    return { error: "Não foi possível salvar a conversa." };
  }
}

export interface CoachConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  preview: string | null;
}

export async function listCoachConversationsAction(): Promise<{
  conversations?: CoachConversationSummary[];
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada. Entre novamente." };

  try {
    const { conversations } = await workerApi.listCoachConversations(session.user.id);
    return {
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        updatedAt: c.updated_at,
        preview: c.preview,
      })),
    };
  } catch {
    return { error: "Não foi possível carregar o histórico agora." };
  }
}

export async function renameCoachConversationAction(
  id: string,
  title: string
): Promise<{ title?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada. Entre novamente." };
  if (!title.trim()) return { error: "Dê um nome para a conversa." };

  try {
    const result = await workerApi.renameCoachConversation(session.user.id, id, title);
    return { title: result.title };
  } catch {
    return { error: "Não foi possível renomear a conversa." };
  }
}

export async function deleteCoachConversationAction(id: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada. Entre novamente." };

  try {
    await workerApi.deleteCoachConversation(session.user.id, id);
    return {};
  } catch {
    return { error: "Não foi possível apagar a conversa." };
  }
}
