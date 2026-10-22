import { Hono } from "hono";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { newId, nowIso } from "../lib/id";
import { localDate, userTimeZone } from "../lib/nutrition";
import { loadProfileWithTargets } from "../lib/profile";
import { requireAiAccess } from "../lib/billing";
import { createWorkoutRecord } from "../lib/workout-mutations";
import { BODY_POSES, BodyAnalysisError, analyzeBody, type BodyAnalysis, type BodyPose } from "../lib/body-analysis";

/*
 * Fotos do corpo para acompanhar a evolução (LGPD: dado sensível, só com consentimento específico).
 * - Guardar fotos e mandar para a IA são consentimentos separados; revogar o das fotos apaga tudo.
 * - As fotos ficam no R2 privado e só saem por estas rotas, chamadas pelo Next depois de conferir o dono.
 */
export const bodyRoutes = new Hono<{ Bindings: Env }>();

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
/** Análises por dia: cada uma manda até 3 fotos para a IA */
const DAILY_ANALYSIS_LIMIT = 3;
const GOAL_LABEL: Record<string, string> = {
  hipertrofia: "hipertrofia",
  emagrecimento: "emagrecimento",
  "ganho-massa": "ganho de massa",
  enfase: "ênfase em um grupo muscular",
};

interface ConsentRow {
  photos_consent_at: string | null;
  ai_consent_at: string | null;
  adult_confirmed_at: string | null;
}

interface PhotoRow {
  id: string;
  pose: BodyPose;
  photo_key: string;
  taken_on: string;
  created_at: string;
}

interface AnalysisRow {
  id: string;
  taken_on: string;
  result: string;
  workout_id: string | null;
  created_at: string;
}

async function loadConsent(db: D1Database, userId: string) {
  const row = await db
    .prepare("SELECT photos_consent_at, ai_consent_at, adult_confirmed_at FROM body_photo_consents WHERE user_id = ?")
    .bind(userId)
    .first<ConsentRow>();
  return {
    photos: row?.photos_consent_at ?? null,
    ai: row?.ai_consent_at ?? null,
    adult: row?.adult_confirmed_at ?? null,
  };
}

/** Apaga fotos (R2 e banco) e análises; os consentimentos ficam a cargo de quem chama */
async function deleteAllBodyData(env: Env, userId: string) {
  const { results } = await env.DB.prepare("SELECT photo_key FROM body_photos WHERE user_id = ?")
    .bind(userId)
    .all<{ photo_key: string }>();
  if (results.length > 0) await env.PHOTOS.delete(results.map((r) => r.photo_key));
  await env.DB.batch([
    env.DB.prepare("DELETE FROM body_photos WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM body_analyses WHERE user_id = ?").bind(userId),
  ]);
}

function toAnalysis(row: AnalysisRow) {
  return {
    id: row.id,
    takenOn: row.taken_on,
    createdAt: row.created_at,
    workoutId: row.workout_id,
    result: JSON.parse(row.result) as BodyAnalysis,
  };
}

/** Tudo da tela de fotos do corpo: consentimentos, fotos (sem os arquivos) e análises recentes */
bodyRoutes.get("/", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "missing_userId" }, 400);

  const [consent, photos, analyses] = await Promise.all([
    loadConsent(c.env.DB, userId),
    c.env.DB.prepare(
      "SELECT id, pose, taken_on, created_at FROM body_photos WHERE user_id = ? ORDER BY taken_on DESC, created_at DESC",
    )
      .bind(userId)
      .all<Omit<PhotoRow, "photo_key">>(),
    c.env.DB.prepare(
      "SELECT id, taken_on, result, workout_id, created_at FROM body_analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
    )
      .bind(userId)
      .all<AnalysisRow>(),
  ]);

  return c.json({
    consent,
    photos: photos.results.map((p) => ({ id: p.id, pose: p.pose, takenOn: p.taken_on, createdAt: p.created_at })),
    analyses: analyses.results.map(toAnalysis),
  });
});

const consentSchema = z.object({
  userId: z.string().min(1),
  photos: z.boolean(),
  ai: z.boolean(),
  /** "Tenho 18 anos ou mais": obrigatório para autorizar fotos (dados de menores pedem outro tratamento) */
  adult: z.boolean().optional(),
});

/** Dá ou revoga os consentimentos. Sem o das fotos, apaga tudo (LGPD: revogação leva à eliminação). */
bodyRoutes.put("/consent", async (c) => {
  const parsed = consentSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_consent" }, 400);
  const { userId, photos } = parsed.data;
  // A IA só analisa fotos que o app pode guardar
  const ai = photos && parsed.data.ai;
  const current = await loadConsent(c.env.DB, userId);
  if (photos && !current.adult && !parsed.data.adult) return c.json({ error: "adult_required" }, 400);
  const now = nowIso();

  if (!photos) await deleteAllBodyData(c.env, userId);

  await c.env.DB.prepare(
    `INSERT INTO body_photo_consents (user_id, photos_consent_at, ai_consent_at, adult_confirmed_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET photos_consent_at = excluded.photos_consent_at,
       ai_consent_at = excluded.ai_consent_at, adult_confirmed_at = excluded.adult_confirmed_at,
       updated_at = excluded.updated_at`,
  )
    .bind(
      userId,
      photos ? (current.photos ?? now) : null,
      ai ? (current.ai ?? now) : null,
      photos ? (current.adult ?? now) : null,
      now,
    )
    .run();

  return c.json({ consent: await loadConsent(c.env.DB, userId) });
});

/** Envia uma foto (corpo binário). Mesma pose no mesmo dia substitui a anterior. */
bodyRoutes.put("/photos", async (c) => {
  const userId = c.req.query("userId");
  const pose = c.req.query("pose") as BodyPose | undefined;
  if (!userId || !pose || !BODY_POSES.includes(pose)) return c.json({ error: "invalid_input" }, 400);

  const contentType = c.req.header("content-type") ?? "";
  if (!ALLOWED_TYPES.has(contentType)) return c.json({ error: "unsupported_media_type" }, 415);

  const consent = await loadConsent(c.env.DB, userId);
  if (!consent.photos) return c.json({ error: "consent_required" }, 403);

  const body = await c.req.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > MAX_PHOTO_BYTES) return c.json({ error: "invalid_photo" }, 400);

  const takenOn = localDate(await userTimeZone(c.env.DB, userId));
  const previous = await c.env.DB.prepare(
    "SELECT id, photo_key FROM body_photos WHERE user_id = ? AND pose = ? AND taken_on = ?",
  )
    .bind(userId, pose, takenOn)
    .first<{ id: string; photo_key: string }>();

  const id = newId();
  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const key = `body/${userId}/${id}.${extension}`;
  await c.env.PHOTOS.put(key, body, { httpMetadata: { contentType } });

  const statements = [
    c.env.DB.prepare(
      "INSERT INTO body_photos (id, user_id, pose, photo_key, taken_on, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind(id, userId, pose, key, takenOn, nowIso()),
  ];
  if (previous) statements.push(c.env.DB.prepare("DELETE FROM body_photos WHERE id = ?").bind(previous.id));
  await c.env.DB.batch(statements);
  if (previous) await c.env.PHOTOS.delete(previous.photo_key);

  return c.json({ id, pose, takenOn });
});

async function ownedPhoto(db: D1Database, id: string, userId: string) {
  return db
    .prepare("SELECT id, pose, photo_key, taken_on, created_at FROM body_photos WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<PhotoRow>();
}

bodyRoutes.get("/photos/:id", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "missing_userId" }, 400);
  const photo = await ownedPhoto(c.env.DB, c.req.param("id"), userId);
  if (!photo) return c.json({ error: "not_found" }, 404);
  const object = await c.env.PHOTOS.get(photo.photo_key);
  if (!object) return c.json({ error: "not_found" }, 404);
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "image/jpeg",
      // Foto sensível: sem cópia em cache
      "Cache-Control": "private, no-store",
    },
  });
});

bodyRoutes.delete("/photos/:id", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "missing_userId" }, 400);
  const photo = await ownedPhoto(c.env.DB, c.req.param("id"), userId);
  if (!photo) return c.json({ error: "not_found" }, 404);
  await c.env.PHOTOS.delete(photo.photo_key);
  await c.env.DB.prepare("DELETE FROM body_photos WHERE id = ?").bind(photo.id).run();
  return c.json({ ok: true });
});

/** LGPD: apaga fotos, análises e consentimentos de uma vez */
bodyRoutes.delete("/", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "missing_userId" }, 400);
  await deleteAllBodyData(c.env, userId);
  await c.env.DB.prepare("DELETE FROM body_photo_consents WHERE user_id = ?").bind(userId).run();
  return c.json({ ok: true });
});

function toBase64(bytes: ArrayBuffer) {
  const view = new Uint8Array(bytes);
  let binary = "";
  // Em blocos: String.fromCharCode com a foto inteira estoura a pilha
  for (let i = 0; i < view.length; i += 0x8000) binary += String.fromCharCode(...view.subarray(i, i + 0x8000));
  return btoa(binary);
}

const analyzeSchema = z.object({
  userId: z.string().min(1),
  takenOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Manda as fotos de um dia para a IA e guarda a análise (o treino só é criado se a pessoa pedir) */
bodyRoutes.post("/analyze", async (c) => {
  const parsed = analyzeSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  const { userId, takenOn } = parsed.data;

  const consent = await loadConsent(c.env.DB, userId);
  if (!consent.photos || !consent.ai) return c.json({ error: "consent_required" }, 403);
  const locked = await requireAiAccess(c, userId);
  if (locked) return locked;

  const apiKey = c.env.GEMINI_API_KEY || c.env.GOOGLE_API_KEY || c.env.ANTHROPIC_API_KEY;
  if (!apiKey) return c.json({ error: "ai_not_configured" }, 503);

  const today = localDate(await userTimeZone(c.env.DB, userId));
  const usedToday = await c.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM body_analyses WHERE user_id = ? AND substr(created_at, 1, 10) >= ?",
  )
    .bind(userId, today)
    .first<{ n: number }>();
  if ((usedToday?.n ?? 0) >= DAILY_ANALYSIS_LIMIT) return c.json({ error: "daily_limit" }, 429);

  const { results: photos } = await c.env.DB.prepare(
    "SELECT id, pose, photo_key, taken_on, created_at FROM body_photos WHERE user_id = ? AND taken_on = ?",
  )
    .bind(userId, takenOn)
    .all<PhotoRow>();
  if (!photos.some((p) => p.pose === "frente")) return c.json({ error: "front_photo_required" }, 400);

  const images = (
    await Promise.all(
      [...photos]
        .sort((a, b) => BODY_POSES.indexOf(a.pose) - BODY_POSES.indexOf(b.pose))
        .map(async (p) => {
          const object = await c.env.PHOTOS.get(p.photo_key);
          if (!object) return null;
          return {
            pose: p.pose,
            base64: toBase64(await object.arrayBuffer()),
            mediaType: object.httpMetadata?.contentType ?? "image/jpeg",
          };
        }),
    )
  ).filter((p): p is NonNullable<typeof p> => p !== null);

  const [plan, catalog] = await Promise.all([
    loadProfileWithTargets(c.env.DB, userId).catch(() => null),
    c.env.DB.prepare(
      "SELECT id, name, muscle_group, equipment FROM exercises WHERE user_id IS NULL OR user_id = ? ORDER BY muscle_group, name",
    )
      .bind(userId)
      .all<{ id: string; name: string; muscle_group: string; equipment: string }>(),
  ]);
  const profileText = plan
    ? [
        `Objetivo: ${GOAL_LABEL[plan.profile.goal] ?? plan.profile.goal}${plan.profile.emphasis ? ` (ênfase: ${plan.profile.emphasis})` : ""}`,
        `Sexo: ${plan.profile.sex}, ${plan.profile.ageYears} anos, ${plan.profile.heightCm} cm, ${plan.profile.weightKg} kg`,
        `Treina ${plan.profile.trainingDays} dias por semana`,
      ].join("\n")
    : "";

  let result: BodyAnalysis;
  try {
    result = await analyzeBody(apiKey, { photos: images, profileText, catalog: catalog.results });
  } catch (err) {
    if (err instanceof BodyAnalysisError) return c.json({ error: "analysis_failed" }, 422);
    if (err instanceof Anthropic.RateLimitError) return c.json({ error: "busy" }, 503);
    console.error(JSON.stringify({ message: "body analysis failed", error: err instanceof Error ? err.message : String(err) }));
    return c.json({ error: "analysis_failed" }, 502);
  }

  // Fotos que não deram para avaliar: devolve a orientação sem guardar uma análise vazia
  if (result.focusAreas.length === 0 || result.workout.exercises.length === 0) {
    return c.json({ error: "unsuitable_photos", note: result.note }, 422);
  }

  const id = newId();
  const createdAt = nowIso();
  await c.env.DB.prepare(
    "INSERT INTO body_analyses (id, user_id, taken_on, result, workout_id, created_at) VALUES (?, ?, ?, ?, NULL, ?)",
  )
    .bind(id, userId, takenOn, JSON.stringify(result), createdAt)
    .run();

  return c.json({ analysis: { id, takenOn, createdAt, workoutId: null, result } });
});

/** Cria o treino sugerido pela análise (uma vez só; pedir de novo devolve o mesmo treino) */
bodyRoutes.post("/analyses/:id/workout", async (c) => {
  const body = await c.req.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : null;
  if (!userId) return c.json({ error: "missing_userId" }, 400);

  const row = await c.env.DB.prepare(
    "SELECT id, taken_on, result, workout_id, created_at FROM body_analyses WHERE id = ? AND user_id = ?",
  )
    .bind(c.req.param("id"), userId)
    .first<AnalysisRow>();
  if (!row) return c.json({ error: "not_found" }, 404);
  if (row.workout_id) return c.json({ workoutId: row.workout_id });

  const { workout } = JSON.parse(row.result) as BodyAnalysis;
  const workoutId = await createWorkoutRecord(c.env.DB, userId, {
    name: workout.name,
    description: workout.description || "Montado a partir da análise do shape",
    exercises: workout.exercises.map((e, i) => ({ ...e, order: i + 1, notes: e.notes || undefined })),
  });
  await c.env.DB.prepare("UPDATE body_analyses SET workout_id = ? WHERE id = ?").bind(workoutId, row.id).run();
  return c.json({ workoutId });
});
