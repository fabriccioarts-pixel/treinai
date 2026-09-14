
export async function sendPasswordResetEmail(
  env: Env,
  to: string,
  resetUrl: string
): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY não configurada — e-mail de redefinição não enviado.", {
      to,
      resetUrl,
    });
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Treinai <onboarding@resend.dev>",
      to: [to],
      subject: "Redefinir sua senha — Treinai",
      html: `
        <p>Recebemos um pedido para redefinir sua senha no Treinai.</p>
        <p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a>. Este link expira em 1 hora.</p>
        <p>Se você não pediu isso, ignore este e-mail.</p>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Falha ao enviar e-mail via Resend: ${res.status} ${body}`);
  }
}
