"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteProfileAction } from "@/app/actions/nutrition-actions";

/** Confirmação em linha (sem diálogo do navegador) antes de apagar os dados de saúde */
export function DeleteHealthDataButton() {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button type="button" variant="ghost" className="w-full text-destructive" onClick={() => setConfirming(true)}>
        Apagar meus dados de corpo e saúde
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm text-foreground/90">
        Vamos apagar peso, altura, histórico de peso, registros de água e seu plano. Seus treinos continuam. Isso não pode
        ser desfeito.
      </p>
      <div className="mt-3 flex gap-2">
        <Button type="button" variant="outline" className="flex-1" disabled={pending} onClick={() => setConfirming(false)}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="flex-1"
          disabled={pending}
          onClick={() => startTransition(() => deleteProfileAction())}
        >
          {pending ? "Apagando…" : "Apagar"}
        </Button>
      </div>
    </div>
  );
}
