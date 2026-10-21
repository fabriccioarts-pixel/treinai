import { Hono } from "hono";
import { z } from "zod";
import { newId, nowIso } from "../lib/id";

export const leadRoutes = new Hono<{ Bindings: Env }>();

const leadSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  // Só dígitos, com DDD: 10 (fixo) ou 11 (celular)
  whatsapp: z.string().regex(/^\d{10,11}$/),
  answers: z.record(z.string(), z.unknown()),
  score: z.number().int().min(0).max(100),
  phase: z.string().min(1).max(40),
  utm: z.record(z.string(), z.string().max(200)).optional(),
});

/** Contato deixado no fim do diagnóstico, antes de ver o resultado */
leadRoutes.post("/", async (c) => {
  const parsed = leadSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  const lead = parsed.data;

  const id = newId();
  await c.env.DB.prepare(
    `INSERT INTO leads (id, name, email, whatsapp, answers, score, phase, utm, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      lead.name,
      lead.email,
      lead.whatsapp,
      JSON.stringify(lead.answers),
      lead.score,
      lead.phase,
      lead.utm ? JSON.stringify(lead.utm) : null,
      nowIso(),
    )
    .run();
  return c.json({ id }, 201);
});

/** Liga os diagnósticos feitos com esse e-mail à conta recém-criada (para medir o funil) */
export async function linkLeadsToUser(db: D1Database, userId: string, email: string): Promise<void> {
  try {
    await db.prepare("UPDATE leads SET user_id = ? WHERE email = ? AND user_id IS NULL")
      .bind(userId, email.toLowerCase())
      .run();
  } catch {
    // Migration 0013 ainda não rodou
  }
}
