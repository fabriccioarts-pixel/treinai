"use server";

import { refresh } from "next/cache";
import { auth } from "@/auth";
import { WorkerApiError, workerApi } from "@/lib/worker-api";
import { BODY_POSES, type BodyAnalysis, type BodyPose } from "@/lib/body-photos";

/*
 * Fotos do corpo: consentimento, envio, exclusão e análise do shape.
 * O worker confere o consentimento e o dono de cada foto; aqui só entra quem está logado.
 */

const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export async function setBodyConsentAction(input: {
  photos: boolean;
  ai: boolean;
  adult?: boolean;
}): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada." };
  try {
    await workerApi.setBodyConsent(session.user.id, input);
  } catch (err) {
    if (err instanceof WorkerApiError && err.code === "adult_required") {
      return { error: "Confirme que você tem 18 anos ou mais para guardar fotos do corpo." };
    }
    return { error: "Não foi possível salvar sua escolha agora. Tente novamente." };
  }
  refresh();
  return {};
}

export async function uploadBodyPhotoAction(pose: BodyPose, formData: FormData): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada." };
  if (!BODY_POSES.includes(pose)) return { error: "Pose inválida." };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione uma foto." };
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) return { error: "Formato não suportado. Use JPEG, PNG ou WebP." };
  if (file.size > MAX_PHOTO_BYTES) return { error: "A foto deve ter até 8 MB." };

  try {
    await workerApi.uploadBodyPhoto(session.user.id, pose, await file.arrayBuffer(), file.type);
  } catch (err) {
    if (err instanceof WorkerApiError && err.code === "consent_required") {
      return { error: "Autorize o armazenamento das fotos antes de enviar." };
    }
    return { error: "Não foi possível enviar a foto agora. Tente novamente." };
  }
  refresh();
  return {};
}

export async function deleteBodyPhotoAction(id: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada." };
  try {
    await workerApi.deleteBodyPhoto(session.user.id, id);
  } catch {
    return { error: "Não foi possível apagar a foto agora." };
  }
  refresh();
  return {};
}

/** Apaga fotos, análises e consentimentos (o direito de eliminação da LGPD, num toque) */
export async function deleteAllBodyDataAction(): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada." };
  try {
    await workerApi.deleteAllBodyData(session.user.id);
  } catch {
    return { error: "Não foi possível apagar agora. Tente novamente." };
  }
  refresh();
  return {};
}

export async function analyzeBodyAction(
  takenOn: string,
): Promise<{ analysis?: BodyAnalysis; error?: string; paywall?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada." };
  try {
    const { analysis } = await workerApi.analyzeBody(session.user.id, takenOn);
    refresh();
    return { analysis };
  } catch (err) {
    if (err instanceof WorkerApiError) {
      if (err.status === 402) return { error: "Seu teste grátis acabou. Assine para analisar o shape.", paywall: true };
      if (err.code === "consent_required") return { error: "Autorize a análise pela IA para continuar." };
      if (err.code === "front_photo_required") return { error: "Tire pelo menos a foto de frente desse dia." };
      if (err.code === "daily_limit") return { error: "Você já fez 3 análises hoje. Tente amanhã." };
      if (err.code === "unsuitable_photos") {
        return { error: "Não deu para avaliar essas fotos. Confira o guia: corpo inteiro, boa luz e roupa justa." };
      }
      if (err.code === "busy") return { error: "Muita gente usando agora. Tente de novo em instantes." };
      if (err.code === "ai_not_configured") return { error: "A análise por IA não está disponível agora." };
    }
    return { error: "Não consegui analisar agora. Tente de novo em instantes." };
  }
}

export async function createWorkoutFromBodyAnalysisAction(
  analysisId: string,
): Promise<{ workoutId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada." };
  try {
    const { workoutId } = await workerApi.createWorkoutFromBodyAnalysis(session.user.id, analysisId);
    refresh();
    return { workoutId };
  } catch {
    return { error: "Não foi possível criar o treino agora." };
  }
}
