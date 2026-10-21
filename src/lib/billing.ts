/*
 * Planos e teste grátis: só formatação para a interface.
 * Preço e duração do teste vêm do worker (worker/src/lib/billing.ts), que é quem cobra.
 */
import type { Plan } from "@/lib/worker-api";

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Preço por mês (o trimestral é cobrado de uma vez, a cada 3 meses) */
export function monthlyCents(plan: Plan): number {
  return Math.round(plan.amountCents / plan.months);
}

/** Preço por dia, para comparar com um lanche ou um café */
export function dailyCents(plan: Plan): number {
  return Math.round(plan.amountCents / (plan.months * 30));
}

/** Desconto do plano em relação ao mensal, em % inteiro */
export function savingsPct(plan: Plan, monthly: Plan): number {
  return Math.round((1 - monthlyCents(plan) / monthly.amountCents) * 100);
}

/** Dias que faltam (arredondado para cima: "termina hoje" só quando faltam menos de 24 h) */
export function daysLeft(until: string | null, now = Date.now()): number {
  if (!until) return 0;
  return Math.max(0, Math.ceil((Date.parse(until) - now) / (24 * 60 * 60_000)));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });
}

export const PAYWALL_MESSAGE = "Seu teste grátis acabou. Assine para continuar falando com o Théo.";
