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
]);

export interface ExerciseDemo {
  video: string;
  poster: string;
}

/** Retorna o vídeo e a capa do exercício, ou null se ele não tem demonstração (ex.: exercícios personalizados). */
export function getExerciseDemo(exerciseId: string): ExerciseDemo | null {
  if (!EXERCISES_WITH_DEMO.has(exerciseId)) return null;
  return {
    video: `/exercises/${exerciseId}/demo.mp4`,
    poster: `/exercises/${exerciseId}/poster.jpg`,
  };
}
