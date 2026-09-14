import type { MiddlewareHandler } from "hono";

/**
 * Todas as rotas só podem ser chamadas pelo backend do Next.js, que já
 * autenticou o usuário (via NextAuth) e repassa o user id. O segredo evita
 * que a API do banco fique exposta diretamente ao navegador.
 */
async function timingSafeEqual(provided: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(providedHash, expectedHash);
}

export const requireInternalSecret: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const auth = c.req.header("authorization") ?? "";
  const expected = `Bearer ${c.env.WORKER_API_SECRET}`;
  if (!(await timingSafeEqual(auth, expected))) {
    return c.json({ error: "unauthorized" }, 401);
  }
  await next();
};
