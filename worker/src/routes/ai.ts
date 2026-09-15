import { Hono } from "hono";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { buildCoachContext } from "../lib/ai-context";
import { createWorkoutRecord, updateWorkoutRecord } from "../lib/workout-mutations";

export const aiRoutes = new Hono<{ Bindings: Env }>();

const exerciseInputSchema = z.object({
  exerciseId: z.string().describe("Id do exercício, deve vir exatamente do catálogo fornecido"),
  targetSets: z.number().int().min(1).max(10),
  targetRepsMin: z.number().int().min(1).max(50),
  targetRepsMax: z.number().int().min(1).max(50),
  restTime: z.number().int().min(0).max(600).describe("Descanso em segundos"),
  notes: z.string().optional(),
});

const MODEL = "claude-haiku-4-5";
const SYSTEM_PROMPT = `Você é o personal trainer de IA do app Treinai. Ajude o usuário com base SOMENTE nos dados reais fornecidos no contexto — nunca invente exercícios, cargas ou treinos que não estejam lá.

Você pode:
- Responder dúvidas sobre o treino e a evolução do usuário, com respostas curtas e diretas em português do Brasil.
- Sugerir ajustes de carga, séries, repetições ou descanso (como texto).
- Quando o usuário disser que não consegue fazer algum exercício (dor, lesão, falta de equipamento) ou pedir para adaptar um treino existente, use a ferramenta update_workout: mande a lista COMPLETA de exercícios do treino (os que continuam + a substituição), não só o que mudou.
- Quando o usuário pedir um treino novo do zero, use a ferramenta create_workout.

Regras importantes:
- Use APENAS ids de exercício que aparecem no catálogo do contexto.
- Você não é profissional de saúde. Se o usuário mencionar dor forte, lesão ou condição médica, oriente-o a procurar um profissional antes de qualquer alteração, e evite sugerir algo que possa ser inseguro.
- Depois de usar uma ferramenta, explique em 1-3 frases o que você mudou e por quê.
- Nunca chame uma ferramenta sem o usuário ter pedido uma mudança ou adaptação no treino.`;

aiRoutes.post("/coach", async (c) => {
  const { userId, message } = await c.req.json<{ userId?: string; message?: string }>();
  if (!userId || !message) return c.json({ error: "invalid_input" }, 400);
  if (!c.env.ANTHROPIC_API_KEY) return c.json({ error: "ai_not_configured" }, 503);

  const context = await buildCoachContext(c.env.DB, userId);
  const client = new Anthropic({ apiKey: c.env.ANTHROPIC_API_KEY });

  const actions: { type: "workout_created" | "workout_updated"; workoutId: string; name: string }[] = [];

  const createWorkoutTool = betaZodTool({
    name: "create_workout",
    description: "Cria um novo treino do zero para o usuário e salva no banco de dados.",
    inputSchema: z.object({
      name: z.string(),
      description: z.string().optional(),
      exercises: z.array(exerciseInputSchema).min(1),
    }),
    run: async (input) => {
      const id = await createWorkoutRecord(c.env.DB, userId, {
        name: input.name,
        description: input.description,
        exercises: input.exercises.map((e, i) => ({ ...e, order: i + 1 })),
      });
      actions.push({ type: "workout_created", workoutId: id, name: input.name });
      return `Treino "${input.name}" criado com sucesso (id: ${id}).`;
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

      await updateWorkoutRecord(c.env.DB, input.workoutId, {
        name,
        exercises: input.exercises.map((e, i) => ({ ...e, order: i + 1 })),
      });
      actions.push({ type: "workout_updated", workoutId: input.workoutId, name });
      return `Treino "${name}" atualizado com sucesso.`;
    },
  });

  let reply = "";
  try {
    const finalMessage = await client.beta.messages.toolRunner({
      model: MODEL,
      max_tokens: 2048,
      system: `${SYSTEM_PROMPT}\n\nCONTEXTO DO USUÁRIO:\n${context}`,
      tools: [createWorkoutTool, updateWorkoutTool],
      messages: [{ role: "user", content: message }],
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
