import { layout, p } from "./email-layout";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envia um e-mail pelo Resend. O remetente vem de EMAIL_FROM (wrangler.jsonc): o padrão
 * onboarding@resend.dev só entrega para o dono da conta Resend; use um domínio verificado.
 */
export async function sendEmail(env: Env, message: EmailMessage): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY não configurada — e-mail não enviado.", { to: message.to, subject: message.subject });
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM || "Treinai <onboarding@resend.dev>",
      to: [message.to],
      subject: message.subject,
      html: message.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Falha ao enviar e-mail via Resend: ${res.status} ${body}`);
  }
}

export function passwordResetEmail(to: string, resetUrl: string, appUrl: string): EmailMessage {
  return {
    to,
    subject: "Redefinir sua senha — Treinai",
    html: layout({
      appUrl,
      preheader: "O link vale por 1 hora.",
      eyebrow: "SUA CONTA",
      title: "Vamos criar uma senha nova",
      body: [
        p("Recebemos um pedido para redefinir a senha da sua conta no Treinai."),
        p("Toque no botão abaixo para escolher a nova senha. O link vale por <strong>1 hora</strong>."),
      ].join(""),
      cta: { label: "Criar nova senha", href: resetUrl },
      ctaNote: "Se não foi você que pediu, ignore este e-mail: sua senha continua a mesma.",
      reason: "Você recebe este e-mail porque alguém pediu para redefinir a senha desta conta.",
    }),
  };
}

export async function sendPasswordResetEmail(env: Env, to: string, resetUrl: string): Promise<void> {
  await sendEmail(env, passwordResetEmail(to, resetUrl, env.APP_URL));
}
