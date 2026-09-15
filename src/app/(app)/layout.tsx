import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";
import { discardSessionAction } from "@/app/actions/session-actions";

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const activeSession = session?.user?.id
    ? await workerApi.getActiveSession(session.user.id).catch((err) => {
        console.error("Erro ao carregar sessão ativa no layout:", err);
        return null;
      })
    : null;

  return (
    <AppShell
      activeSession={activeSession}
      onDiscardActiveSession={activeSession ? discardSessionAction.bind(null, activeSession.id) : undefined}
    >
      {children}
    </AppShell>
  );
}
