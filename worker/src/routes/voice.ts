import { Hono } from "hono";
import { buildCoachContext } from "../lib/ai-context";
import { findConversation, loadModelHistory, saveExchange, type CoachAction } from "../lib/coach-conversations";
import { createCoachToolExecutors, GEMINI_COACH_FUNCTIONS } from "../lib/coach-tools";
import { COACH_RULES, THEO_PERSONA } from "../lib/coach-persona";
import { COACH_KNOWLEDGE } from "../lib/coach-knowledge";
import { DAILY_VOICE_MINUTES, endVoiceSession, MAX_CALL_MS, startVoiceQuota } from "../lib/voice-quota";
import { requireAiAccess } from "../lib/billing";

/*
 * Conversa por voz com o Théo (Gemini Live API).
 * O navegador fala direto com o Gemini por WebSocket, usando um token temporário
 * gerado aqui; a chave da API nunca sai do worker. Ferramentas e histórico passam
 * por este worker como no chat de texto.
 */
export const voiceRoutes = new Hono<{ Bindings: Env }>();

const LIVE_MODEL = "gemini-3.8-live";
/** Voz masculina grave e firme, com energia de parceiro de academia */
const VOICE_NAME = "Orus";
const HISTORY_TURNS = 12;

const VOICE_RULES = `MODO VOZ — VOCÊ ESTÁ NUMA CONVERSA FALADA, EM TEMPO REAL

- Fale como numa ligação com um amigo: frases curtas, no máximo 2 ou 3 por vez, e devolva a palavra.
- Nada de markdown, listas, títulos, emojis ou tags <options>: tudo o que você responder vira fala.
- Nunca leia ids, números de série técnicos ou símbolos. Cite exercícios pelo nome, só os principais.
- Ao montar ou alterar um treino, diga o que vai fazer em uma frase, chame a ferramenta e depois resuma em poucas palavras.
- Ao registrar refeição ou água, confirme numa frase só, com o total de calorias ou de água do dia.
- Se o usuário te interromper, pare e escute; não repita o que já tinha dito.
- Se não entender o áudio, peça para repetir, de forma natural.
- Fale sempre em português do Brasil.`;

voiceRoutes.post("/session", async (c) => {
  const { userId, conversationId } = await c.req.json<{ userId?: string; conversationId?: string }>();
  if (!userId) return c.json({ error: "invalid_input" }, 400);
  const locked = await requireAiAccess(c, userId);
  if (locked) return locked;

  const apiKey = c.env.GEMINI_API_KEY || c.env.GOOGLE_API_KEY;
  if (!apiKey) return c.json({ error: "ai_not_configured" }, 503);

  const quota = await startVoiceQuota(c.env.DB, userId);
  if (!quota.allowed) {
    return c.json({ error: "voice_quota_exceeded", limitMinutes: DAILY_VOICE_MINUTES }, 429);
  }

  let history: { role: "user" | "assistant"; content: string }[] = [];
  if (conversationId) {
    if (!(await findConversation(c.env.DB, conversationId, userId))) {
      return c.json({ error: "conversation_not_found" }, 404);
    }
    history = (await loadModelHistory(c.env.DB, conversationId)).slice(-HISTORY_TURNS);
  }

  const context = await buildCoachContext(c.env.DB, userId);
  const previous = history.length
    ? `\n\nCONVERSA ATÉ AGORA (continue a partir daqui, sem repetir o que já foi dito):\n${history
        .map((m) => `${m.role === "user" ? "Usuário" : "Théo"}: ${m.content}`)
        .join("\n")}`
    : "";

  const systemInstruction = {
    parts: [{ text: `${THEO_PERSONA}\n\n${COACH_RULES}\n\n${COACH_KNOWLEDGE}\n\n${VOICE_RULES}\n\nCONTEXTO DO USUÁRIO:\n${context}${previous}` }],
  };
  // Primeira mensagem que o navegador manda no WebSocket (formato BidiGenerateContentSetup)
  const setup = {
    model: `models/${LIVE_MODEL}`,
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } } },
    },
    systemInstruction,
    tools: [{ functionDeclarations: GEMINI_COACH_FUNCTIONS.map((f) => ({ ...f, behavior: "NON_BLOCKING" })) }],
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  };

  const now = Date.now();
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      uses: 1,
      expireTime: new Date(now + quota.allowedMs).toISOString(),
      newSessionExpireTime: new Date(now + 60_000).toISOString(),
      // Trava modelo, persona e ferramentas: o token não serve para outra coisa
      bidiGenerateContentSetup: setup,
    }),
  });

  if (!res.ok) {
    console.error(JSON.stringify({ message: "gemini live token failed", status: res.status, body: await res.text() }));
    return c.json({ error: "ai_request_failed" }, 502);
  }
  const { name: token } = (await res.json()) as { name: string };

  return c.json({
    token,
    expiresAt: new Date(now + quota.allowedMs).toISOString(),
    setup,
    voiceSessionId: quota.sessionId,
    // A ligação termina antes dos 15 min porque acabaram os minutos do dia
    endsByDailyLimit: quota.allowedMs < MAX_CALL_MS,
    dailyLimitMinutes: DAILY_VOICE_MINUTES,
    remainingMinutes: Math.floor(quota.remainingMs / 60_000),
  });
});

/** O cliente desligou: encerra a contagem de minutos dessa ligação */
voiceRoutes.post("/end", async (c) => {
  const { userId, voiceSessionId } = await c.req.json<{ userId?: string; voiceSessionId?: string }>();
  if (!userId || !voiceSessionId) return c.json({ error: "invalid_input" }, 400);
  await endVoiceSession(c.env.DB, userId, voiceSessionId);
  return c.json({ ok: true });
});

voiceRoutes.post("/tool", async (c) => {
  const { userId, name, args } = await c.req.json<{ userId?: string; name?: string; args?: unknown }>();
  if (!userId || !name) return c.json({ error: "invalid_input" }, 400);

  const actions: CoachAction[] = [];
  const aiKey = c.env.GEMINI_API_KEY || c.env.GOOGLE_API_KEY || c.env.ANTHROPIC_API_KEY;
  const tools = await createCoachToolExecutors(c.env.DB, userId, actions, aiKey);
  try {
    const output = await tools.run(name, args ?? {});
    return c.json({ output, actions });
  } catch (err) {
    console.error(JSON.stringify({ message: "voice tool failed", name, error: err instanceof Error ? err.message : String(err) }));
    return c.json({ output: `Erro ao executar ${name}. Avise o usuário e não tente de novo.`, actions });
  }
});

/** Grava uma troca da conversa por voz (transcrições) no histórico do Théo */
voiceRoutes.post("/turn", async (c) => {
  const body = await c.req.json<{
    userId?: string;
    conversationId?: string;
    userText?: string;
    reply?: string;
    actions?: CoachAction[];
  }>();
  const { userId, conversationId } = body;
  const userText = body.userText?.trim();
  const reply = body.reply?.trim();
  if (!userId || !userText || !reply) return c.json({ error: "invalid_input" }, 400);

  if (conversationId && !(await findConversation(c.env.DB, conversationId, userId))) {
    return c.json({ error: "conversation_not_found" }, 404);
  }

  const savedId = await saveExchange(c.env.DB, {
    conversationId,
    userId,
    message: userText,
    hidden: false,
    reply,
    actions: Array.isArray(body.actions) ? body.actions : [],
  });
  return c.json({ conversationId: savedId });
});
