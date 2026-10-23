import { sendEmail, type EmailMessage } from "./email";
import { getAccess, trialDays } from "./billing";
import { loadTrialRecap, type TrialRecap } from "./trial-recap";

/*
 * E-mails do teste grátis, no máximo um de cada por pessoa (tabela email_log, migração 0018):
 * - boas-vindas: de 20 min a 24 h depois do cadastro (quando o Théo já montou o plano), com os 3 passos;
 * - teste-acaba-amanha: nas últimas 24 h do teste, com o resumo do que a pessoa fez;
 * - teste-acabou: até 48 h depois do fim, se ela não assinou.
 * Todos saem do cron de hora em hora (runTrialEmails).
 */

type EmailKind = "boas-vindas" | "teste-acaba-amanha" | "teste-acabou";

const HOUR_MS = 3_600_000;

const COLORS = { bg: "#0b0d0b", card: "#151915", border: "#262b26", text: "#f1f5f1", muted: "#9aa59a", green: "#5ee36a" };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

const liters = (ml: number) => `${(ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L`;

/** Moldura dos e-mails: fundo escuro, cartão, botão verde e rodapé explicando o porquê do e-mail */
function layout({ preheader, body, cta }: { preheader: string; body: string; cta: { label: string; href: string } }): string {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${COLORS.bg};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:20px;">
<tr><td style="padding:28px 24px 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:1px;color:${COLORS.green};">TREINAI</td></tr>
<tr><td style="padding:8px 24px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:${COLORS.text};">${body}</td></tr>
<tr><td style="padding:24px;">
<a href="${cta.href}" style="display:block;text-align:center;background:${COLORS.green};color:#0b1a0c;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;text-decoration:none;padding:16px;border-radius:999px;">${escapeHtml(cta.label)}</a>
</td></tr>
</table>
<p style="max-width:520px;margin:16px auto 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${COLORS.muted};">
Você recebe este e-mail porque criou uma conta no Treinai. São só 3 e-mails no seu teste grátis.
</p>
</td></tr></table>
</body></html>`;
}

const p = (html: string) => `<p style="margin:0 0 14px;">${html}</p>`;
const list = (items: string[]) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 14px;">${items
    .map(
      (item) =>
        `<tr><td style="padding:4px 10px 4px 0;vertical-align:top;color:${COLORS.green};font-weight:bold;">•</td><td style="padding:4px 0;color:${COLORS.text};">${item}</td></tr>`,
    )
    .join("")}</table>`;

/** "Fulana, " ou vazio, para abrir as frases */
const hi = (recap: TrialRecap) => (recap.firstName ? `${escapeHtml(recap.firstName)}, ` : "");

/** O que a pessoa fez no teste, só o que não for zero */
function doneLines(r: TrialRecap): string[] {
  return [
    r.workoutsDone > 0 && `<strong>${r.workoutsDone}</strong> ${r.workoutsDone === 1 ? "treino concluído" : "treinos concluídos"}`,
    r.records > 0 && `<strong>${r.records}</strong> ${r.records === 1 ? "recorde batido" : "recordes batidos"}`,
    r.streakDays > 0 && `<strong>${r.streakDays}</strong> ${r.streakDays === 1 ? "dia" : "dias"} de constância`,
    r.meals > 0 && `<strong>${r.meals}</strong> ${r.meals === 1 ? "refeição registrada" : "refeições registradas"}`,
    r.waterMl > 0 && `<strong>${liters(r.waterMl)}</strong> de água registrados`,
    r.coachMessages > 0 && `<strong>${r.coachMessages}</strong> ${r.coachMessages === 1 ? "conversa" : "conversas"} com o Théo`,
  ].filter(Boolean) as string[];
}

const STOPS = [
  "Conversar com o Théo, por texto e por voz",
  "Registrar refeição pela foto do prato",
  "Montar o cardápio da semana",
  "Análise do corpo por foto",
];

export function welcomeEmail(recap: TrialRecap, to: string, appUrl: string, days: number): EmailMessage {
  return {
    to,
    subject: `Seu teste de ${days} dias com o Théo começou`,
    html: layout({
      preheader: "3 passos para aproveitar o teste desde hoje.",
      body: [
        p(`${recap.firstName ? `Oi, ${escapeHtml(recap.firstName)}!` : "Oi!"} Aqui é o Théo, seu personal no Treinai.`),
        p(
          recap.workoutsCreated > 0
            ? `Seu plano já está montado: <strong>${recap.workoutsCreated} ${recap.workoutsCreated === 1 ? "treino" : "treinos"}</strong> pro seu nível. Você tem ${days} dias de teste grátis, com tudo liberado.`
            : `Você tem ${days} dias de teste grátis, com tudo liberado. Me conta seu objetivo no chat que eu monto seu treino na hora.`,
        ),
        p("Pra aproveitar de verdade, faça estes 3 passos:"),
        list([
          "<strong>Faça o primeiro treino</strong>, com o vídeo de cada exercício na tela",
          "<strong>Registre uma refeição</strong> tirando foto do prato",
          "<strong>Monte o cardápio da semana</strong>, com a lista de compras",
        ]),
      ].join(""),
      cta: { label: "Abrir o Treinai", href: appUrl },
    }),
  };
}

export function trialEndingEmail(recap: TrialRecap, to: string, appUrl: string, hoursLeft: number): EmailMessage {
  const when = hoursLeft <= 12 ? "hoje" : "amanhã";
  const done = doneLines(recap);
  return {
    to,
    subject: `${recap.firstName ? `${recap.firstName}, seu` : "Seu"} teste grátis acaba ${when}`,
    html: layout({
      preheader: "Seus treinos ficam salvos. O Théo é que para.",
      body: [
        p(`${hi(recap)}seu teste grátis no Treinai acaba <strong>${when}</strong>.`),
        done.length > 0
          ? p(`Até aqui, você já fez isso:`) + list(done)
          : p("Ainda dá tempo de fazer o primeiro treino e sentir a diferença. Seu plano está pronto te esperando."),
        recap.goal
          ? p(`Sua meta é chegar a <strong>${recap.goal.targetKg.toLocaleString("pt-BR")} kg</strong>. Dá pra continuar exatamente de onde você parou.`)
          : "",
        p("Seus treinos e registros ficam salvos. Sem assinatura, isto para:"),
        list(STOPS),
      ].join(""),
      cta: { label: "Continuar com o Théo", href: `${appUrl}/assinar` },
    }),
  };
}

export function trialEndedEmail(recap: TrialRecap, to: string, appUrl: string): EmailMessage {
  const done = doneLines(recap);
  return {
    to,
    subject: "Seu teste acabou, mas seus treinos continuam salvos",
    html: layout({
      preheader: "Assine e continue de onde parou, com o Théo.",
      body: [
        p(`${hi(recap)}seu teste grátis acabou.`),
        done.length > 0 ? p("Tudo o que você fez continua na sua conta:") + list(done) : "",
        p(
          "Pra voltar a falar com o Théo, registrar comida pela foto e montar o cardápio, é só escolher um plano. Você continua exatamente de onde parou.",
        ),
      ].join(""),
      cta: { label: "Ver os planos", href: `${appUrl}/assinar` },
    }),
  };
}

/** Grava o envio antes de mandar (a chave primária impede repetir); se o envio falhar, libera para a próxima hora */
async function sendOnce(env: Env, userId: string, kind: EmailKind, build: () => Promise<EmailMessage | null>): Promise<boolean> {
  const inserted = await env.DB.prepare("INSERT OR IGNORE INTO email_log (user_id, kind, sent_at) VALUES (?, ?, ?)")
    .bind(userId, kind, new Date().toISOString())
    .run();
  if (!inserted.meta.changes) return false;
  try {
    const message = await build();
    if (!message) return false;
    await sendEmail(env, message);
    return true;
  } catch (err) {
    await env.DB.prepare("DELETE FROM email_log WHERE user_id = ? AND kind = ?").bind(userId, kind).run();
    throw err;
  }
}

/** Boas-vindas para quem se cadastrou entre 24 h e 20 min atrás (dá tempo do onboarding montar o plano) */
async function sendWelcomeEmails(env: Env, now: Date): Promise<void> {
  const { results: users } = await env.DB.prepare(
    "SELECT id, email FROM users WHERE created_at > ? AND created_at <= ? AND trial_ends_at IS NOT NULL",
  )
    .bind(new Date(now.getTime() - 24 * HOUR_MS).toISOString(), new Date(now.getTime() - 20 * 60_000).toISOString())
    .all<{ id: string; email: string }>();
  for (const user of users) {
    try {
      await sendOnce(env, user.id, "boas-vindas", async () => {
        const recap = await loadTrialRecap(env.DB, user.id);
        return recap ? welcomeEmail(recap, user.email, env.APP_URL, trialDays(env)) : null;
      });
    } catch (err) {
      console.error(JSON.stringify({ message: "welcome email failed", userId: user.id, error: err instanceof Error ? err.message : String(err) }));
    }
  }
}

/** Cron de hora em hora: boas-vindas, aviso nas últimas 24 h do teste e aviso de quem acabou de perder o acesso */
export async function runTrialEmails(env: Env, now = new Date()): Promise<void> {
  // Com o remetente de teste do Resend, só o dono da conta recebe: espera um domínio verificado em EMAIL_FROM
  if (!env.EMAIL_FROM || env.EMAIL_FROM.includes("@resend.dev")) {
    console.warn("EMAIL_FROM ainda é o remetente de teste do Resend; e-mails do teste grátis não enviados.");
    return;
  }

  try {
    await sendWelcomeEmails(env, now);
  } catch (err) {
    console.error(JSON.stringify({ message: "welcome emails query failed", error: err instanceof Error ? err.message : String(err) }));
  }

  let users: { id: string; email: string; trial_ends_at: string }[];
  try {
    ({ results: users } = await env.DB.prepare(
      `SELECT id, email, trial_ends_at FROM users
       WHERE trial_ends_at IS NOT NULL AND trial_ends_at > ? AND trial_ends_at <= ?`,
    )
      .bind(new Date(now.getTime() - 48 * HOUR_MS).toISOString(), new Date(now.getTime() + 24 * HOUR_MS).toISOString())
      .all<{ id: string; email: string; trial_ends_at: string }>());
  } catch (err) {
    console.error(JSON.stringify({ message: "trial emails query failed", error: err instanceof Error ? err.message : String(err) }));
    return;
  }

  for (const user of users) {
    try {
      // Quem já assinou (ou tem acesso liberado) não recebe aviso de fim de teste
      if ((await getAccess(env, user.id)).subscription?.status === "active") continue;
      const msLeft = Date.parse(user.trial_ends_at) - now.getTime();
      if (msLeft > 0) {
        await sendOnce(env, user.id, "teste-acaba-amanha", async () => {
          const recap = await loadTrialRecap(env.DB, user.id);
          return recap ? trialEndingEmail(recap, user.email, env.APP_URL, msLeft / HOUR_MS) : null;
        });
      } else {
        await sendOnce(env, user.id, "teste-acabou", async () => {
          const recap = await loadTrialRecap(env.DB, user.id);
          return recap ? trialEndedEmail(recap, user.email, env.APP_URL) : null;
        });
      }
    } catch (err) {
      console.error(JSON.stringify({ message: "trial email failed", userId: user.id, error: err instanceof Error ? err.message : String(err) }));
    }
  }
}
