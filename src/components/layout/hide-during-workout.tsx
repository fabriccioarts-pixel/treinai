"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Tela de execução do treino: /treinos/<id>/executar/<sessão> */
const WORKOUT_EXECUTION = /^\/treinos\/[^/]+\/executar(\/|$)/;

/** Esconde avisos que só tiram o foco no meio das séries (ex.: o banner do teste grátis) */
export function HideDuringWorkout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (WORKOUT_EXECUTION.test(pathname)) return null;
  return <>{children}</>;
}
