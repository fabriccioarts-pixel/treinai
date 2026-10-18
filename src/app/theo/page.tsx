import Link from "next/link";
import { redirect } from "next/navigation";
import { SquarePen } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AiCoachChat, type Turn } from "@/components/workout/ai-coach-chat";
import { CoachHistorySheet } from "@/components/workout/coach-history-sheet";
import { BackButton } from "@/components/shared/back-button";
import { Illustration } from "@/components/ui/illustration";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

export default async function TheoPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { c: conversationId } = await searchParams;

  let initialTurns: Turn[] = [];
  if (conversationId) {
    // Conversa apagada ou de outra conta: abre uma nova em vez de quebrar a página
    const result = await workerApi.getCoachConversation(session.user.id, conversationId).catch(() => null);
    if (!result) redirect("/theo");
    initialTurns = result.messages.map((m) => ({
      role: m.role,
      text: m.content,
      actions: m.actions.length > 0 ? m.actions : undefined,
    }));
  }

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col">
      {/* Premium header with humanized coach identity */}
      {/* Topo: voltar no canto esquerdo (convenção do iOS/Android); nova conversa e histórico à direita */}
      <div className="mb-1 flex items-center gap-2 pb-4">
        <BackButton />

        <div className="relative shrink-0">
          <div className="relative flex h-12 w-12 items-center justify-center">
            <Illustration name="theo" size={56} priority className="-m-1" />
            <span className="absolute bottom-0.5 right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 duration-1000" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-foreground">
              Théo
            </h1>
            <span className="hidden items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium tracking-wide text-primary min-[400px]:inline-flex">
              Personal Trainer
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            Baseado nos seus dados reais de treino
          </p>
        </div>

        <div className="ml-auto flex shrink-0 items-center">
          <Link
            href="/theo"
            replace
            aria-label="Nova conversa"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <SquarePen className="h-5 w-5" />
          </Link>
          <CoachHistorySheet />
        </div>
      </div>

      {/* Gradient separator */}
      <div className="mb-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* key: trocar de conversa (ou abrir uma nova) remonta o chat com o estado certo */}
      <AiCoachChat key={conversationId ?? "nova"} conversationId={conversationId} initialTurns={initialTurns} syncUrl voice />
    </div>
  );
}
