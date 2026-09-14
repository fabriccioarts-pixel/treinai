/**
 * Template do "Plano Full Body — Retorno aos treinos" (extraído da planilha
 * do usuário). Clonado para a conta de cada novo usuário no primeiro login,
 * como ponto de partida — o usuário pode editar/excluir livremente depois.
 */

export interface PlanExerciseTemplate {
  exerciseId: string;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restTime: number;
  notes: string;
}

export interface PlanWorkoutTemplate {
  name: string;
  description: string;
  exercises: PlanExerciseTemplate[];
}

function ex(
  order: number,
  exerciseId: string,
  targetSets: number,
  targetRepsMin: number,
  targetRepsMax: number,
  notes: string
): PlanExerciseTemplate {
  return { exerciseId, order, targetSets, targetRepsMin, targetRepsMax, restTime: 90, notes };
}

export const planWorkoutTemplates: PlanWorkoutTemplate[] = [
  {
    name: "Treino A",
    description: "Full body — retorno aos treinos",
    exercises: [
      ex(1, "leg-press", 3, 10, 12, "Pés firmes e alinhados; desça controlando, sem deixar a lombar perder contato com o apoio. Suba empurrando a plataforma e sem travar os joelhos."),
      ex(2, "mesa-flexora", 2, 10, 12, "Ajuste o equipamento ao seu tamanho. Flexione os joelhos de forma controlada e retorne devagar, evitando arrancadas."),
      ex(3, "supino-maquina", 3, 8, 12, "Ajuste o banco para as mãos ficarem aproximadamente na linha do meio do peito. Empurre sem tirar as costas do apoio e retorne controlando."),
      ex(4, "puxada-frontal", 3, 8, 12, "Peito aberto e tronco estável. Puxe a barra em direção à parte alta do peito, conduzindo com os cotovelos; retorne lentamente."),
      ex(5, "elevacao-lateral", 2, 12, 15, "Braços levemente flexionados. Eleve os halteres lateralmente até uma altura confortável, sem balanço, e desça controlando."),
      ex(6, "rosca-direta", 2, 10, 12, "Cotovelos próximos ao tronco. Flexione os cotovelos sem balançar o corpo e retorne devagar."),
      ex(7, "triceps-corda", 2, 10, 12, "Cotovelos próximos ao corpo. Estenda os braços para baixo, controle a volta e evite movimentar os ombros."),
      ex(8, "abdominal", 2, 12, 15, "Movimento controlado, contraindo o abdômen. Evite puxar o pescoço com as mãos e não faça repetições com impulso."),
    ],
  },
  {
    name: "Treino B",
    description: "Full body — retorno aos treinos",
    exercises: [
      ex(1, "agachamento-smith", 3, 8, 12, "Pés em posição confortável e estável. Desça controlando, mantendo joelhos acompanhando a direção dos pés; suba sem perder o controle."),
      ex(2, "cadeira-extensora", 2, 10, 15, "Ajuste o eixo do aparelho ao joelho. Estenda as pernas de forma controlada e retorne sem soltar o peso de uma vez."),
      ex(3, "remada-baixa", 3, 8, 12, "Tronco firme. Puxe o cabo em direção ao abdômen, aproximando as escápulas, e retorne controlando sem arredondar excessivamente as costas."),
      ex(4, "supino-inclinado-maquina", 3, 8, 12, "Ajuste o banco para uma posição confortável. Empurre mantendo os ombros apoiados e retorne devagar."),
      ex(5, "desenvolvimento-maquina", 2, 10, 12, "Ajuste o assento para as alças ficarem aproximadamente na altura dos ombros. Empurre para cima sem forçar a articulação e retorne controlando."),
      ex(6, "rosca-martelo", 2, 10, 12, "Palmas voltadas uma para a outra. Flexione os cotovelos mantendo-os próximos ao corpo e evite balanço."),
      ex(7, "triceps-pulley", 2, 10, 12, "Mantenha os cotovelos estáveis junto ao tronco. Estenda os braços e retorne lentamente."),
      ex(8, "abdominal", 2, 12, 15, "Contraia o abdômen com movimento controlado, sem usar impulso."),
    ],
  },
  {
    name: "Treino C",
    description: "Full body — retorno aos treinos",
    exercises: [
      ex(1, "leg-press", 3, 8, 12, "Pés firmes e alinhados. Desça controlando até uma amplitude confortável e suba mantendo joelhos estáveis."),
      ex(2, "stiff-halteres", 2, 8, 12, "Joelhos levemente flexionados. Leve o quadril para trás mantendo a coluna neutra; desça até onde conseguir sem perder a posição e volte usando o quadril."),
      ex(3, "supino-halteres", 3, 8, 12, "Pés firmes no chão e ombros estáveis. Desça os halteres controlando e empurre mantendo os punhos alinhados."),
      ex(4, "puxada-neutra", 3, 8, 12, "Segure com pegada neutra. Puxe em direção ao peito, mantendo o tronco estável, e retorne lentamente."),
      ex(5, "elevacao-lateral", 2, 12, 15, "Eleve os braços lateralmente sem impulso, até uma altura confortável, e desça controlando."),
      ex(6, "rosca-direta", 2, 10, 12, "Cotovelos próximos ao corpo, movimento controlado e sem balanço."),
      ex(7, "triceps-corda", 2, 10, 12, "Cotovelos junto ao corpo. Estenda os braços e controle a subida."),
      ex(8, "panturrilha", 3, 12, 15, "Faça uma amplitude confortável: desça controlando o calcanhar e suba contraindo a panturrilha, sem quicar."),
    ],
  },
];
