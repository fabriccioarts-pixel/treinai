"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { workerApi, WorkerApiError } from "@/lib/worker-api";
import type { MealEstimate, MealItem, MealType, ProfileInput } from "@/lib/nutrition";

export interface SaveProfileResult {
  error?: string;
}

export async function saveProfileAction(
  input: ProfileInput & { healthConsent: boolean },
  redirectTo?: string,
): Promise<SaveProfileResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada." };
  if (!input.healthConsent) {
    return { error: "Para calcular seu plano, precisamos do seu consentimento para usar esses dados." };
  }

  try {
    await workerApi.saveProfile(session.user.id, { ...input, healthConsent: true });
  } catch (err) {
    if (err instanceof WorkerApiError && err.code === "invalid_age") {
      return { error: "Confira sua data de nascimento. O Treinai é para quem tem 13 anos ou mais." };
    }
    if (err instanceof WorkerApiError && err.code === "invalid_profile") {
      return { error: "Algum dado está fora do esperado. Confira altura, peso e horários." };
    }
    return { error: "Não foi possível salvar agora. Tente novamente." };
  }

  revalidatePath("/");
  revalidatePath("/perfil");
  if (redirectTo) redirect(redirectTo);
  return {};
}

export async function deleteProfileAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await workerApi.deleteProfile(session.user.id);
  revalidatePath("/");
  revalidatePath("/perfil");
  redirect("/perfil");
}

export async function logWaterAction(amountMl: number): Promise<{ id?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada." };

  try {
    const { id } = await workerApi.logWater(session.user.id, amountMl);
    revalidatePath("/");
    return { id };
  } catch {
    return { error: "Não foi possível registrar agora." };
  }
}

export async function undoWaterAction(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await workerApi.deleteWater(session.user.id, id).catch(() => {});
  revalidatePath("/");
}

const ALLOWED_MEAL_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function analyzeMealAction(
  input: { photoBase64: string; mediaType: string } | { text: string },
): Promise<{ estimate?: MealEstimate; error?: string; paywall?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada." };

  let payload: Parameters<typeof workerApi.analyzeMeal>[1];
  if ("text" in input) {
    const text = input.text.trim();
    if (text.length < 2) return { error: "Descreva o que você comeu." };
    payload = { text: text.slice(0, 500) };
  } else {
    if (!ALLOWED_MEAL_PHOTO_TYPES.has(input.mediaType)) return { error: "Formato de foto não suportado." };
    payload = {
      photo: { base64: input.photoBase64, mediaType: input.mediaType as "image/jpeg" | "image/png" | "image/webp" },
    };
  }

  try {
    const estimate = await workerApi.analyzeMeal(session.user.id, payload);
    if (estimate.items.length === 0) {
      return { error: estimate.note || "Não consegui identificar alimentos. Tente outra foto ou descreva em texto." };
    }
    return { estimate };
  } catch (err) {
    if (err instanceof WorkerApiError && err.status === 402) {
      return { error: "Seu teste grátis acabou. Assine para continuar analisando refeições por foto.", paywall: true };
    }
    if (err instanceof WorkerApiError && err.code === "busy") {
      return { error: "Muita gente registrando agora. Tente de novo em instantes." };
    }
    return { error: "Não consegui analisar agora. Tente de novo ou descreva em texto." };
  }
}

export async function saveMealAction(input: {
  mealType: MealType;
  source: "foto" | "texto";
  items: MealItem[];
}): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada." };
  if (input.items.length === 0) return { error: "Adicione pelo menos um alimento." };

  try {
    await workerApi.saveMeal(session.user.id, input);
  } catch {
    return { error: "Não foi possível salvar a refeição. Tente novamente." };
  }
  revalidatePath("/");
  return {};
}

export async function deleteMealAction(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await workerApi.deleteMeal(session.user.id, id).catch(() => {});
  revalidatePath("/");
}
