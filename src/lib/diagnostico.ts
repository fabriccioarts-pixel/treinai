/*
 * Diagnóstico gratuito (topo do funil, página pública /diagnostico).
 * Tudo calculado aqui, por regras fixas: nenhuma chamada de IA antes de a pessoa criar a conta.
 */

export type AreaKey = "treino" | "constancia" | "sono" | "alimentacao" | "hidratacao";

export interface Option {
  value: string;
  label: string;
  /** Nota de 0 a 100 que essa resposta dá para a área da pergunta */
  score?: number;
  /** Foto do cartão (layout "photos"); opções sem foto aparecem como botão comum embaixo */
  image?: string;
}

export type Step =
  | { id: string; kind: "single"; area?: AreaKey; section: string; title: string; hint?: string; options: Option[]; layout?: "chips" | "photos" }
  | { id: "nome"; kind: "name"; section: string; title: string; hint?: string }
  /** Várias respostas, gravadas separadas por vírgula; `exclusive` desmarca as outras */
  | { id: string; kind: "multi"; section: string; title: string; hint?: string; options: (Option & { exclusive?: boolean })[] }
  | { id: "copos"; kind: "glasses"; section: string; title: string; hint?: string }
  | { id: "medidas"; kind: "measures"; section: string; title: string; hint?: string }
  | { id: string; kind: "insight"; section: string };

export const STEPS: Step[] = [
  {
    id: "sexo",
    kind: "single",
    section: "Seu perfil",
    title: "Pra começar, como você se identifica?",
    layout: "photos",
    options: [
      { value: "f", label: "Mulher", image: "/quiz-fotos/mulher.jpg" },
      { value: "m", label: "Homem", image: "/quiz-fotos/homem.jpg" },
      { value: "x", label: "Prefiro não dizer" },
    ],
  },
  {
    id: "idade",
    kind: "single",
    section: "Seu perfil",
    title: "Qual a sua idade?",
    layout: "chips",
    options: [
      { value: "18-24", label: "18 a 24" },
      { value: "25-34", label: "25 a 34" },
      { value: "35-44", label: "35 a 44" },
      { value: "45-54", label: "45 a 54" },
      { value: "55+", label: "55 ou mais" },
    ],
  },
  {
    id: "objetivo",
    kind: "single",
    section: "Seu perfil",
    title: "O que você mais quer mudar agora?",
    options: [
      { value: "emagrecer", label: "Emagrecer e definir" },
      { value: "massa", label: "Ganhar massa muscular" },
      { value: "forca", label: "Ficar mais forte" },
      { value: "saude", label: "Ter mais disposição e saúde" },
    ],
  },
  { id: "nome", kind: "name", section: "Seu perfil", title: "Como posso te chamar?", hint: "Seu diagnóstico sai com o seu nome." },
  {
    id: "condicoes",
    kind: "multi",
    section: "Seu perfil",
    title: "Você tem alguma dessas condições?",
    hint: "Pode marcar mais de uma. Isso ajuda a montar um treino mais seguro pra você.",
    options: [
      { value: "condromalacia", label: "Condromalácia (desgaste no joelho)" },
      { value: "joelho", label: "Outra lesão no joelho (menisco, ligamento, tendinite)" },
      { value: "lombar", label: "Dor lombar ou hérnia de disco" },
      { value: "ombro", label: "Dor no ombro (tendinite, bursite, luxação)" },
      { value: "punho", label: "Tendinite ou dor no punho/cotovelo" },
      { value: "quadril", label: "Dor no quadril" },
      { value: "tornozelo", label: "Entorses frequentes no tornozelo" },
      { value: "osteoporose", label: "Osteoporose ou osteopenia" },
      { value: "cardio", label: "Hipertensão ou problema no coração" },
      { value: "diabetes", label: "Diabetes" },
      { value: "gestacao", label: "Gravidez ou pós-parto recente" },
      { value: "outra", label: "Outra condição não listada" },
      { value: "nenhuma", label: "Nenhuma dessas", exclusive: true },
    ],
  },
  {
    id: "experiencia",
    kind: "single",
    area: "treino",
    section: "Treino",
    title: "Qual é a sua experiência com musculação?",
    options: [
      { value: "nunca", label: "Nunca treinei", score: 20 },
      { value: "parei", label: "Já treinei, mas parei", score: 40 },
      { value: "menos-1", label: "Treino há menos de 1 ano", score: 65 },
      { value: "mais-1", label: "Treino há mais de 1 ano", score: 85 },
    ],
  },
  {
    id: "frequencia",
    kind: "single",
    area: "treino",
    section: "Treino",
    title: "Hoje, quantos dias por semana você treina?",
    options: [
      { value: "0", label: "Nenhum", score: 10 },
      { value: "1-2", label: "1 ou 2 dias", score: 45 },
      { value: "3-4", label: "3 ou 4 dias", score: 80 },
      { value: "5+", label: "5 dias ou mais", score: 95 },
    ],
  },
  {
    id: "carga",
    kind: "single",
    area: "treino",
    section: "Treino",
    title: "Você anota as cargas e tenta aumentar com o tempo?",
    options: [
      { value: "sempre", label: "Sempre, treino a treino", score: 100 },
      { value: "as-vezes", label: "Às vezes, quando lembro", score: 60 },
      { value: "nunca", label: "Não, pego o peso que dá", score: 25 },
      { value: "nao-treino", label: "Ainda não treino", score: 15 },
    ],
  },
  { id: "i_progressao", kind: "insight", section: "Treino" },
  {
    id: "bloqueio",
    kind: "single",
    section: "Treino",
    title: "O que mais te atrapalha hoje?",
    options: [
      { value: "nao-sabe", label: "Não sei o que fazer na academia" },
      { value: "vergonha", label: "Vergonha de começar do zero" },
      { value: "tempo", label: "Falta de tempo" },
      { value: "para", label: "Começo e paro no meio" },
      { value: "resultado", label: "Treino, mas não vejo resultado" },
    ],
  },
  {
    id: "dias",
    kind: "single",
    section: "Treino",
    title: "Quantos dias por semana dá pra treinar, de verdade?",
    hint: "Seja realista: constância vale mais que volume.",
    layout: "chips",
    options: ["2", "3", "4", "5", "6"].map((d) => ({ value: d, label: `${d} dias` })),
  },
  {
    id: "recomecos",
    kind: "single",
    area: "constancia",
    section: "Constância",
    title: "Quantas vezes você já começou a treinar e parou no meio?",
    options: [
      { value: "mantive", label: "Comecei e mantive", score: 95 },
      { value: "1-2", label: "Uma ou duas vezes", score: 65 },
      { value: "muitas", label: "Já perdi as contas", score: 25 },
      { value: "nunca-comecei", label: "Nunca cheguei a começar", score: 35 },
    ],
  },
  {
    id: "falta",
    kind: "single",
    area: "constancia",
    section: "Constância",
    title: "Quando você perde um treino, o que costuma acontecer?",
    options: [
      { value: "volto", label: "Volto no dia seguinte, normal", score: 95 },
      { value: "dias", label: "Levo uns dias pra retomar", score: 65 },
      { value: "semana", label: "Largo o resto da semana", score: 35 },
      { value: "paro", label: "Desanimo e paro de vez", score: 15 },
    ],
  },
  {
    id: "sono",
    kind: "single",
    area: "sono",
    section: "Sono",
    title: "Quantas horas você dorme numa noite normal?",
    options: [
      { value: "<5", label: "Menos de 5 horas", score: 15 },
      { value: "5-6", label: "Entre 5 e 6 horas", score: 40 },
      { value: "6-7", label: "Entre 6 e 7 horas", score: 65 },
      { value: "7-9", label: "Entre 7 e 9 horas", score: 95 },
      { value: "9+", label: "Mais de 9 horas", score: 70 },
    ],
  },
  { id: "i_sono", kind: "insight", section: "Sono" },
  {
    id: "ultraprocessados",
    kind: "single",
    area: "alimentacao",
    section: "Alimentação",
    title: "Quantos dias por semana entram ultraprocessados na sua rotina?",
    hint: "Biscoito recheado, salgadinho, fast food, refrigerante, congelado pronto.",
    options: [
      { value: "nunca", label: "Quase nunca", score: 95 },
      { value: "1-2", label: "1 ou 2 dias", score: 75 },
      { value: "3-5", label: "3 a 5 dias", score: 40 },
      { value: "todo", label: "Todo dia", score: 15 },
    ],
  },
  {
    id: "proteina",
    kind: "single",
    area: "alimentacao",
    section: "Alimentação",
    title: "Em quantas refeições do dia entra uma proteína?",
    hint: "Carne, frango, peixe, ovo, laticínios, feijão, lentilha.",
    options: [
      { value: "maioria", label: "Na maioria delas", score: 95 },
      { value: "1-2", label: "Em 1 ou 2 refeições", score: 60 },
      { value: "raro", label: "Raramente", score: 20 },
    ],
  },
  {
    id: "copos",
    kind: "glasses",
    section: "Água",
    title: "Quantos copos de água você bebe num dia comum?",
    hint: "Conte só água. Cada copo tem 250 ml.",
  },
  {
    id: "medidas",
    kind: "measures",
    section: "Água",
    title: "Qual sua altura e seu peso?",
    hint: "É com eles que calculo sua meta de água e de calorias.",
  },
  { id: "i_agua", kind: "insight", section: "Água" },
];

export const AREA_LABEL: Record<AreaKey, string> = {
  treino: "Treino",
  constancia: "Constância",
  sono: "Sono",
  alimentacao: "Alimentação",
  hidratacao: "Hidratação",
};

export type Answers = Record<string, string>;

export const GLASS_ML = 250;
export const GLASSES_MAX = 12;
/** Orientação usual de hidratação: 35 ml por kg de peso por dia */
const WATER_ML_PER_KG = 35;

export function waterTargetMl(weightKg: number): number {
  return Math.round((weightKg * WATER_ML_PER_KG) / 100) * 100;
}

function num(value: string | undefined): number {
  const n = Number((value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export function validMeasures(answers: Answers): boolean {
  const height = num(answers.altura);
  const weight = num(answers.peso);
  return height >= 120 && height <= 230 && weight >= 30 && weight <= 300;
}

function optionScore(stepId: string, value: string | undefined): number | null {
  const step = STEPS.find((s) => s.id === stepId);
  if (!step || step.kind !== "single") return null;
  return step.options.find((o) => o.value === value)?.score ?? null;
}

function average(values: (number | null)[]): number {
  const valid = values.filter((v): v is number => v !== null);
  return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 50;
}

export const PHASES = [
  {
    key: "partida",
    name: "Ponto de partida",
    min: 0,
    text: "Seu corpo está pedindo atenção em várias frentes. A boa notícia: quem começa daqui sente diferença rápido, porque cada passo pequeno já conta.",
  },
  {
    key: "construcao",
    name: "Construção",
    min: 40,
    text: "Você já tem algumas peças no lugar, mas outras estão puxando sua energia pra baixo. É a fase em que ter um plano faz mais diferença.",
  },
  {
    key: "ritmo",
    name: "Ritmo",
    min: 60,
    text: "Sua base é boa. O que falta é constância nas áreas mais fracas pra transformar esforço em resultado que aparece no espelho.",
  },
  {
    key: "evolucao",
    name: "Evolução",
    min: 80,
    text: "Você está acima da média na maioria das áreas. Agora o ganho vem de progressão bem medida e ajuste fino.",
  },
] as const;

/** Idade no meio da faixa escolhida, só para a fórmula do metabolismo */
const AGE_MIDPOINT: Record<string, number> = { "18-24": 21, "25-34": 30, "35-44": 40, "45-54": 50, "55+": 60 };

function activityFactor(days: number): number {
  if (days <= 3) return 1.375;
  if (days <= 5) return 1.55;
  return 1.725;
}

export interface DiagnosticResult {
  name: string;
  score: number;
  phase: (typeof PHASES)[number];
  areas: { key: AreaKey; label: string; score: number }[];
  waterTodayMl: number;
  waterTargetMl: number;
  kcalTarget: number;
  proteinG: number;
  trainingDays: number;
  /** Treinos por semana hoje, como a pessoa respondeu ("1 a 2x"); vazio se não respondeu */
  trainingNow: string;
  trainingOnTarget: boolean;
  /** Horas de sono hoje ("menos de 5 h") e se já estão na faixa de 7 a 9 h */
  sleepNow: string;
  sleepOnTarget: boolean;
  /** Complemento do objetivo para as metas de comida ("para ganhar massa") */
  goalLabel: string;
  /** Ponto de partida */
  weightKg: number;
  heightCm: number;
  bmi: number;
  bmiLabel: string;
  /** As áreas mais fracas, da pior para a melhor (até 3) */
  focus: AreaKey[];
}

const GOAL_LABEL: Record<string, string> = {
  emagrecer: "para emagrecer",
  massa: "para ganhar massa",
  forca: "para ganhar força",
  saude: "para ter mais disposição",
};

const SLEEP_NOW: Record<string, string> = {
  "<5": "menos de 5 h",
  "5-6": "5 a 6 h",
  "6-7": "6 a 7 h",
  "7-9": "7 a 9 h",
  "9+": "mais de 9 h",
};

const TRAINING_NOW: Record<string, string> = { "0": "nenhum", "1-2": "1 a 2x", "3-4": "3 a 4x", "5+": "5x ou mais" };
const TRAINING_MAX: Record<string, number> = { "0": 0, "1-2": 2, "3-4": 4, "5+": 7 };

/** Faixas de IMC da OMS para adultos */
function bmiLabel(bmi: number): string {
  if (bmi < 18.5) return "abaixo do peso";
  if (bmi < 25) return "peso adequado";
  if (bmi < 30) return "sobrepeso";
  return "obesidade";
}

export function computeResult(answers: Answers): DiagnosticResult {
  const weight = num(answers.peso);
  const height = num(answers.altura);
  const waterToday = (Number(answers.copos) || 0) * GLASS_ML;
  const waterTarget = waterTargetMl(weight);

  const areaScores: Record<AreaKey, number> = {
    treino: average([
      optionScore("experiencia", answers.experiencia),
      optionScore("frequencia", answers.frequencia),
      optionScore("carga", answers.carga),
    ]),
    constancia: average([optionScore("recomecos", answers.recomecos), optionScore("falta", answers.falta)]),
    sono: optionScore("sono", answers.sono) ?? 50,
    alimentacao: average([optionScore("ultraprocessados", answers.ultraprocessados), optionScore("proteina", answers.proteina)]),
    hidratacao: Math.min(100, Math.round((waterToday / waterTarget) * 100)),
  };
  const areas = (Object.keys(areaScores) as AreaKey[]).map((key) => ({ key, label: AREA_LABEL[key], score: areaScores[key] }));
  const score = Math.round(areas.reduce((sum, a) => sum + a.score, 0) / areas.length);
  const phase = [...PHASES].reverse().find((p) => score >= p.min) ?? PHASES[0];

  // Mifflin-St Jeor; sem sexo informado, a média das duas fórmulas
  const age = AGE_MIDPOINT[answers.idade] ?? 30;
  const base = 10 * weight + 6.25 * height - 5 * age;
  const bmr = answers.sexo === "m" ? base + 5 : answers.sexo === "f" ? base - 161 : base - 78;
  const trainingDays = Number(answers.dias) || 3;
  const tdee = bmr * activityFactor(trainingDays);
  const goalFactor = answers.objetivo === "emagrecer" ? 0.8 : answers.objetivo === "massa" ? 1.1 : 1;
  const kcalTarget = Math.round((tdee * goalFactor) / 50) * 50;
  const proteinPerKg = answers.objetivo === "emagrecer" || answers.objetivo === "massa" ? 1.8 : 1.6;

  return {
    name: (answers.nome ?? "").trim(),
    score,
    phase,
    areas,
    waterTodayMl: waterToday,
    waterTargetMl: waterTarget,
    kcalTarget,
    proteinG: Math.round((weight * proteinPerKg) / 5) * 5,
    trainingDays,
    trainingNow: TRAINING_NOW[answers.frequencia] ?? "",
    // Compara pelo topo da faixa respondida: "3 a 4x" já cumpre uma meta de 4 dias
    trainingOnTarget: (TRAINING_MAX[answers.frequencia] ?? 0) >= trainingDays,
    sleepNow: SLEEP_NOW[answers.sono] ?? "",
    sleepOnTarget: answers.sono === "7-9",
    goalLabel: GOAL_LABEL[answers.objetivo] ?? "",
    weightKg: weight,
    heightCm: height,
    bmi: Math.round((weight / (height / 100) ** 2) * 10) / 10,
    bmiLabel: bmiLabel(weight / (height / 100) ** 2),
    focus: [...areas].sort((a, b) => a.score - b.score).slice(0, 3).map((a) => a.key),
  };
}

/** O passo do plano para cada área fraca, dizendo como o Treinai ajuda */
export function planStep(area: AreaKey, r: DiagnosticResult): { title: string; text: string } {
  switch (area) {
    case "treino":
      return {
        title: `Treinar ${r.trainingDays}x por semana com um plano feito pra você`,
        text: "O Théo monta a divisão pro seu objetivo e nível, com vídeo de execução de cada exercício e a carga sugerida.",
      };
    case "constancia":
      return {
        title: "Parar de recomeçar",
        text: "Sequência de treinos, escudos pra um dia ruim e missões da semana: o app foi feito pra você não largar no meio.",
      };
    case "sono":
      return {
        title: "Dormir 7 horas ou mais",
        text: "É no descanso que o músculo se recupera. Combine com o Théo um treino que caiba no seu horário sem roubar seu sono.",
      };
    case "alimentacao":
      return {
        title: `Chegar a ~${r.proteinG} g de proteína por dia`,
        text: "Fotografe a refeição e o app estima calorias e proteína pra você, sem tabela e sem balança.",
      };
    case "hidratacao":
      return {
        title: `Beber ${formatLitersShort(r.waterTargetMl)} de água por dia`,
        text: "Lembretes espalhados ao longo do seu dia e um copo de cada vez, com um toque.",
      };
  }
}

/** Resposta à principal dificuldade, para a oferta falar com a pessoa */
export const BLOQUEIO_PITCH: Record<string, string> = {
  "nao-sabe":
    "Você disse que não sabe o que fazer na academia. Com o Théo, o treino do dia já está pronto quando você chega, com vídeo de cada exercício.",
  vergonha:
    "Você disse que tem vergonha de começar do zero. O Théo monta um treino pro seu nível e mostra a execução: você chega sabendo exatamente o que fazer.",
  tempo:
    "Você disse que falta tempo. O Théo monta treinos que cabem nos dias que você tem, sem precisar pensar no que fazer.",
  para: "Você disse que começa e para no meio. Sequência, escudos e missões semanais existem justamente pra você não recomeçar de novo.",
  resultado:
    "Você treina, mas não vê resultado. O Théo acompanha cada série e diz quando subir a carga — é a progressão que faz o corpo mudar.",
};

/** Condições marcadas (sem "nenhuma"), na ordem da pergunta */
export function selectedConditions(answers: Answers): Option[] {
  const step = STEPS.find((s) => s.id === "condicoes");
  if (!step || step.kind !== "multi") return [];
  const picked = new Set((answers.condicoes ?? "").split(",").filter(Boolean));
  return step.options.filter((o) => picked.has(o.value) && !o.exclusive);
}

/** Pedem liberação médica antes de começar, não só adaptação de exercício */
const MEDICAL_CLEARANCE = new Set(["cardio", "gestacao", "osteoporose", "diabetes"]);

export function needsMedicalClearance(conditions: Option[]): boolean {
  return conditions.some((c) => MEDICAL_CLEARANCE.has(c.value));
}

export function formatLitersShort(ml: number): string {
  return `${(ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L`;
}

export function formatWhatsapp(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
