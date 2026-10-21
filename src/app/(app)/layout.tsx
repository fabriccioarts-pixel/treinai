import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";
import { discardSessionAction } from "@/app/actions/session-actions";

/** Minutos desde o início da sessão; o D1 grava "AAAA-MM-DD HH:MM:SS" em UTC, sem o "Z" */
function minutesSince(startedAt: string): number | null {
  const time = Date.parse(startedAt.replace(" ", "T").replace(/(T[\d:.]+)$/, "$1Z"));
  return Number.isFinite(time) ? Math.max(0, Math.round((Date.now() - time) / 60_000)) : null;
}

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id;
  const [activeSession, billing] = userId
    ? await Promise.all([
        workerApi.getActiveSession(userId).catch((err) => {
          console.error("Erro ao carregar sessão ativa no layout:", err);
          return null;
        }),
        // Sem resposta do worker, o app segue sem a faixa do teste grátis
        workerApi.getBilling(userId).catch(() => null),
      ])
    : [null, null];
  // Progresso da sessão aberta, para o banner dizer o que já foi feito (e o que se perde ao descartar)
  const completedSets = activeSession
    ? await workerApi
        .listSessionSets(activeSession.id)
        .then(({ sets }) => sets.filter((s) => s.completed).length)
        .catch(() => null)
    : null;
  const minutesAgo = activeSession ? minutesSince(activeSession.started_at) : null;

  return (
    <AppShell
      activeSession={activeSession ? { ...activeSession, completedSets, minutesAgo } : null}
      onDiscardActiveSession={activeSession ? discardSessionAction.bind(null, activeSession.id) : undefined}
      billing={billing}
    >
      {children}
    </AppShell>
  );
}
