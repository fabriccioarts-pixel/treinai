import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AiCoachChat } from "@/components/workout/ai-coach-chat";

export default function AssistenteIaPage() {
  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col">
      {/* Premium header with glow avatar and gradient accent */}
      <div className="mb-1 flex items-center gap-3 pb-4">
        <Link
          href="/progresso"
          aria-label="Voltar"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="relative shrink-0">
          <div className="absolute -inset-1.5 rounded-full bg-primary/15 blur-md" />
          <Image
            src="/ai-coach-avatar.png"
            alt="Personal trainer IA"
            width={40}
            height={40}
            className="relative h-10 w-10 rounded-full ring-2 ring-primary/30"
          />
          <Sparkles className="absolute -right-0.5 -top-0.5 h-3 w-3 text-chart-3" />
        </div>

        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Personal trainer IA
          </h1>
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
