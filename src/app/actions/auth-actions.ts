"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { workerApi, WorkerApiError } from "@/lib/worker-api";

export interface ActionState {
  error?: string;
  ok?: boolean;
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 8) {
    return { error: "Preencha nome, e-mail e uma senha com pelo menos 8 caracteres." };
  }

  try {
    await workerApi.register(email, name, password);
  } catch (err) {
    if (err instanceof WorkerApiError && err.code === "email_taken") {
      return { error: "Esse e-mail já está cadastrado. Tente entrar." };
    }
    return { error: "Não foi possível criar sua conta agora. Tente novamente." };
  }

  await signIn("credentials", { email, password, redirectTo: "/" });
  return {};
}

export async function requestResetAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Informe seu e-mail." };

  await workerApi.requestPasswordReset(email);
  return { ok: true };
}

export async function confirmResetAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) return { error: "Link inválido. Solicite a redefinição novamente." };
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  if (password !== confirmPassword) return { error: "As senhas não coincidem." };

  try {
    await workerApi.confirmPasswordReset(token, password);
  } catch {
    return { error: "Link inválido ou expirado. Solicite um novo." };
  }

  redirect("/login?reset=success");
}
