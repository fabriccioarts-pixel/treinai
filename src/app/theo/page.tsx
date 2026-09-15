import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AiCoachChat } from "@/components/workout/ai-coach-chat";

export default function TheoPage() {
  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col">
      {/* Premium header with humanized coach identity */}
      <div className="mb-1 flex items-center gap-3 pb-4">
        <Link
          href="/"
          aria-label="Voltar"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="relative shrink-0">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-gradient-to-b from-primary/15 to-primary/5 text-primary shadow-xs">
            <span className="text-base font-bold text-primary">T</span>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 duration-1000" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-foreground">
              Théo
            </h1>
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-primary">
              Personal Trainer
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Baseado nos seus dados reais de treino
          </p>
        </div>
      </div>

      {/* Gradient separator */}
      <div className="mb-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <AiCoachChat />
    </div>
  );
}
