"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { workerApi, WorkerApiError, type PlanKey } from "@/lib/worker-api";

/** Leva a pessoa para o pagamento na Cakto, com a conta e o contato já no link */
export async function startCheckoutAction(plan: PlanKey): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada. Entre novamente." };
  if (plan !== "mensal" && plan !== "trimestral") return { error: "Plano inválido." };

  let url: string;
  try {
    ({ url } = await workerApi.createCheckout(session.user.id, plan));
  } catch (err) {
    if (err instanceof WorkerApiError && err.status === 503) {
      return { error: "O pagamento ainda não foi configurado neste app." };
    }
    return { error: "Não foi possível abrir o pagamento agora. Tente de novo." };
  }
  redirect(url);
}

export async function cancelSubscriptionAction(): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada. Entre novamente." };
  try {
    await workerApi.cancelSubscription(session.user.id);
  } catch (err) {
    if (err instanceof WorkerApiError && err.status === 503) {
      return {
        error: "O cancelamento pelo app ainda não está ativo. Use o link do e-mail de confirmação da compra ou fale com a gente.",
      };
    }
    return { error: "Não foi possível cancelar agora. Tente de novo ou fale com a gente." };
  }
  revalidatePath("/assinar");
  return {};
}

export interface LeadInput {
  name: string;
  email: string;
  whatsapp: string;
  answers: Record<string, string | number>;
  score: number;
  phase: string;
  utm?: Record<string, string>;
}

/** Contato deixado no fim do diagnóstico (página pública, sem login) */
export async function saveLeadAction(input: LeadInput): Promise<{ error?: string }> {
  const name = input.name.trim().slice(0, 60);
  const email = input.email.trim().toLowerCase();
  const whatsapp = input.whatsapp.replace(/\D/g, "");
  if (name.length < 2) return { error: "Digite seu nome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Confere o e-mail?" };
  if (!/^\d{10,11}$/.test(whatsapp)) return { error: "Digite o WhatsApp com DDD." };

  // Só repassa respostas e campanha em formato simples; o worker valida de novo
  const answers = Object.fromEntries(
    Object.entries(input.answers)
      .filter(([, v]) => typeof v === "string" || typeof v === "number")
      .slice(0, 40)
      .map(([k, v]) => [k.slice(0, 40), typeof v === "string" ? v.slice(0, 200) : v]),
  );
  const utm = input.utm
    ? Object.fromEntries(
        Object.entries(input.utm)
          .filter(([k, v]) => k.startsWith("utm_") && typeof v === "string")
          .map(([k, v]) => [k.slice(0, 40), v.slice(0, 200)]),
      )
    : undefined;

  try {
    await workerApi.saveLead({
      name,
      email,
      whatsapp,
      answers,
      score: Math.max(0, Math.min(100, Math.round(input.score))),
      phase: input.phase.slice(0, 40),
      utm,
    });
  } catch (err) {
    // Falha nossa não pode travar o resultado de quem respondeu tudo: a pessoa segue e o erro fica no log
    console.error("[saveLeadAction] Failed:", err);
  }
  return {};
}
