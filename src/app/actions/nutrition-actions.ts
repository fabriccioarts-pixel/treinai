"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { workerApi, WorkerApiError } from "@/lib/worker-api";
import type { ProfileInput } from "@/lib/nutrition";

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
