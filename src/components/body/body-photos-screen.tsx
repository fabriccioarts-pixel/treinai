"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Camera, ChevronDown, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScannerFrame } from "@/components/nutrition/scanner-frame";
import { BodyCamera } from "@/components/body/body-camera";
import {
  analyzeBodyAction,
  createWorkoutFromBodyAnalysisAction,
  deleteAllBodyDataAction,
  deleteBodyPhotoAction,
  setBodyConsentAction,
  uploadBodyPhotoAction,
} from "@/app/actions/body-actions";
import {
  BODY_POSES,
  PHOTO_GUIDE,
  POSE_LABEL,
  bodyPhotoUrl,
  groupByDay,
  type BodyAnalysis,
  type BodyOverview,
  type BodyPose,
} from "@/lib/body-photos";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Refaz a foto no aparelho antes de enviar: reduz para no máximo 1600 px e regrava em JPEG.
 * Regravar pelo canvas descarta os metadados (EXIF), inclusive a localização (GPS).
 */
async function cleanPhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!blob) throw new Error("canvas_unavailable");
  return new File([blob], "corpo.jpg", { type: "image/jpeg" });
}

const CONFIDENCE_LABEL: Record<BodyAnalysis["result"]["confidence"], string> = {
  alta: "Fotos boas para avaliar",
  media: "Avaliação razoável: fotos com alguma limitação",
  baixa: "Avaliação limitada: refaça as fotos seguindo o guia",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 px-1 text-sm font-semibold text-muted-foreground">{children}</h2>;
}

export function BodyPhotosScreen({
  overview,
  today,
  exerciseNames,
}: {
  overview: BodyOverview;
  /** Data de hoje (AAAA-MM-DD) no fuso do usuário */
  today: string;
  exerciseNames: Record<string, string>;
}) {
  const { consent, photos, analyses } = overview;
  const days = useMemo(() => groupByDay(photos), [photos]);
  const todayPoses = days.find((d) => d.takenOn === today)?.poses ?? {};
  // Dia mais recente com a foto de frente: é o que a IA analisa
  const analyzableDay = days.find((d) => d.poses.frente);
  const latestAnalysis = analyses[0];

  const fileInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [cameraPose, setCameraPose] = useState<BodyPose | null>(null);
  const [pendingPose, setPendingPose] = useState<BodyPose | null>(null);
  const [targetPose, setTargetPose] = useState<BodyPose>("frente");
  const [message, setMessage] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<{ text: string; paywall?: boolean } | null>(null);
  const [analyzing, startAnalyzing] = useTransition();
  const [creating, startCreating] = useTransition();
  const [createdWorkoutId, setCreatedWorkoutId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, startBusy] = useTransition();
  const [comparePose, setComparePose] = useState<BodyPose>("frente");

  async function upload(pose: BodyPose, file: File | undefined) {
    if (!file) return;
    setMessage(null);
    setPendingPose(pose);
    try {
      const form = new FormData();
      form.append("photo", await cleanPhoto(file));
      const result = await uploadBodyPhotoAction(pose, form);
      if (result.error) setMessage(result.error);
    } catch {
      setMessage("Não consegui abrir essa foto. Tente outra.");
    } finally {
      setPendingPose(null);
      if (fileInput.current) fileInput.current.value = "";
      if (galleryInput.current) galleryInput.current.value = "";
    }
  }

  const closeCamera = useCallback(() => setCameraPose(null), []);

  function openCamera(pose: BodyPose) {
    setTargetPose(pose);
    setCameraPose(pose);
  }

  function handleCapture(file: File) {
    const pose = cameraPose ?? targetPose;
    setCameraPose(null);
    void upload(pose, file);
  }

  // Seletores de arquivo precisam abrir no mesmo toque, antes de fechar a câmera
  function pickFromGallery() {
    galleryInput.current?.click();
    setCameraPose(null);
  }

  function openNativeCamera() {
    fileInput.current?.click();
    setCameraPose(null);
  }

  function analyze() {
    if (!analyzableDay) return;
    setAnalysisError(null);
    setCreatedWorkoutId(null);
    startAnalyzing(async () => {
      const result = await analyzeBodyAction(analyzableDay.takenOn);
      if (result.error) setAnalysisError({ text: result.error, paywall: result.paywall });
    });
  }

  function createWorkout(analysisId: string) {
    startCreating(async () => {
      const result = await createWorkoutFromBodyAnalysisAction(analysisId);
      if (result.workoutId) setCreatedWorkoutId(result.workoutId);
      else setAnalysisError({ text: result.error ?? "Não foi possível criar o treino agora." });
    });
  }

  const comparable = days.filter((d) => d.poses[comparePose]);
  const before = comparable.at(-1);
  const after = comparable[0];
  const workoutId = latestAnalysis?.workoutId ?? createdWorkoutId;

  return (
    <div className="space-y-8">
      {/* Fotos de hoje */}
      <section>
        <SectionTitle>Fotos de hoje</SectionTitle>
        <div className="grid grid-cols-3 gap-2.5">
          {BODY_POSES.map((pose) => {
            const photo = todayPoses[pose];
            const loading = pendingPose === pose;
            return (
              <div key={pose} className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => openCamera(pose)}
                  disabled={loading}
                  aria-label={photo ? `Refazer a foto de ${POSE_LABEL[pose]}` : `Tirar a foto de ${POSE_LABEL[pose]}`}
                  className={cn(
                    "relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-2xl transition-colors",
                    photo ? "bg-muted" : "border border-dashed border-border bg-card/50 hover:border-primary/50",
                  )}
                >
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- foto privada servida pela rota autenticada
                    <img src={bodyPhotoUrl(photo.id)} alt={`Foto de ${POSE_LABEL[pose]} de hoje`} className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-6 w-6 text-muted-foreground" aria-hidden />
                  )}
                  {loading && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Enviando" />
                    </span>
                  )}
                </button>
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-xs font-medium text-foreground/85">{POSE_LABEL[pose]}</span>
                  {photo && (
                    <button
                      type="button"
                      onClick={() => startBusy(async () => void (await deleteBodyPhotoAction(photo.id)))}
                      aria-label={`Apagar a foto de ${POSE_LABEL[pose]}`}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {message && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {message}
          </p>
        )}
      </section>

      {/* Análise do shape */}
      <section>
        <SectionTitle>Análise do shape</SectionTitle>
        <div className="rounded-3xl border border-border bg-card p-5">
          {!analyzableDay ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Tire pelo menos a foto de frente para a IA avaliar o seu shape e montar um treino em cima do que você mais
              precisa desenvolver.
            </p>
          ) : !consent.ai ? (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Para analisar, as fotos do dia são enviadas a um serviço de inteligência artificial parceiro. Você ainda não
                autorizou isso.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => startBusy(async () => void (await setBodyConsentAction({ photos: true, ai: true })))}
                className="w-full"
              >
                Autorizar a análise por IA
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {analyzing && analyzableDay.poses.frente && (
                <div className="relative mx-auto aspect-[3/4] w-40 overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element -- foto privada servida pela rota autenticada */}
                  <img src={bodyPhotoUrl(analyzableDay.poses.frente.id)} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/25" aria-hidden />
                  <ScannerFrame className="inset-2" />
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Fotos de {formatDate(analyzableDay.takenOn)} ·{" "}
                  {BODY_POSES.filter((p) => analyzableDay.poses[p]).map((p) => POSE_LABEL[p].toLowerCase()).join(", ")}
                </p>
              </div>
              <Button type="button" onClick={analyze} disabled={analyzing} className="h-11 w-full gap-2 rounded-xl font-semibold">
                <Sparkles className="h-4 w-4" />
                {analyzing ? "Analisando o shape…" : latestAnalysis ? "Analisar de novo" : "Analisar meu shape"}
              </Button>
              {analysisError && (
                <div className="space-y-2">
                  <p role="alert" className="text-sm text-foreground/90">
                    {analysisError.text}
                  </p>
                  {analysisError.paywall && (
                    <Link href="/assinar" className={buttonVariants({ className: "h-10 w-full gap-2" })}>
                      Ver planos
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {latestAnalysis && !analyzing && (
            <AnalysisResult
              analysis={latestAnalysis}
              exerciseNames={exerciseNames}
              workoutId={workoutId}
              creating={creating}
              onCreateWorkout={() => createWorkout(latestAnalysis.id)}
            />
          )}
        </div>
      </section>

      {/* Evolução: o primeiro registro contra o mais recente, por pose */}
      <section>
        <SectionTitle>Evolução</SectionTitle>
        {days.length < 2 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-sm leading-relaxed text-muted-foreground">
            O antes e depois aparece aqui a partir do segundo registro. Repita as fotos daqui a 2 a 4 semanas, no mesmo
            lugar e com a mesma luz.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-1.5" role="tablist" aria-label="Pose para comparar">
              {BODY_POSES.map((pose) => (
                <button
                  key={pose}
                  type="button"
                  role="tab"
                  aria-selected={comparePose === pose}
                  onClick={() => setComparePose(pose)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    comparePose === pose ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground",
                  )}
                >
                  {POSE_LABEL[pose]}
                </button>
              ))}
            </div>
            {before && after && before !== after ? (
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "Antes", day: before },
                  { label: "Agora", day: after },
                ].map(({ label, day }) => (
                  <figure key={label} className="space-y-1.5">
                    <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element -- foto privada servida pela rota autenticada */}
                      <img src={bodyPhotoUrl(day.poses[comparePose]!.id)} alt={`${label}: ${formatDate(day.takenOn)}`} className="h-full w-full object-cover" />
                    </div>
                    <figcaption className="px-0.5 text-xs">
                      <span className="font-semibold text-foreground">{label}</span>{" "}
                      <span className="text-muted-foreground">· {formatDate(day.takenOn)}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Ainda não há dois registros com essa pose.</p>
            )}
            <p className="px-1 text-xs text-muted-foreground">
              {days.length} registros · primeiro em {formatDate(days.at(-1)!.takenOn)}
            </p>
          </div>
        )}
      </section>

      {/* Guia: aberto enquanto não há nenhuma foto */}
      <section>
        <details open={photos.length === 0} className="group rounded-3xl border border-border bg-card p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground">
            Como tirar as fotos
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <ol className="mt-4 space-y-3">
            {PHOTO_GUIDE.map((tip, i) => (
              <li key={tip.title} className="flex items-start gap-3">
                <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{tip.title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{tip.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </details>
      </section>

      {/* Privacidade: autorizações e o direito de apagar tudo */}
      <section>
        <SectionTitle>Privacidade</SectionTitle>
        <div className="space-y-4 rounded-3xl border border-border bg-card p-5">
          <label className="flex items-start justify-between gap-4">
            <span>
              <span className="block text-sm font-medium text-foreground">Análise por IA</span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                Envia as fotos do dia a um serviço de IA parceiro só quando você pede uma análise.
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={Boolean(consent.ai)}
              disabled={busy}
              onChange={(e) => {
                const ai = e.target.checked;
                startBusy(async () => void (await setBodyConsentAction({ photos: true, ai })));
              }}
              className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)]"
            />
          </label>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Fotos autorizadas em {consent.photos ? formatDate(consent.photos.slice(0, 10)) : "—"}. Elas ficam guardadas de
            forma privada e só você vê. Você pode apagar uma foto tocando na lixeira, ou apagar tudo abaixo. Apagar tudo
            também revoga as autorizações.
          </p>
          {confirmDelete ? (
            <div className="space-y-2 rounded-2xl border border-destructive/40 bg-destructive/5 p-3">
              <p className="text-sm text-foreground">
                Apagar {photos.length} {photos.length === 1 ? "foto" : "fotos"} e todas as análises? Não dá para desfazer.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)} disabled={busy}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => startBusy(async () => void (await deleteAllBodyDataAction()))}
                >
                  {busy ? "Apagando…" : "Apagar tudo"}
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)} className="w-full gap-2">
              <Trash2 className="h-4 w-4" />
              Apagar todas as fotos e análises
            </Button>
          )}
        </div>
      </section>

      {/* Reserva da câmera do app e galeria (sem capture) */}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => upload(targetPose, e.target.files?.[0])}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => upload(targetPose, e.target.files?.[0])}
      />

      {cameraPose && (
        <BodyCamera
          pose={cameraPose}
          onCapture={handleCapture}
          onPickFromGallery={pickFromGallery}
          onNativeCamera={openNativeCamera}
          onClose={closeCamera}
        />
      )}
    </div>
  );
}

function AnalysisResult({
  analysis,
  exerciseNames,
  workoutId,
  creating,
  onCreateWorkout,
}: {
  analysis: BodyAnalysis;
  exerciseNames: Record<string, string>;
  workoutId: string | null;
  creating: boolean;
  onCreateWorkout: () => void;
}) {
  const { result } = analysis;
  return (
    <div className="mt-5 space-y-5 border-t border-border/60 pt-5">
      <div>
        <p className="text-xs text-muted-foreground">
          Análise de {formatDate(analysis.createdAt.slice(0, 10))} · {CONFIDENCE_LABEL[result.confidence]}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{result.summary}</p>
      </div>

      {result.strengths.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Pontos fortes</p>
          <ul className="space-y-1.5">
            {result.strengths.map((s) => (
              <li key={s} className="flex items-start gap-2 text-sm text-foreground/90">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Para desenvolver</p>
        <ul className="space-y-2">
          {result.focusAreas.map((f) => (
            <li key={f.muscle} className="rounded-xl bg-muted/50 px-3 py-2.5">
              <p className="text-sm font-semibold text-primary">{MUSCLE_GROUP_LABEL[f.muscle as MuscleGroup] ?? f.muscle}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-foreground/85">{f.reason}</p>
            </li>
          ))}
        </ul>
        {result.postureNote && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{result.postureNote}</p>}
      </div>

      <div className="rounded-2xl border border-border p-4">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Treino sugerido</p>
        <p className="mt-1 text-base font-semibold text-foreground">{result.workout.name}</p>
        {result.workout.description && <p className="text-sm text-muted-foreground">{result.workout.description}</p>}
        <ol className="mt-3 divide-y divide-border/50">
          {result.workout.exercises.map((e, i) => (
            <li key={e.exerciseId} className="flex items-center gap-3 py-2">
              <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{exerciseNames[e.exerciseId] ?? e.exerciseId}</span>
              <span className="tabular shrink-0 text-xs text-muted-foreground">
                {e.targetSets}×{e.targetRepsMin === e.targetRepsMax ? e.targetRepsMin : `${e.targetRepsMin}–${e.targetRepsMax}`}
              </span>
            </li>
          ))}
        </ol>
        {workoutId ? (
          <Link href={`/treinos/${workoutId}`} className={buttonVariants({ variant: "outline", className: "mt-3 h-11 w-full gap-2 rounded-xl" })}>
            Ver o treino criado
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Button type="button" onClick={onCreateWorkout} disabled={creating} className="mt-3 h-11 w-full rounded-xl font-semibold">
            {creating ? "Criando…" : "Criar este treino"}
          </Button>
        )}
      </div>

      {result.note && <p className="text-xs leading-relaxed text-muted-foreground">{result.note}</p>}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Leitura visual feita por IA, não substitui a avaliação de um profissional de educação física.
      </p>
    </div>
  );
}
