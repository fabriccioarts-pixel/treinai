"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2, PencilLine, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { analyzeMealAction, saveMealAction } from "@/app/actions/nutrition-actions";
import { resizeImageToJpegBase64 } from "@/lib/image";
import {
  MEAL_TYPE_LABEL,
  formatKcal,
  mealTypeForNow,
  type MealEstimate,
  type MealItem,
  type MealType,
} from "@/lib/nutrition";
import { cn } from "@/lib/utils";

type Step =
  | { name: "closed" }
  | { name: "describe" }
  | { name: "analyzing"; previewUrl: string | null }
  | { name: "review"; previewUrl: string | null; estimate: MealEstimate }
  | { name: "error"; previewUrl: string | null; message: string };

/** Item em revisão: guarda a estimativa original para recalcular os macros quando a porção muda */
interface DraftItem {
  base: MealItem;
  grams: string;
}

const CONFIDENCE_LABEL: Record<MealEstimate["confidence"], string> = {
  alta: "Estimativa boa",
  media: "Estimativa razoável — confira as porções",
  baixa: "Estimativa difícil — ajuste as porções",
};

function scaled(item: DraftItem): MealItem {
  const grams = Number(item.grams.replace(",", ".")) || 0;
  const factor = item.base.grams > 0 ? grams / item.base.grams : 0;
  return {
    name: item.base.name,
    grams,
    kcal: Math.round(item.base.kcal * factor),
    protein_g: Math.round(item.base.protein_g * factor),
    carbs_g: Math.round(item.base.carbs_g * factor),
    fat_g: Math.round(item.base.fat_g * factor),
  };
}

export function MealLogger() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>({ name: "closed" });
  const [source, setSource] = useState<"foto" | "texto">("foto");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [mealType, setMealType] = useState<MealType>("almoco");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const previewUrl = step.name === "analyzing" || step.name === "review" || step.name === "error" ? step.previewUrl : null;

  function close() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setStep({ name: "closed" });
    setSaveError(null);
  }

  async function runAnalysis(input: Parameters<typeof analyzeMealAction>[0], preview: string | null) {
    setMealType(mealTypeForNow());
    setSaveError(null);
    setStep({ name: "analyzing", previewUrl: preview });
    const result = await analyzeMealAction(input);
    if (!result.estimate) {
      setStep({ name: "error", previewUrl: preview, message: result.error ?? "Não consegui analisar agora." });
      return;
    }
    setItems(result.estimate.items.map((base) => ({ base, grams: String(base.grams) })));
    setStep({ name: "review", previewUrl: preview, estimate: result.estimate });
  }

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    setSource("foto");
    const preview = URL.createObjectURL(file);
    try {
      const base64 = await resizeImageToJpegBase64(file);
      await runAnalysis({ photoBase64: base64, mediaType: "image/jpeg" }, preview);
    } catch {
      setStep({ name: "error", previewUrl: preview, message: "Não consegui abrir essa foto. Tente outra." });
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function handleDescribe() {
    setSource("texto");
    void runAnalysis({ text: description }, null);
  }

  function handleSave() {
    const finalItems = items.map(scaled).filter((i) => i.grams > 0);
    if (finalItems.length === 0) {
      setSaveError("Deixe pelo menos um alimento com porção maior que zero.");
      return;
    }
    startSaving(async () => {
      const result = await saveMealAction({ mealType, source, items: finalItems });
      if (result.error) {
        setSaveError(result.error);
        return;
      }
      setDescription("");
      close();
    });
  }

  const totals = items.map(scaled).reduce(
    (t, i) => ({ kcal: t.kcal + i.kcal, p: t.p + i.protein_g, c: t.c + i.carbs_g, g: t.g + i.fat_g }),
    { kcal: 0, p: 0, c: 0, g: 0 },
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="lg"
          className="h-14 gap-2 rounded-xl text-sm font-semibold"
          onClick={() => fileInput.current?.click()}
        >
          <Camera className="h-5 w-5" />
          Foto do prato
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-14 gap-2 rounded-xl text-sm font-semibold"
          onClick={() => setStep({ name: "describe" })}
        >
          <PencilLine className="h-5 w-5" />
          Escrever
        </Button>
      </div>
      {/* capture abre direto a câmera traseira no celular; no computador abre o seletor de arquivos */}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handlePhoto(e.target.files?.[0])}
      />

      <Sheet open={step.name !== "closed"} onOpenChange={(open) => !open && !saving && close()}>
        <SheetContent side="bottom" className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-3xl px-4 pt-5 pb-6">
          <SheetHeader className="px-0">
            <SheetTitle>
              {step.name === "describe" ? "O que você comeu?" : step.name === "review" ? "Confira a refeição" : "Registrar refeição"}
            </SheetTitle>
            <SheetDescription>
              {step.name === "describe"
                ? "Escreva do seu jeito, com quantidades se souber."
                : step.name === "review"
                  ? "Ajuste as porções se precisar e salve."
                  : "O Théo está identificando os alimentos."}
            </SheetDescription>
          </SheetHeader>

          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:), sem otimização do next/image
            <img src={previewUrl} alt="Foto da refeição" className="mt-3 h-40 w-full rounded-2xl object-cover" />
          )}

          {step.name === "describe" && (
            <div className="mt-3 space-y-3">
              <textarea
                autoFocus
                rows={3}
                value={description}
                maxLength={500}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: 2 colheres de arroz, 1 concha de feijão, 1 filé de frango grelhado e salada"
                className="w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
              <Button
                type="button"
                size="lg"
                className="h-12 w-full text-base font-semibold"
                disabled={description.trim().length < 2}
                onClick={handleDescribe}
              >
                Calcular
              </Button>
            </div>
          )}

          {step.name === "analyzing" && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground" role="status">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Analisando…
            </div>
          )}

          {step.name === "error" && (
            <div className="mt-4 space-y-3">
              <p role="alert" className="text-sm text-foreground/90">
                {step.message}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
                  Outra foto
                </Button>
                <Button type="button" variant="outline" onClick={() => setStep({ name: "describe" })}>
                  Escrever
                </Button>
              </div>
            </div>
          )}

          {step.name === "review" && (
            <div className="mt-4 space-y-4">
              <ul className="space-y-2">
                {items.map((item, index) => {
                  const s = scaled(item);
                  return (
                    <li key={index} className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{item.base.name}</p>
                        <p className="tabular text-xs text-muted-foreground">
                          {s.kcal} kcal · P {s.protein_g} · C {s.carbs_g} · G {s.fat_g}
                        </p>
                      </div>
                      <div className="relative w-[84px] shrink-0">
                        <Input
                          inputMode="numeric"
                          aria-label={`Porção de ${item.base.name} em gramas`}
                          value={item.grams}
                          onChange={(e) =>
                            setItems((prev) => prev.map((it, i) => (i === index ? { ...it, grams: e.target.value } : it)))
                          }
                          className="tabular h-9 pr-6 text-right"
                        />
                        <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">
                          g
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remover ${item.base.name}`}
                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>

              <p className="text-xs text-muted-foreground">
                {CONFIDENCE_LABEL[step.estimate.confidence]}
                {step.estimate.note ? ` · ${step.estimate.note}` : ""}
              </p>

              <div className="flex flex-wrap gap-2">
                {(Object.keys(MEAL_TYPE_LABEL) as MealType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={mealType === type}
                    onClick={() => setMealType(type)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      mealType === type
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border/60 bg-card text-muted-foreground hover:bg-muted/40",
                    )}
                  >
                    {MEAL_TYPE_LABEL[type]}
                  </button>
                ))}
              </div>

              {saveError && (
                <p role="alert" className="text-sm text-destructive">
                  {saveError}
                </p>
              )}

              <Button
                type="button"
                size="lg"
                className="tabular h-12 w-full text-base font-semibold"
                disabled={saving || items.length === 0}
                onClick={handleSave}
              >
                {saving ? "Salvando…" : `Salvar · ${formatKcal(totals.kcal)} kcal`}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
