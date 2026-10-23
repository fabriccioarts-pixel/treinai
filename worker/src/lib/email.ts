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

export async function sendPasswordResetEmail(env: Env, to: string, resetUrl: string): Promise<void> {
  await sendEmail(env, {
    to,
    subject: "Redefinir sua senha — Treinai",
    html: `
        <p>Recebemos um pedido para redefinir sua senha no Treinai.</p>
        <p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a>. Este link expira em 1 hora.</p>
        <p>Se você não pediu isso, ignore este e-mail.</p>
      `,
  });
}
