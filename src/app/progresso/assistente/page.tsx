import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AiCoachChat } from "@/components/workout/ai-coach-chat";

export default function AssistenteIaPage() {
  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/progresso"
          aria-label="Voltar"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Image
          src="/ai-coach-avatar.png"
          alt="Personal trainer IA"
          width={36}
          height={36}
          className="h-9 w-9 rounded-full ring-1 ring-primary/30"
        />
        <div>
          <h1 className="text-lg font-semibold text-foreground">Personal trainer IA</h1>
          <p className="text-xs text-muted-foreground">Baseado nos seus dados reais de treino</p>
        </div>
      </div>
      <AiCoachChat />
    </div>
  );
}
