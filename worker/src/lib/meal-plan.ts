import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

/*
 * Cardápio da semana (7 dias) e lista de compras, montados pela IA a partir das metas
 * de calorias e macros que o app já calculou. Comida do dia a dia brasileiro, com medidas
 * caseiras e uma troca possível por refeição. É sugestão, não prescrição de nutricionista.
 */

export const MealPlanPreferencesSchema = z.object({
  mealsPerDay: z.coerce.number().int().min(3).max(5),
  diet: z.enum(["tudo", "sem-carne-vermelha", "vegetariano"]),
  lactoseFree: z.boolean(),
  /** Alimentos que a pessoa não come ou não gosta, em texto livre */
  avoid: z.string().trim().max(200).default(""),
  routine: z.enum(["cozinha", "marmita", "fora"]),
});

export type MealPlanPreferences = z.infer<typeof MealPlanPreferencesSchema>;

export interface MealPlanTargets {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  goal: string;
}

const MealPlanOutputSchema = z.object({
  days: z.array(
    z.object({
      day: z.string(),
      meals: z.array(
        z.object({
          slot: z.string(),
          name: z.string(),
          items: z.array(z.object({ food: z.string(), quantity: z.string(), kcal: z.number(), protein_g: z.number() })),
          swap: z.string(),
        }),
      ),
    }),
  ),
  shopping: z.array(z.object({ category: z.string(), items: z.array(z.object({ name: z.string(), quantity: z.string() })) })),
  tips: z.array(z.string()),
});

type MealPlanOutput = z.infer<typeof MealPlanOutputSchema>;

export interface MealPlan extends MealPlanOutput {
  /** Totais de cada dia, somados aqui a partir dos itens (o modelo erra soma) */
  dayTotals: { kcal: number; proteinG: number }[];
  targets: MealPlanTargets;
}

export class MealPlanError extends Error {}

const DIET_TEXT: Record<MealPlanPreferences["diet"], string> = {
  tudo: "come de tudo",
  "sem-carne-vermelha": "não come carne vermelha (frango, peixe e ovos podem)",
  vegetariano: "vegetariano: sem carne nem peixe; ovos e laticínios podem",
};

const ROUTINE_TEXT: Record<MealPlanPreferences["routine"], string> = {
  cozinha: "cozinha quase todo dia: pode variar bastante entre os dias",
  marmita:
    "faz marmita: cozinha 2 vezes por semana, então repita o almoço e o jantar em blocos (ex.: segunda a quarta iguais, quinta a domingo iguais)",
  fora: "almoça fora (restaurante por quilo): no almoço, descreva como montar o prato no buffet em vez de receita",
};

const SYSTEM_PROMPT = `Você é um nutricionista que monta cardápios semanais simples para um app brasileiro de treino.

Regras:
- Use comida do dia a dia brasileiro, barata e fácil de achar: arroz, feijão, ovos, frango, carne moída, peixe, legumes, frutas, pão, aveia, iogurte, tapioca, cuscuz. Nada de suplemento obrigatório nem ingrediente gourmet.
- Monte 7 dias (segunda a domingo) com o número de refeições pedido. Cada dia deve chegar perto da meta de calorias (±10%) e bater a meta de proteína.
- Quantidades em medida caseira com o peso entre parênteses (ex.: "4 colheres de sopa (100 g)", "1 filé médio (120 g)", "1 concha (140 g)").
- Calorias e proteína de cada item pela tabela TACO, para o alimento como é preparado.
- Em cada refeição, dê UMA troca simples em "swap" (ex.: "troque o frango por 2 ovos + 1 colher de requeijão").
- "slot" é o nome da refeição: Café da manhã, Lanche da manhã, Almoço, Lanche da tarde, Jantar ou Ceia.
- A lista de compras soma a semana inteira, agrupada por seção do mercado (Hortifruti, Carnes e ovos, Mercearia, Laticínios, Padaria), em quantidade de compra (ex.: "1,5 kg", "2 dúzias", "1 pacote de 500 g").
- "tips": 2 ou 3 dicas curtas de preparo ou organização da semana.
- Não dê conselho médico nem fale de dieta restritiva.`;

/** Gemini quando a chave é do Google; Claude quando é da Anthropic (mesmo critério da análise do prato) */
export async function generateMealPlan(apiKey: string, targets: MealPlanTargets, prefs: MealPlanPreferences): Promise<MealPlan> {
  const request = `Metas por dia: ${targets.kcal} kcal, ${targets.proteinG} g de proteína, ${targets.carbsG} g de carboidrato, ${targets.fatG} g de gordura. Objetivo: ${targets.goal}.
Refeições por dia: ${prefs.mealsPerDay}.
Alimentação: ${DIET_TEXT[prefs.diet]}${prefs.lactoseFree ? "; sem lactose (sem leite, iogurte, queijo e requeijão comuns)" : ""}.
Não come: ${prefs.avoid || "nada informado"}.
Rotina: ${ROUTINE_TEXT[prefs.routine]}.`;

  const output = apiKey.startsWith("sk-ant-") ? await withClaude(apiKey, request) : await withGemini(apiKey, request);
  if (output.days.length < 5 || output.days.some((d) => d.meals.length === 0)) throw new MealPlanError("incomplete");

  const round = (n: number) => Math.max(0, Math.round(n));
  const days = output.days.slice(0, 7).map((d) => ({
    ...d,
    meals: d.meals.map((m) => ({
      ...m,
      items: m.items.map((i) => ({ ...i, kcal: round(i.kcal), protein_g: round(i.protein_g) })),
    })),
  }));
  return {
    days,
    shopping: output.shopping,
    tips: output.tips.slice(0, 3),
    dayTotals: days.map((d) => ({
      kcal: d.meals.reduce((s, m) => s + m.items.reduce((t, i) => t + i.kcal, 0), 0),
      proteinG: d.meals.reduce((s, m) => s + m.items.reduce((t, i) => t + i.protein_g, 0), 0),
    })),
    targets,
  };
}

async function withGemini(apiKey: string, request: string): Promise<MealPlanOutput> {
  const model = "gemini-3.8-flash";
  const str = { type: "STRING" };
  const num = { type: "NUMBER" };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: request }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 24000,
        responseSchema: {
          type: "OBJECT",
          properties: {
            days: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  day: str,
                  meals: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        slot: str,
                        name: str,
                        items: {
                          type: "ARRAY",
                          items: {
                            type: "OBJECT",
                            properties: { food: str, quantity: str, kcal: num, protein_g: num },
                            required: ["food", "quantity", "kcal", "protein_g"],
                          },
                        },
                        swap: str,
                      },
                      required: ["slot", "name", "items", "swap"],
                    },
                  },
                },
                required: ["day", "meals"],
              },
            },
            shopping: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  category: str,
                  items: {
                    type: "ARRAY",
                    items: { type: "OBJECT", properties: { name: str, quantity: str }, required: ["name", "quantity"] },
                  },
                },
                required: ["category", "items"],
              },
            },
            tips: { type: "ARRAY", items: str },
          },
          required: ["days", "shopping", "tips"],
        },
      },
    }),
  });
  if (!res.ok) {
    console.error(JSON.stringify({ message: "gemini meal plan failed", status: res.status, body: await res.text() }));
    throw new MealPlanError("request_failed");
  }
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.find((p) => typeof p.text === "string" && p.text.trim())?.text;
  if (!text) throw new MealPlanError("empty");
  try {
    const parsed = MealPlanOutputSchema.safeParse(JSON.parse(text));
    if (!parsed.success) throw new MealPlanError("unparseable");
    return parsed.data;
  } catch {
    throw new MealPlanError("unparseable");
  }
}

async function withClaude(apiKey: string, request: string): Promise<MealPlanOutput> {
  const client = new Anthropic({ apiKey });
  const response = await client.beta.messages.parse({
    model: "claude-sonnet-5-5",
    max_tokens: 24000,
    // Lista longa e estruturada: esforço baixo mantém a geração rápida e barata
    output_config: { effort: "low", format: betaZodOutputFormat(MealPlanOutputSchema) },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: request }],
  });
  if (!response.parsed_output) throw new MealPlanError("unparseable");
  return response.parsed_output;
}
