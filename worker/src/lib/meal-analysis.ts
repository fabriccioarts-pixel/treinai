import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

/*
 * Estimativa de alimentos, porções e macros a partir da foto do prato ou de uma descrição em texto.
 * É uma ESTIMATIVA (erro típico de 20–30% nas porções): o usuário confirma e ajusta antes de salvar.
 */

const MODEL = "claude-opus-5-5";

const SYSTEM_PROMPT = `Você é um nutricionista que estima a composição de refeições para um app brasileiro de treino.
Receberá a foto de um prato ou a descrição de uma refeição.

- Liste cada alimento separadamente, com nome curto em português do Brasil (ex.: "Arroz branco", "Feijão carioca", "Peito de frango grelhado").
- Estime a porção em gramas pelo tamanho no prato ou pela quantidade descrita. Use medidas caseiras brasileiras quando ajudarem (1 concha de feijão ≈ 140 g, 1 colher de servir de arroz ≈ 45 g, 1 filé de frango ≈ 120 g, 1 pão francês ≈ 50 g).
- Calcule calorias e macros com base em tabelas brasileiras (TACO) para o alimento como foi preparado; inclua óleo ou molho visível.
- Se a imagem não for de comida, ou não der para identificar nada, devolva a lista vazia e explique em "note".
- "note" é uma frase curta para o usuário (ex.: o que foi mais difícil de estimar). Não dê conselhos de dieta.`;

const MealEstimateSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      grams: z.number(),
      kcal: z.number(),
      protein_g: z.number(),
      carbs_g: z.number(),
      fat_g: z.number(),
    }),
  ),
  confidence: z.enum(["alta", "media", "baixa"]),
  note: z.string(),
});

export type MealEstimate = z.infer<typeof MealEstimateSchema>;

export type MealAnalysisInput =
  | { kind: "photo"; base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" }
  | { kind: "text"; text: string };

export class MealAnalysisError extends Error {
  readonly code: "refused" | "unparseable";

  constructor(code: "refused" | "unparseable") {
    super(code);
    this.code = code;
  }
}

export async function analyzeMeal(apiKey: string, input: MealAnalysisInput): Promise<MealEstimate> {
  const client = new Anthropic({ apiKey });

  const content: Anthropic.Beta.BetaContentBlockParam[] =
    input.kind === "photo"
      ? [
          { type: "image", source: { type: "base64", media_type: input.mediaType, data: input.base64 } },
          { type: "text", text: "Estime os alimentos deste prato." },
        ]
      : [{ type: "text", text: `Estime os alimentos desta refeição: ${input.text}` }];

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    // Tarefa curta e frequente: esforço baixo mantém a resposta rápida e barata
    output_config: { effort: "low", format: betaZodOutputFormat(MealEstimateSchema) },
    // Se o modelo recusar, a API refaz a chamada no modelo de reserva automaticamente
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") throw new MealAnalysisError("refused");
  if (!response.parsed_output) throw new MealAnalysisError("unparseable");

  const round = (n: number) => Math.max(0, Math.round(n));
  return {
    ...response.parsed_output,
    items: response.parsed_output.items
      .filter((i) => i.name.trim() && i.grams > 0)
      .map((i) => ({
        name: i.name.trim().slice(0, 80),
        grams: round(i.grams),
        kcal: round(i.kcal),
        protein_g: round(i.protein_g),
        carbs_g: round(i.carbs_g),
        fat_g: round(i.fat_g),
      })),
  };
}
