"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  title: string;
  text: string;
  className?: string;
  iconOnly?: boolean;
}

export function ShareButton({ title, text, className, iconOnly = false }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.origin : undefined;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // usuário cancelou o compartilhamento — não é um erro a ser tratado
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url ? `${text}\n${url}` : text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível — ignora silenciosamente
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        "flex items-center gap-1.5 rounded-full text-xs font-medium text-muted-foreground transition-colors hover:text-primary",
        className
      )}
      aria-label="Compartilhar"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-primary" />
          {!iconOnly && "Copiado!"}
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5" />
          {!iconOnly && "Compartilhar"}
        </>
      )}
    </button>
  );
}
