/**
 * Vídeos de demonstração (loop de ~8s, silhueta com o músculo-alvo em destaque) dos exercícios
 * da biblioteca global. Gerados no Google Flow a partir das fotos do free-exercise-db
 * (github.com/yuhonas/free-exercise-db, domínio público).
 * Os arquivos ficam em public/exercises/<exerciseId>/demo.mp4 e poster.jpg.
 * Exercício novo na biblioteca: gere o vídeo no mesmo estilo, salve em public/exercises/<id>/
 * e adicione o id aqui.
 */
const EXERCISES_WITH_DEMO = new Set([
  "supino-reto",
  "supino-inclinado",
  "supino-declinado",
  "crucifixo",
  "crossover",
  "puxada-frontal",
  "remada-baixa",
  "remada-curvada",
  "barra-fixa",
  "agachamento",
  "leg-press",
  "cadeira-extensora",
  "mesa-flexora",
  "stiff",
  "desenvolvimento",
  "elevacao-lateral",
  "elevacao-frontal",
  "crucifixo-inverso",
  "rosca-direta",
  "rosca-alternada",
  "rosca-martelo",
  "triceps-pulley",
  "triceps-frances",
  "triceps-testa",
  "supino-maquina",
  "triceps-corda",
  "abdominal",
  "agachamento-smith",
  "supino-inclinado-maquina",
  "desenvolvimento-maquina",
  "stiff-halteres",
  "supino-halteres",
  "puxada-neutra",
  "panturrilha",
  "supino-inclinado-halteres",
  "rosca-scott",
  "elevacao-pelvica",
]);

/**
 * Demonstração em duas imagens no mesmo estilo (posição 1 em alongamento total, posição 2 em
 * contração máxima), que o app alterna com transição suave. Usada nos exercícios sem vídeo.
 * Os arquivos ficam em public/exercises/<exerciseId>/1.jpg e 2.jpg; quem tem vídeo continua com o vídeo.
 */
const EXERCISES_WITH_FRAMES = new Set<string>([
  "abdominal-infra",
  "abdominal-polia",
  "afundo",
  "agachamento-bulgaro",
  "agachamento-goblet",
  "agachamento-sumo",
  "barra-fixa-supinada",
  "cadeira-abdutora",
  "cadeira-adutora",
  "crossover-polia-baixa",
  "crucifixo-declinado",
  "crucifixo-inclinado",
  "crucifixo-inverso-maquina",
  "crucifixo-polia",
  "desenvolvimento-arnold",
  "desenvolvimento-barra",
  "desenvolvimento-smith",
  "elevacao-lateral-polia",
  "encolhimento-barra",
  "face-pull",
  "flexao",
  "gluteo-polia",
  "hack",
  "levantamento-terra",
  "panturrilha-sentado",
  "paralelas",
  "prancha",
  "puxada-supinada",
  "remada-alta",
  "remada-articulada",
  "remada-cavalinho",
  "remada-unilateral",
  "rosca-barra-w",
  "rosca-concentrada",
  "rosca-inclinada",
  "rosca-martelo-corda",
  "rosca-polia",
  "rosca-scott-halter",
  "supino-declinado-halteres",
  "supino-fechado",
  "supino-reto-smith",
  "triceps-banco",
  "triceps-coice",
  "triceps-polia-acima-cabeca",
  "triceps-testa-polia",
  "voador",
]);

export type ExerciseDemo =
  | { kind: "video"; video: string; poster: string }
  | { kind: "frames"; frames: [string, string]; poster: string };

/** Retorna a demonstração do exercício, ou null se ele não tem (ex.: exercícios personalizados). */
export function getExerciseDemo(exerciseId: string): ExerciseDemo | null {
  if (EXERCISES_WITH_DEMO.has(exerciseId)) {
    return {
      kind: "video",
      video: `/exercises/${exerciseId}/demo.mp4`,
      poster: `/exercises/${exerciseId}/poster.jpg`,
    };
  }
  if (EXERCISES_WITH_FRAMES.has(exerciseId)) {
    const first = `/exercises/${exerciseId}/1.jpg`;
    return { kind: "frames", frames: [first, `/exercises/${exerciseId}/2.jpg`], poster: first };
  }
  return null;
}
