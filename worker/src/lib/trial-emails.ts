import { sendEmail, type EmailMessage } from "./email";
import { bullets, escapeHtml, layout, p, stats, steps } from "./email-layout";
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

const liters = (ml: number) => `${(ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L`;

const REASON = "Você recebe este e-mail porque criou uma conta no Treinai. São só 3 e-mails no seu teste grátis.";

/** "Fulana, " ou vazio, para abrir as frases */
const hi = (recap: TrialRecap) => (recap.firstName ? `${escapeHtml(recap.firstName)}, ` : "");

/** O que a pessoa fez no teste, em números, só o que não for zero */
function doneStats(r: TrialRecap): { value: string; label: string }[] {
  const items: ({ value: string; label: string } | false)[] = [
    r.workoutsDone > 0 && { value: String(r.workoutsDone), label: r.workoutsDone === 1 ? "treino concluído" : "treinos concluídos" },
    r.records > 0 && { value: String(r.records), label: r.records === 1 ? "recorde batido" : "recordes batidos" },
    r.streakDays > 0 && { value: String(r.streakDays), label: r.streakDays === 1 ? "dia de constância" : "dias de constância" },
    r.meals > 0 && { value: String(r.meals), label: r.meals === 1 ? "refeição registrada" : "refeições registradas" },
    r.waterMl > 0 && { value: liters(r.waterMl), label: "de água registrados" },
    r.coachMessages > 0 && { value: String(r.coachMessages), label: r.coachMessages === 1 ? "conversa com o Théo" : "conversas com o Théo" },
  ];
  return items.filter((i): i is { value: string; label: string } => Boolean(i));
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
      appUrl,
      preheader: "3 passos para aproveitar o teste desde hoje.",
      eyebrow: `TESTE GRÁTIS · ${days} DIAS`,
      title: recap.firstName ? `${recap.firstName}, seu teste começou!` : "Seu teste começou!",
      hero: { src: "/email/theo-hero.png", alt: "Théo, seu personal no Treinai", size: 120, round: true },
      body: [
        p("Aqui é o Théo, seu personal no Treinai."),
        p(
          recap.workoutsCreated > 0
            ? `Seu plano já está montado: <strong>${recap.workoutsCreated} ${recap.workoutsCreated === 1 ? "treino" : "treinos"}</strong> pro seu nível. Você tem ${days} dias com tudo liberado.`
            : `Você tem ${days} dias com tudo liberado. Me conta seu objetivo no chat que eu monto seu treino na hora.`,
        ),
        p("Pra aproveitar de verdade, comece por aqui:"),
        steps([
          "<strong>Faça o primeiro treino</strong>, com a demonstração de cada exercício na tela",
          "<strong>Registre uma refeição</strong> tirando foto do prato",
          "<strong>Monte o cardápio da semana</strong>, com a lista de compras",
        ]),
      ].join(""),
      cta: { label: "Abrir o Treinai", href: appUrl },
      ctaNote: "Dica: coloque o Treinai na tela inicial do celular para abrir como app.",
      reason: REASON,
    }),
  };
}

export function trialEndingEmail(recap: TrialRecap, to: string, appUrl: string, hoursLeft: number): EmailMessage {
  const when = hoursLeft <= 12 ? "hoje" : "amanhã";
  const done = doneStats(recap);
  return {
    to,
    subject: `${recap.firstName ? `${recap.firstName}, seu` : "Seu"} teste grátis acaba ${when}`,
    html: layout({
      appUrl,
      preheader: "Seus treinos ficam salvos. O Théo é que para.",
      eyebrow: `TESTE GRÁTIS · ACABA ${when.toUpperCase()}`,
      title: `Seu teste grátis acaba ${when}`,
      hero: { src: "/illustrations/trial.png", alt: "Ampulheta", size: 120 },
      body: [
        done.length > 0
          ? p(`${hi(recap)}olha o que você já conquistou até aqui:`) + stats(done)
          : p(`${hi(recap)}ainda dá tempo de fazer o primeiro treino e sentir a diferença. Seu plano está pronto te esperando.`),
        recap.goal
          ? p(`Sua meta é chegar a <strong>${recap.goal.targetKg.toLocaleString("pt-BR")} kg</strong>. Dá pra continuar exatamente de onde você parou.`)
          : "",
        p("Seus treinos e registros ficam salvos. Sem assinatura, isto para:"),
        bullets(STOPS),
      ].join(""),
      cta: { label: "Continuar com o Théo", href: `${appUrl}/assinar` },
      ctaNote: "Assine em 1 minuto e não perde nenhum dia.",
      reason: REASON,
    }),
  };
}

export function trialEndedEmail(recap: TrialRecap, to: string, appUrl: string): EmailMessage {
  const done = doneStats(recap);
  return {
    to,
    subject: "Seu teste acabou, mas seus treinos continuam salvos",
    html: layout({
      appUrl,
      preheader: "Assine e continue de onde parou, com o Théo.",
      eyebrow: "SEU TESTE GRÁTIS ACABOU",
      title: "Seus treinos continuam aqui",
      hero: { src: "/illustrations/trial.png", alt: "Ampulheta", size: 120 },
      body: [
        done.length > 0
          ? p(`${hi(recap)}seu teste grátis acabou, mas tudo o que você fez continua na sua conta:`) + stats(done)
          : p(`${hi(recap)}seu teste grátis acabou, mas sua conta e seu plano continuam salvos.`),
        p(
          "Pra voltar a falar com o Théo, registrar comida pela foto e montar o cardápio, é só escolher um plano. Você continua exatamente de onde parou.",
        ),
      ].join(""),
      cta: { label: "Ver os planos", href: `${appUrl}/assinar` },
      reason: REASON,
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
