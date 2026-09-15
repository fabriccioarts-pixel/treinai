import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AiCoachChat } from "@/components/workout/ai-coach-chat";

const GREETING_PROMPT =
  "Você está conversando com um usuário que acabou de criar a conta no Treinai. Dê boas-vindas de forma breve e calorosa, se apresente como o personal trainer dele, e comente rapidamente sobre o plano de treino que já está pronto para ele. Termine perguntando o que ele gostaria de fazer primeiro.";

export default function BemVindoConversaPage() {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col px-4 py-4 sm:max-w-lg lg:max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <Image
          src="/ai-coach-avatar.png"
          alt="Théo"
          width={40}
          height={40}
          className="h-10 w-10 rounded-full ring-1 ring-primary/30"
        />
        <div>
          <h1 className="text-lg font-semibold text-foreground">Conta criada! 🎉</h1>
          <p className="text-xs text-muted-foreground">Seu personal trainer já está te esperando</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <AiCoachChat autoGreetMessage={GREETING_PROMPT} />
      </div>

      <Link
        href="/"
        className={buttonVariants({
          variant: "outline",
          className: "mt-3 h-11 w-full gap-2 text-sm font-semibold",
        })}
      >
        Ir para o app
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
