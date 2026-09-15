import { Hono } from "hono";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { buildCoachContext } from "../lib/ai-context";
import { createWorkoutRecord, updateWorkoutRecord } from "../lib/workout-mutations";

export const aiRoutes = new Hono<{ Bindings: Env }>();

const exerciseInputSchema = z.object({
  exerciseId: z.string().describe("Id do exercício, deve vir do catálogo fornecido"),
  targetSets: z.coerce.number().int().min(1).max(10).default(3).describe("Número de séries"),
  targetRepsMin: z.coerce.number().int().min(1).max(50).default(8).describe("Mínimo de repetições"),
  targetRepsMax: z.coerce.number().int().min(1).max(50).default(12).describe("Máximo de repetições"),
  restTime: z.coerce.number().int().min(0).max(600).default(90).describe("Descanso em segundos"),
  notes: z.string().optional().describe("Observação opcional de execução"),
});

const MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT = `Você é o Théo, o personal trainer do app Treinai. Ajude o usuário com base SOMENTE nos dados reais fornecidos no contexto — nunca invente exercícios, cargas ou treinos que não estejam lá.

Você pode:
- Responder dúvidas sobre o treino e a evolução do usuário, com respostas curtas e diretas em português do Brasil.
- Sugerir ajustes de carga, séries, repetições ou descanso (como texto).
- Quando o usuário disser que não consegue fazer algum exercício (dor, lesão, falta de equipamento) ou pedir para adaptar um treino existente, use a ferramenta update_workout: mande a lista COMPLETA de exercícios do treino (os que continuam + a substituição), não só o que mudou.
- Quando o usuário pedir um treino novo do zero, ou quando a sondagem terminar e você tiver dados suficientes sobre o que ele quer (músculos, dias ou objetivo), CRIE O TREINO IMEDIATAMENTE chamando a ferramenta create_workout. Salve o treino no sistema em vez de apenas listar os exercícios no texto.
- Se o usuário confirmar ("sim", "pode criar", "salva aí", "ok", "perfeito", "bora"), invoque create_workout imediatamente com a divisão combinada.

Regras fundamentais:
- Use APENAS ids de exercício que aparecem no catálogo do contexto.
- Seja ágil, direto e resolutivo: evite questionários longos. Não faça mais de 1 ou 2 perguntas breves antes de criar. Se o usuário já deu instruções claras (ex: "monta um treino de costas e bíceps"), você pode montar e salvar o treino diretamente com create_workout e explicar o que montou.
- NUNCA reinicie a conversa ou as perguntas de sondagem se o histórico anterior já contiver as respostas. Sempre considere todo o diálogo prévio.
- Você não é profissional de saúde. Se o usuário mencionar dor forte, lesão ou condição médica, oriente-o a procurar um profissional antes de qualquer alteração, e evite sugerir algo que possa ser inseguro.
- Depois de usar uma ferramenta, explique em 1-3 frases o que você criou ou mudou e por quê.

ESTRUTURA VISUAL E FORMATAÇÃO DAS RESPOSTAS:
- Estruture suas respostas de forma elegante, moderna e altamente legível.
- Use títulos em Markdown com ### para nomear treinos ou tópicos (ex: ### Treino Costas e Bíceps).
- Agrupe exercícios e pontos importantes por tópicos com marcadores e destaque em negrito o grupo muscular ou conceito (ex:
  • **Costas:** Barra fixa, Remada curvada, Puxada neutra — *foco em largura e densidade*
  • **Bíceps:** Rosca direta, Rosca alternada — *estímulo completo*
).
- Use negrito (**palavra**) para termos-chave e itálico (*detalhe*) para observações complementares.
- NUNCA misture aspas com asteriscos duplos ou triplos (evite ***"..."*** ou **"..."** — escreva apenas **Nome do Treino**).
- Separe blocos de texto e tópicos com quebras de linha para garantir clareza visual.

BOTÕES INTERATIVOS DE ESCOLHA (<options>):
- Sempre que você fizer uma pergunta ao usuário, sugerir próximos passos ou oferecer opções de escolha (ex: confirmações, preferências de divisão, objetivos ou ajustes de carga/séries), inclua OBRIGATORIAMENTE no FINAL da mensagem a tag <options> com 2 a 4 opções curtas, claras e acionáveis:
  <options>
    <option>Ajustar carga e repetições</option>
    <option>Trocar algum exercício</option>
    <option>O treino está perfeito, obrigado!</option>
  </options>
- O aplicativo converte automaticamente cada <option> em botões clicáveis para o usuário interagir com 1 toque.
- Mantenha as opções diretas e em primeira pessoa (ex: "3 dias por semana", "Foco em hipertrofia", "Ajustar séries", "Sim, pode salvar!").`;

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function resolveExerciseIdMap(db: D1Database, userId: string): Promise<Map<string, string>> {
  const { results } = await db
    .prepare("SELECT id, name FROM exercises WHERE user_id IS NULL OR user_id = ?")
    .bind(userId)
    .all<{ id: string; name: string }>();

  const map = new Map<string, string>();
  for (const ex of results) {
    map.set(ex.id.toLowerCase(), ex.id);
    map.set(normalize(ex.id), ex.id);
    map.set(normalize(ex.name), ex.id);
  }
  return map;
}

interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

aiRoutes.post("/coach", async (c) => {
  const { userId, message, history } = await c.req.json<{
    userId?: string;
    message?: string;
    history?: ChatHistoryItem[];
  }>();
  if (!userId || !message) return c.json({ error: "invalid_input" }, 400);
  if (!c.env.ANTHROPIC_API_KEY) return c.json({ error: "ai_not_configured" }, 503);

  const context = await buildCoachContext(c.env.DB, userId);
  const exerciseMap = await resolveExerciseIdMap(c.env.DB, userId);
  const client = new Anthropic({ apiKey: c.env.ANTHROPIC_API_KEY });

  const actions: { type: "workout_created" | "workout_updated"; workoutId: string; name: string }[] = [];

  const createWorkoutTool = betaZodTool({
    name: "create_workout",
    description: "Cria um novo treino do zero para o usuário e salva no banco de dados.",
    inputSchema: z.object({
      name: z.string().describe("Nome do treino"),
      description: z.string().optional().describe("Descrição ou foco"),
      exercises: z.array(exerciseInputSchema).min(1).describe("Lista de exercícios"),
    }),
    run: async (input) => {
      // Resolve exercise IDs through flexible map
      const validExercises = input.exercises
        .map((e) => {
          const resolvedId =
            exerciseMap.get(e.exerciseId.toLowerCase()) ??
            exerciseMap.get(normalize(e.exerciseId)) ??
            e.exerciseId;
          return { ...e, exerciseId: resolvedId };
        })
        .filter((e) => exerciseMap.has(e.exerciseId.toLowerCase()) || exerciseMap.has(normalize(e.exerciseId)));

      const exercisesToUse = validExercises.length > 0 ? validExercises : input.exercises;

      const id = await createWorkoutRecord(c.env.DB, userId, {
        name: input.name,
        description: input.description,
        exercises: exercisesToUse.map((e, i) => ({ ...e, order: i + 1 })),
      });
      actions.push({ type: "workout_created", workoutId: id, name: input.name });
      return `Treino "${input.name}" criado com sucesso no banco de dados (id: ${id}).`;
    },
  });

  const updateWorkoutTool = betaZodTool({
    name: "update_workout",
    description:
      "Substitui a lista de exercícios de um treino existente do usuário. Envie a lista completa (mantidos + alterados), não apenas o que mudou.",
    inputSchema: z.object({
      workoutId: z.string(),
      name: z.string().optional(),
      exercises: z.array(exerciseInputSchema).min(1),
    }),
    run: async (input) => {
      const existing = await c.env.DB.prepare(
        "SELECT name FROM workouts WHERE id = ? AND user_id = ?"
      )
        .bind(input.workoutId, userId)
        .first<{ name: string }>();
      if (!existing) return `Erro: treino ${input.workoutId} não encontrado para este usuário.`;
      const name = input.name ?? existing.name;

      const validExercises = input.exercises
        .map((e) => {
          const resolvedId =
            exerciseMap.get(e.exerciseId.toLowerCase()) ??
            exerciseMap.get(normalize(e.exerciseId)) ??
            e.exerciseId;
          return { ...e, exerciseId: resolvedId };
        })
        .filter((e) => exerciseMap.has(e.exerciseId.toLowerCase()) || exerciseMap.has(normalize(e.exerciseId)));

      const exercisesToUse = validExercises.length > 0 ? validExercises : input.exercises;

      await updateWorkoutRecord(c.env.DB, input.workoutId, {
        name,
        exercises: exercisesToUse.map((e, i) => ({ ...e, order: i + 1 })),
      });
      actions.push({ type: "workout_updated", workoutId: input.workoutId, name });
      return `Treino "${name}" atualizado com sucesso.`;
    },
  });

  // Construct alternating messages array with history
  const rawList: { role: "user" | "assistant"; content: string }[] = [];
  if (Array.isArray(history)) {
    for (const item of history) {
      if (
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim()
      ) {
        rawList.push({ role: item.role, content: item.content.trim() });
      }
    }
  }
  rawList.push({ role: "user", content: message.trim() });

  // Sanitize so roles strictly alternate starting with user
  const sanitizedMessages: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of rawList) {
    if (sanitizedMessages.length === 0) {
      if (m.role === "user") {
        sanitizedMessages.push({ role: m.role, content: m.content });
      }
    } else {
      const last = sanitizedMessages[sanitizedMessages.length - 1];
      if (last.role === m.role) {
        last.content += `\n\n${m.content}`;
      } else {
        sanitizedMessages.push({ role: m.role, content: m.content });
      }
    }
  }

  if (sanitizedMessages.length === 0) {
    sanitizedMessages.push({ role: "user", content: message.trim() });
  }

  // Keep last 20 turns
  const messagesToSend = sanitizedMessages.slice(-20);
  if (messagesToSend[0].role !== "user") {
    messagesToSend.shift();
  }

  let reply = "";
  try {
    const finalMessage = await client.beta.messages.toolRunner({
      model: MODEL,
      max_tokens: 2048,
      system: `${SYSTEM_PROMPT}\n\nCONTEXTO DO USUÁRIO:\n${context}`,
      tools: [createWorkoutTool, updateWorkoutTool],
      messages: messagesToSend,
    });

    reply = finalMessage.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n\n");
  } catch (err) {
    console.error(JSON.stringify({ message: "ai coach failed", error: err instanceof Error ? err.message : String(err) }));
    return c.json({ error: "ai_request_failed" }, 502);
  }

  return c.json({ reply, actions });
});
