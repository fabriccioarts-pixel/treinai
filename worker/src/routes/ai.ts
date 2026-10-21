import { Hono } from "hono";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { buildCoachContext } from "../lib/ai-context";
import { findConversation, loadModelHistory, saveExchange, type CoachAction } from "../lib/coach-conversations";
import {
  createCoachToolExecutors,
  GEMINI_COACH_FUNCTIONS,
  SUPERSET_GROUP_DESCRIPTION,
  TECHNIQUE_DESCRIPTION,
} from "../lib/coach-tools";
import { TECHNIQUES } from "../lib/workout-mutations";
import { COACH_RULES, THEO_PERSONA } from "../lib/coach-persona";
import { COACH_KNOWLEDGE } from "../lib/coach-knowledge";
import { forgetPromptCache, getPromptCache } from "../lib/gemini-cache";
import { requireAiAccess } from "../lib/billing";

export const aiRoutes = new Hono<{ Bindings: Env }>();

const exerciseInputSchema = z.object({
  exerciseId: z.string().describe("Id do exercício, deve vir do catálogo fornecido"),
  targetSets: z.coerce.number().int().min(1).max(10).default(3).describe("Número de séries"),
  targetRepsMin: z.coerce.number().int().min(1).max(50).default(8).describe("Mínimo de repetições"),
  targetRepsMax: z.coerce.number().int().min(1).max(50).default(12).describe("Máximo de repetições"),
  restTime: z.coerce.number().int().min(0).max(600).default(90).describe("Descanso em segundos"),
  notes: z.string().optional().describe("Observação opcional de execução"),
  supersetGroup: z.coerce.number().int().min(1).max(20).optional().describe(SUPERSET_GROUP_DESCRIPTION),
  technique: z.enum(TECHNIQUES).optional().describe(TECHNIQUE_DESCRIPTION),
});

const MODEL = "claude-sonnet-5-5";

const SYSTEM_PROMPT = `${THEO_PERSONA}

${COACH_RULES}

${COACH_KNOWLEDGE}

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

interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

aiRoutes.post("/coach", async (c) => {
  try {
    const body = await c.req.json<{
      userId?: string;
      message?: string;
      /** Conversa salva a continuar; sem ele, a troca abre uma conversa nova */
      conversationId?: string;
      /** Mensagem escrita pelo app em nome do usuário: vai para o modelo, mas não aparece no chat */
      hidden?: boolean;
      /** Legado: histórico mandado pelo cliente, usado só quando não há conversationId */
      history?: ChatHistoryItem[];
    }>();
    const { userId, message, conversationId } = body;
    if (!userId || !message) return c.json({ error: "invalid_input" }, 400);
    const locked = await requireAiAccess(c, userId);
    if (locked) return locked;

    let history = body.history;
    if (conversationId) {
      if (!(await findConversation(c.env.DB, conversationId, userId))) {
        return c.json({ error: "conversation_not_found" }, 404);
      }
      history = await loadModelHistory(c.env.DB, conversationId);
    }

  const geminiKey = c.env.GEMINI_API_KEY || c.env.GOOGLE_API_KEY;
  const anthropicKey = c.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !anthropicKey) return c.json({ error: "ai_not_configured" }, 503);

  const context = await buildCoachContext(c.env.DB, userId);
  const actions: CoachAction[] = [];
  const tools = await createCoachToolExecutors(c.env.DB, userId, actions);

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

  // Gemini (API do Google) é o modelo do Théo. O Claude só entra de reserva quando o Gemini falha, há chave
  // da Anthropic e o Gemini não chegou a criar ou alterar treino (evita duplicar).
  let geminiFailed = false;
  if (geminiKey) {
    try {
      const model = "gemini-3.8-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

      const geminiTools = [{ functionDeclarations: GEMINI_COACH_FUNCTIONS }];

      const currentContents: any[] = messagesToSend.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      // Parte fixa do prompt (persona, regras, conhecimento e ferramentas) em cache: custa 10% do preço.
      // Com cache, o Gemini não aceita systemInstruction nem tools no pedido, então o contexto do usuário
      // abre a conversa. Sem cache (ou se ele falhar), vai tudo no prompt do sistema, como antes.
      let promptCache = await getPromptCache(c.env.DB, geminiKey, model, SYSTEM_PROMPT, geminiTools);
      const contextTurns = [
        {
          role: "user",
          parts: [{ text: `CONTEXTO DO USUÁRIO (dados atuais do app, não é uma mensagem do usuário):\n${context}` }],
        },
        { role: "model", parts: [{ text: "Entendido. Vou usar esses dados nas respostas." }] },
      ];
      const requestBody = () =>
        promptCache
          ? { cachedContent: promptCache, contents: [...contextTurns, ...currentContents] }
          : {
              systemInstruction: { parts: [{ text: `${SYSTEM_PROMPT}\n\nCONTEXTO DO USUÁRIO:\n${context}` }] },
              contents: currentContents,
              tools: geminiTools,
            };
      const callGemini = () =>
        fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody()) });

      let loopCount = 0;
      while (loopCount < 4) {
        loopCount++;
        let res = await callGemini();
        if (!res.ok && promptCache) {
          // Cache expirado ou recusado: repete a mesma chamada com o prompt completo
          console.error(JSON.stringify({ message: "gemini cache rejected", status: res.status, body: await res.text() }));
          forgetPromptCache(promptCache);
          promptCache = null;
          res = await callGemini();
        }

        if (!res.ok) {
          const errBody = await res.text();
          console.error("Gemini coach API error:", errBody);
          throw new Error(`Gemini status ${res.status}: ${errBody}`);
        }

        const data = (await res.json()) as any;
        // Para conferir no `wrangler tail` quanto do prompt veio do cache
        console.log(
          JSON.stringify({
            message: "gemini coach usage",
            prompt: data.usageMetadata?.promptTokenCount,
            cached: data.usageMetadata?.cachedContentTokenCount ?? 0,
            output: data.usageMetadata?.candidatesTokenCount,
            thoughts: data.usageMetadata?.thoughtsTokenCount,
          }),
        );
        const candidate = data.candidates?.[0];
        if (!candidate?.content) break;

        const parts = candidate.content.parts || [];
        const functionCalls = parts.filter((p: any) => p.functionCall);

        if (functionCalls.length === 0) {
          reply = parts
            .filter((p: any) => typeof p.text === "string")
            .map((p: any) => p.text)
            .join("\n\n");
          break;
        }

        // Keep model content with thoughtSignature
        currentContents.push(candidate.content);

        // Execute function calls
        const functionResponses: any[] = [];
        for (const call of functionCalls) {
          const fn = call.functionCall;
          const outputText = await tools.run(fn.name, fn.args);

          functionResponses.push({
            functionResponse: {
              name: fn.name,
              response: { output: outputText },
            },
          });
        }

        currentContents.push({
          role: "user",
          parts: functionResponses,
        });
      }
    } catch (err) {
      console.error(JSON.stringify({ message: "gemini coach failed, tentando Claude", error: err instanceof Error ? err.message : String(err) }));
      geminiFailed = true;
    }
  }

  const useClaude = Boolean(anthropicKey) && (!geminiKey || (geminiFailed && actions.length === 0));
  if (useClaude) {
    const client = new Anthropic({ apiKey: anthropicKey });

    const createWorkoutTool = betaZodTool({
      name: "create_workout",
      description: "Cria um novo treino do zero para o usuário e salva no banco de dados.",
      inputSchema: z.object({
        name: z.string().describe("Nome do treino"),
        description: z.string().optional().describe("Descrição ou foco"),
        exercises: z.array(exerciseInputSchema).min(1).describe("Lista de exercícios"),
      }),
      run: async (input) => tools.createWorkout(input),
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
      run: async (input) => tools.updateWorkout(input),
    });

    try {
      const finalMessage = await client.beta.messages.toolRunner({
        model: MODEL,
        max_tokens: 4096,
        // Persona + regras + bagagem técnica são fixas: ficam em cache; só o contexto do usuário muda
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
          { type: "text", text: `CONTEXTO DO USUÁRIO:\n${context}` },
        ],
        tools: [createWorkoutTool, updateWorkoutTool],
        messages: messagesToSend,
      });

      reply = finalMessage.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n\n");
    } catch (err) {
      console.error(JSON.stringify({ message: "anthropic coach failed", error: err instanceof Error ? err.message : String(err) }));
      return c.json({ error: "ai_request_failed" }, 502);
    }
  }

  if (geminiFailed && !useClaude) return c.json({ error: "ai_request_failed" }, 502);

    // Falha ao salvar não pode custar a resposta: o usuário recebe o texto, só sem histórico
    let savedConversationId: string | null = null;
    try {
      savedConversationId = await saveExchange(c.env.DB, {
        conversationId,
        userId,
        message: message.trim(),
        hidden: body.hidden === true,
        reply,
        actions,
      });
    } catch (saveErr) {
      console.error(JSON.stringify({ message: "coach history save failed", error: saveErr instanceof Error ? saveErr.message : String(saveErr) }));
    }

    return c.json({ reply, actions, conversationId: savedConversationId });
  } catch (topErr) {
    console.error("Top-level coach error:", topErr);
    return c.json({
      error: "internal_error",
      message: topErr instanceof Error ? topErr.message : String(topErr),
      stack: topErr instanceof Error ? topErr.stack : undefined,
    }, 500);
  }
});
