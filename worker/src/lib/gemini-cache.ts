/*
 * Cache explícito do Gemini para a parte fixa do Théo (persona, regras, conhecimento e ferramentas,
 * ~5,7 mil tokens que iriam em toda mensagem). Com o cache, esses tokens custam 10% do preço normal.
 *
 * O cache é sob demanda: criado quando alguém usa o chat e expira sozinho depois de CACHE_TTL_S sem
 * renovação, então só há custo de armazenamento enquanto há conversa. Qualquer falha devolve null e
 * o chamador manda o prompt completo, como antes: o modelo nunca fica sem contexto.
 */

const API = "https://generativelanguage.googleapis.com/v1beta";
const CACHE_TTL_S = 15 * 60;
/** Cache perto de expirar não é reaproveitado: uma conversa no meio não pode perder o cache */
const MIN_REMAINING_MS = 2 * 60_000;
/** Depois de uma falha ao criar, espera antes de tentar de novo (evita repetir o erro a cada mensagem) */
const FAILURE_BACKOFF_MS = 10 * 60_000;

interface CacheEntry {
  name: string;
  expiresAt: number;
}

// Memória do isolate: evita ir ao D1 em toda mensagem
const memory = new Map<string, CacheEntry>();
let failedUntil = 0;

async function fingerprintOf(model: string, systemText: string, tools: unknown): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${model}\n${systemText}\n${JSON.stringify(tools)}`),
  );
  return [...new Uint8Array(digest).slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const usable = (entry: CacheEntry | null | undefined) => !!entry && entry.expiresAt - Date.now() > MIN_REMAINING_MS;

/** Nome do cache ("cachedContents/...") com a parte fixa do prompt, ou null para usar o prompt completo */
export async function getPromptCache(
  db: D1Database,
  apiKey: string,
  model: string,
  systemText: string,
  tools: unknown,
): Promise<string | null> {
  if (Date.now() < failedUntil) return null;
  try {
    const fingerprint = await fingerprintOf(model, systemText, tools);
    const cached = memory.get(fingerprint);
    if (usable(cached)) return cached!.name;

    // Outro isolate pode já ter criado
    const row = await db
      .prepare("SELECT name, expires_at FROM ai_caches WHERE fingerprint = ?")
      .bind(fingerprint)
      .first<{ name: string; expires_at: string }>()
      .catch(() => null);
    const stored = row ? { name: row.name, expiresAt: Date.parse(row.expires_at) } : null;
    if (usable(stored)) {
      memory.set(fingerprint, stored!);
      return stored!.name;
    }

    const res = await fetch(`${API}/cachedContents`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        model: `models/${model}`,
        displayName: `theo-${fingerprint}`,
        systemInstruction: { parts: [{ text: systemText }] },
        tools,
        ttl: `${CACHE_TTL_S}s`,
      }),
    });
    if (!res.ok) {
      failedUntil = Date.now() + FAILURE_BACKOFF_MS;
      console.error(JSON.stringify({ message: "gemini cache create failed", status: res.status, body: await res.text() }));
      return null;
    }
    const created = (await res.json()) as { name: string; expireTime?: string };
    const entry = {
      name: created.name,
      expiresAt: created.expireTime ? Date.parse(created.expireTime) : Date.now() + CACHE_TTL_S * 1000,
    };
    memory.set(fingerprint, entry);
    await db
      .prepare(
        `INSERT INTO ai_caches (fingerprint, name, expires_at) VALUES (?, ?, ?)
         ON CONFLICT(fingerprint) DO UPDATE SET name = excluded.name, expires_at = excluded.expires_at`,
      )
      .bind(fingerprint, entry.name, new Date(entry.expiresAt).toISOString())
      .run()
      .catch(() => null); // Sem a migration 0011: funciona só com a memória do isolate
    return entry.name;
  } catch (err) {
    failedUntil = Date.now() + FAILURE_BACKOFF_MS;
    console.error("Erro no cache do Gemini:", err);
    return null;
  }
}

/** Cache recusado pelo Gemini (expirou antes da hora, foi apagado): esquece para recriar na próxima */
export function forgetPromptCache(name: string) {
  for (const [key, entry] of memory) if (entry.name === name) memory.delete(key);
}
