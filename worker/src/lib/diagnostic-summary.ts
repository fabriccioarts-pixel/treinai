/*
 * Respostas do diagnóstico (quiz público, antes do cadastro) ligadas à conta pelo e-mail.
 * Viram uma seção do contexto do Théo, para ele personalizar o plano sem perguntar de novo,
 * e servem para pré-preencher o perfil no onboarding.
 */

export type DiagnosticAnswers = Record<string, string>;

/** Rótulos das respostas, iguais aos do quiz (src/lib/diagnostico.ts) */
const LABELS: Record<string, Record<string, string>> = {
  sexo: { f: "mulher", m: "homem", x: "prefere não dizer" },
  objetivo: {
    emagrecer: "emagrecer e definir",
    massa: "ganhar massa muscular",
    forca: "ficar mais forte",
    saude: "ter mais disposição e saúde",
  },
  experiencia: {
    nunca: "nunca treinou",
    parei: "já treinou, mas parou",
    "menos-1": "treina há menos de 1 ano",
    "mais-1": "treina há mais de 1 ano",
  },
  frequencia: { "0": "nenhum dia", "1-2": "1 ou 2 dias", "3-4": "3 ou 4 dias", "5+": "5 dias ou mais" },
  carga: {
    sempre: "sim, treino a treino",
    "as-vezes": "às vezes, quando lembra",
    nunca: "não, pega o peso que dá",
    "nao-treino": "ainda não treina",
  },
  bloqueio: {
    "nao-sabe": "não sabe o que fazer na academia",
    vergonha: "vergonha de começar do zero",
    tempo: "falta de tempo",
    para: "começa e para no meio",
    resultado: "treina, mas não vê resultado",
  },
  local: {
    academia: "academia completa",
    "academia-pequena": "academia pequena, com poucas máquinas",
    "casa-halteres": "em casa, com halteres",
    casa: "em casa, sem equipamento (só peso do corpo)",
  },
  tempo: { "30": "30 min", "45": "45 min", "60": "1 hora", "75": "mais de 1 hora" },
  recomecos: {
    mantive: "começou e manteve",
    "1-2": "começou e parou uma ou duas vezes",
    muitas: "já começou e parou muitas vezes",
    "nunca-comecei": "nunca chegou a começar",
  },
  falta: {
    volto: "volta no dia seguinte",
    dias: "leva uns dias para retomar",
    semana: "larga o resto da semana",
    paro: "desanima e para de vez",
  },
  sono: {
    "<5": "menos de 5 horas",
    "5-6": "entre 5 e 6 horas",
    "6-7": "entre 6 e 7 horas",
    "7-9": "entre 7 e 9 horas",
    "9+": "mais de 9 horas",
  },
  ultraprocessados: { nunca: "quase nunca", "1-2": "1 ou 2 dias por semana", "3-5": "3 a 5 dias por semana", todo: "todo dia" },
  proteina: { maioria: "na maioria das refeições", "1-2": "em 1 ou 2 refeições", raro: "raramente" },
};

const CONDITION_LABELS: Record<string, string> = {
  condromalacia: "condromalácia (desgaste no joelho)",
  joelho: "outra lesão no joelho",
  lombar: "dor lombar ou hérnia de disco",
  ombro: "dor no ombro",
  punho: "tendinite ou dor no punho/cotovelo",
  quadril: "dor no quadril",
  tornozelo: "entorses frequentes no tornozelo",
  osteoporose: "osteoporose ou osteopenia",
  cardio: "hipertensão ou problema no coração",
  diabetes: "diabetes",
  gestacao: "gravidez ou pós-parto recente",
  outra: "outra condição não listada",
};

/** Diagnóstico mais recente feito com o e-mail da conta, ou null (sem diagnóstico ou tabela ainda inexistente) */
export async function loadDiagnosticAnswers(db: D1Database, userId: string): Promise<DiagnosticAnswers | null> {
  try {
    const row = await db
      .prepare("SELECT answers FROM leads WHERE user_id = ? ORDER BY created_at DESC LIMIT 1")
      .bind(userId)
      .first<{ answers: string }>();
    if (!row) return null;
    const parsed = JSON.parse(row.answers) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => typeof v === "string" || typeof v === "number").map(([k, v]) => [k, String(v)]),
    );
  } catch {
    return null;
  }
}

/** Seção do contexto do Théo; vazia quando a pessoa não fez o diagnóstico */
export function formatDiagnosticForCoach(answers: DiagnosticAnswers | null): string {
  if (!answers) return "";
  const label = (key: string) => LABELS[key]?.[answers[key]];
  const conditions = (answers.condicoes ?? "")
    .split(",")
    .map((c) => CONDITION_LABELS[c])
    .filter(Boolean);
  const glasses = Number(answers.copos);

  const lines = [
    label("objetivo") && `- Objetivo: ${label("objetivo")}`,
    answers.peso_meta && answers.peso && `- Peso hoje ${answers.peso} kg; peso meta ${answers.peso_meta} kg`,
    label("experiencia") && `- Experiência com musculação: ${label("experiencia")}`,
    label("frequencia") && `- Treina hoje: ${label("frequencia")} por semana`,
    answers.dias && `- Dias disponíveis para treinar: ${answers.dias} por semana`,
    label("local") && `- Onde treina: ${label("local")} (use só exercícios possíveis nesse lugar)`,
    label("tempo") && `- Tempo por treino: ${label("tempo")} (ajuste o número de exercícios e séries a esse tempo)`,
    label("carga") && `- Aumenta a carga com o tempo: ${label("carga")}`,
    label("bloqueio") && `- O que mais atrapalha: ${label("bloqueio")}`,
    label("recomecos") && `- Histórico: ${label("recomecos")}; quando perde um treino, ${label("falta") ?? "não informou"}`,
    conditions.length > 0 &&
      `- Condições de saúde informadas: ${conditions.join("; ")}. Evite exercícios que forcem essas regiões e, em caso de coração, pressão, diabetes, gestação ou osteoporose, lembre de pedir liberação médica.`,
    label("sono") && `- Sono: ${label("sono")} por noite`,
    label("ultraprocessados") && `- Ultraprocessados: ${label("ultraprocessados")}`,
    label("proteina") && `- Come proteína: ${label("proteina")}`,
    Number.isFinite(glasses) && answers.copos !== undefined && `- Água: cerca de ${glasses} copos de 250 ml por dia`,
  ].filter(Boolean);

  if (lines.length === 0) return "";
  return `

DIAGNÓSTICO INICIAL (quiz que a pessoa respondeu antes de criar a conta; use para personalizar treino e conversa e não pergunte de novo o que já está aqui):
${lines.join("\n")}`;
}
