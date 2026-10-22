import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

/*
 * Análise do shape a partir das fotos do corpo (frente, lado, costas): pontos fortes, grupos musculares
 * a desenvolver e um treino montado em cima disso. É uma leitura visual da IA, não uma avaliação física:
 * o app deixa isso claro e a pessoa decide se cria o treino.
 */

const MODEL = "claude-opus-5-5";
const GEMINI_MODEL = "gemini-3.8-flash";

export const BODY_POSES = ["frente", "lado", "costas"] as const;
export type BodyPose = (typeof BODY_POSES)[number];

const MUSCLE_GROUPS = ["peito", "costas", "pernas", "ombros", "biceps", "triceps", "abdomen"] as const;

const SYSTEM_PROMPT = `Você é um personal trainer experiente avaliando o físico de um aluno por fotos, para um app brasileiro de treino.
Receberá até três fotos do corpo (frente, lado e costas), dados do perfil e o catálogo de exercícios disponíveis.

Como avaliar:
- Observe proporção e desenvolvimento entre os grupos musculares (peito, costas, ombros, braços, abdômen, pernas e glúteos), simetria entre os lados e postura aparente.
- Seja respeitoso e encorajador. Fale de desenvolvimento muscular, nunca de beleza, atratividade ou peso de forma depreciativa. Nada de apelidos, piadas ou comparações com outras pessoas.
- Não faça diagnóstico médico nem estime percentual de gordura. Se notar algo de postura que mereça atenção (ombros projetados, curvatura acentuada), cite com cuidado e sugira procurar um profissional.
- Considere o objetivo, o sexo, a idade e os dias de treino do perfil quando existirem.
- Se as fotos não mostrarem um corpo (ou estiverem escuras, cortadas ou com roupa larga demais para avaliar), deixe "focusAreas" e a lista de exercícios vazias e explique em "note" como refazer as fotos.

O que devolver:
- "summary": 2 ou 3 frases sobre o shape atual, em tom de treinador.
- "strengths": 2 a 4 pontos fortes curtos.
- "focusAreas": 1 a 4 grupos musculares a priorizar, cada um com o motivo em uma frase. Use só: ${MUSCLE_GROUPS.join(", ")}.
- "postureNote": uma frase sobre postura, ou texto vazio se não houver nada a comentar.
- "workout": um treino de 5 a 8 exercícios focado nas prioridades, usando SOMENTE ids do catálogo. Séries entre 3 e 4, repetições entre 6 e 15, descanso entre 45 e 120 segundos. Nome curto (ex.: "Foco em costas e ombros").
- "confidence": alta, media ou baixa, conforme a qualidade das fotos.
- "note": uma frase curta para a pessoa (limitação da análise ou dica para as próximas fotos).
Escreva em português do Brasil.`;

const BodyAnalysisSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  focusAreas: z.array(z.object({ muscle: z.enum(MUSCLE_GROUPS), reason: z.string() })),
  postureNote: z.string(),
  workout: z.object({
    name: z.string(),
    description: z.string(),
    exercises: z.array(
      z.object({
        exerciseId: z.string(),
        targetSets: z.number(),
        targetRepsMin: z.number(),
        targetRepsMax: z.number(),
        restTime: z.number(),
        notes: z.string(),
      }),
    ),
  }),
  confidence: z.enum(["alta", "media", "baixa"]),
  note: z.string(),
});

export type BodyAnalysis = z.infer<typeof BodyAnalysisSchema>;

export interface BodyAnalysisInput {
  photos: { pose: BodyPose; base64: string; mediaType: string }[];
  /** Objetivo, sexo, idade, altura, peso e dias de treino, em texto; vazio se não há perfil */
  profileText: string;
  /** Exercícios disponíveis: id, nome, grupo e equipamento */
  catalog: { id: string; name: string; muscle_group: string; equipment: string }[];
}

export class BodyAnalysisError extends Error {
  readonly code: "refused" | "unparseable";

  constructor(code: "refused" | "unparseable") {
    super(code);
    this.code = code;
  }
}

function userText(input: BodyAnalysisInput) {
  const catalog = input.catalog.map((e) => `- ${e.id} | ${e.name} | ${e.muscle_group} | ${e.equipment}`).join("\n");
  return `PERFIL:\n${input.profileText || "Perfil não preenchido."}\n\nCATÁLOGO DE EXERCÍCIOS (use somente estes ids):\n${catalog}\n\nAnalise o shape nas fotos acima e monte o treino.`;
}

/** Limpa o que veio da IA: ids fora do catálogo saem, números ficam nas faixas combinadas */
function sanitize(result: BodyAnalysis, catalogIds: Set<string>): BodyAnalysis {
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));
  const seen = new Set<string>();
  const exercises = result.workout.exercises
    .filter((e) => catalogIds.has(e.exerciseId) && !seen.has(e.exerciseId) && seen.add(e.exerciseId))
    .slice(0, 8)
    .map((e) => {
      const repsMin = clamp(e.targetRepsMin, 4, 20);
      return {
        exerciseId: e.exerciseId,
        targetSets: clamp(e.targetSets, 2, 5),
        targetRepsMin: repsMin,
        targetRepsMax: Math.max(repsMin, clamp(e.targetRepsMax, 4, 25)),
        restTime: clamp(e.restTime, 30, 180),
        notes: e.notes.trim().slice(0, 200),
      };
    });
  return {
    summary: result.summary.trim().slice(0, 600),
    strengths: result.strengths.map((s) => s.trim()).filter(Boolean).slice(0, 4),
    focusAreas: result.focusAreas.slice(0, 4).map((f) => ({ muscle: f.muscle, reason: f.reason.trim().slice(0, 240) })),
    postureNote: result.postureNote.trim().slice(0, 300),
    workout: {
      name: result.workout.name.trim().slice(0, 60) || "Treino do shape",
      description: result.workout.description.trim().slice(0, 200),
      exercises,
    },
    confidence: result.confidence,
    note: result.note.trim().slice(0, 300),
  };
}

const POSE_LABEL: Record<BodyPose, string> = { frente: "Foto de frente", lado: "Foto de lado", costas: "Foto de costas" };

export async function analyzeBody(apiKey: string, input: BodyAnalysisInput): Promise<BodyAnalysis> {
  const catalogIds = new Set(input.catalog.map((e) => e.id));

  if (apiKey.startsWith("AQ.") || apiKey.startsWith("AIza") || !apiKey.startsWith("sk-ant-")) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const parts: unknown[] = input.photos.flatMap((p) => [
      { text: POSE_LABEL[p.pose] },
      { inlineData: { mimeType: p.mediaType, data: p.base64 } },
    ]);
    parts.push({ text: userText(input) });

    const exerciseSchema = {
      type: "OBJECT",
      properties: {
        exerciseId: { type: "STRING" },
        targetSets: { type: "INTEGER" },
        targetRepsMin: { type: "INTEGER" },
        targetRepsMax: { type: "INTEGER" },
        restTime: { type: "INTEGER" },
        notes: { type: "STRING" },
      },
      required: ["exerciseId", "targetSets", "targetRepsMin", "targetRepsMax", "restTime", "notes"],
    };
    const payload = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            summary: { type: "STRING" },
            strengths: { type: "ARRAY", items: { type: "STRING" } },
            focusAreas: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: { muscle: { type: "STRING", enum: [...MUSCLE_GROUPS] }, reason: { type: "STRING" } },
                required: ["muscle", "reason"],
              },
            },
            postureNote: { type: "STRING" },
            workout: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                description: { type: "STRING" },
                exercises: { type: "ARRAY", items: exerciseSchema },
              },
              required: ["name", "description", "exercises"],
            },
            confidence: { type: "STRING", enum: ["alta", "media", "baixa"] },
            note: { type: "STRING" },
          },
          required: ["summary", "strengths", "focusAreas", "postureNote", "workout", "confidence", "note"],
        },
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("Gemini body analysis HTTP error:", await res.text());
      throw new BodyAnalysisError("unparseable");
    }
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.find((p) => typeof p.text === "string" && p.text.trim())?.text;
    if (!text) throw new BodyAnalysisError("unparseable");
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new BodyAnalysisError("unparseable");
    }
    const validated = BodyAnalysisSchema.safeParse(parsed);
    if (!validated.success) throw new BodyAnalysisError("unparseable");
    return sanitize(validated.data, catalogIds);
  }

  const client = new Anthropic({ apiKey });
  const content: Anthropic.Beta.BetaContentBlockParam[] = input.photos.flatMap((p) => [
    { type: "text" as const, text: POSE_LABEL[p.pose] },
    {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: p.mediaType as "image/jpeg" | "image/png" | "image/webp",
        data: p.base64,
      },
    },
  ]);
  content.push({ type: "text", text: userText(input) });

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 6000,
    output_config: { effort: "medium", format: betaZodOutputFormat(BodyAnalysisSchema) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") throw new BodyAnalysisError("refused");
  if (!response.parsed_output) throw new BodyAnalysisError("unparseable");
  return sanitize(response.parsed_output, catalogIds);
}
