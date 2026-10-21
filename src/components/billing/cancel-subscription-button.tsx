"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cancelSubscriptionAction } from "@/app/actions/billing-actions";
import { formatDate } from "@/lib/billing";

/** Cancelar a renovação: o acesso já pago continua até o fim do período */
export function CancelSubscriptionButton({ paidUntil }: { paidUntil: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelSubscriptionAction();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="mt-6 text-center">
      <AlertDialog>
        <AlertDialogTrigger
          disabled={pending}
          className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {pending ? "Cancelando…" : "Cancelar assinatura"}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar a assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Não haverá novas cobranças.
              {paidUntil ? ` O Théo continua liberado até ${formatDate(paidUntil)}.` : ""} Seus treinos e registros
              continuam salvos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter assinatura</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={cancel}>
              Cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
