"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 5_000;
/** Depois disso a pessoa já tem o botão "Ver minha assinatura"; não adianta ficar consultando */
const MAX_TRIES = 24;

/** Recarrega os dados da página até o webhook da Cakto liberar a assinatura */
export function RefreshUntilActive() {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (tries > MAX_TRIES) clearInterval(timer);
      else router.refresh();
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
