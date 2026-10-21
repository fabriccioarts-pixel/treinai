import type { Metadata } from "next";
import { DiagnosticoQuiz } from "@/components/diagnostico/diagnostico-quiz";
import { workerApi, type Plan } from "@/lib/worker-api";

export const metadata: Metadata = {
  title: "Diagnóstico grátis de treino e hábitos — Treinai",
  description:
    "Responda em 3 minutos e veja sua nota de 0 a 100 em treino, constância, sono, alimentação e água, com um plano pra começar.",
};

/** Usado só se o worker não responder: a página de entrada dos anúncios não pode cair */
const FALLBACK_PLANS: Plan[] = [
  { key: "mensal", label: "Plano Mensal", months: 1, amountCents: 4990 },
  { key: "trimestral", label: "Plano Trimestral", months: 3, amountCents: 11970 },
];

export default async function DiagnosticoPage() {
  const { plans, trialDays } = await workerApi.getPlans().catch(() => ({ plans: FALLBACK_PLANS, trialDays: 3 }));
  return <DiagnosticoQuiz plans={plans} trialDays={trialDays} />;
}
