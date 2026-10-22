"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { workerApi, WorkerApiError } from "@/lib/worker-api";
import { PAYWALL_MESSAGE } from "@/lib/billing";
import type { MealPlanPreferences, SavedMealPlan } from "@/lib/meal-plan";

export interface GenerateMealPlanResult {
  mealPlan?: SavedMealPlan;
  error?: string;
  paywall?: boolean;
}

/** Gera um cardápio novo (leva cerca de 1 minuto: a página aumenta o tempo máximo da action) */
export async function generateMealPlanAction(preferences: MealPlanPreferences): Promise<GenerateMealPlanResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada. Entre novamente." };

  try {
    const { mealPlan } = await workerApi.createMealPlan(session.user.id, {
      ...preferences,
      avoid: preferences.avoid.trim().slice(0, 200),
    });
    revalidatePath("/cardapio");
    return { mealPlan };
  } catch (err) {
    console.error("[generateMealPlanAction] Failed:", err);
    if (err instanceof WorkerApiError) {
      if (err.status === 402) return { error: PAYWALL_MESSAGE, paywall: true };
      if (err.status === 409) return { error: "Preencha seu perfil de nutrição primeiro: é dele que saem as metas do cardápio." };
      if (err.status === 429) return { error: "Você já montou 3 cardápios hoje. Amanhã dá pra montar outro." };
      if (err.status === 503) return { error: "A montagem de cardápio ainda não foi configurada neste app." };
    }
    return { error: "Não deu pra montar o cardápio agora. Tente de novo em instantes." };
  }
}
