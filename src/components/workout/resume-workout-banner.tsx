"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export function ResumeWorkoutBanner({
  sessionId,
  workoutId,
  workoutName,
  onDiscard,
}: {
  sessionId: string;
  workoutId: string;
  workoutName: string;
  onDiscard: () => Promise<void>;
}) {
  const pathname = usePathname();
  const executeHref = `/treinos/${workoutId}/executar/${sessionId}`;
  const discardFormId = `discard-session-${sessionId}`;

  if (pathname === executeHref) return null;

  return (
    <Card className="mb-5 flex-row items-center gap-3 border-none bg-gradient-to-br from-primary/15 via-card to-card p-3.5 ring-1 ring-primary/20">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Dumbbell className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">Treino em andamento</p>
        <p className="truncate text-sm font-semibold text-foreground">{workoutName}</p>
      </div>

      <AlertDialog>
        <AlertDialogTrigger className={buttonVariants({ size: "sm", className: "shrink-0" })}>
          Retomar
        </AlertDialogTrigger>
        <AlertDialogContent>
          <form id={discardFormId} action={onDiscard} />
          <AlertDialogHeader>
            <AlertDialogTitle>Treino em andamento</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem o treino &ldquo;{workoutName}&rdquo; em andamento. Quer retomar de onde parou ou cancelar
              essa sessão?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              variant="destructive"
              nativeButton
              render={<button type="submit" form={discardFormId} />}
            >
              Cancelar treino
            </AlertDialogCancel>
            <AlertDialogAction render={<Link href={executeHref} />}>Retomar treino</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
