import type { ReactNode } from "react";
import Image from "next/image";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  background,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  background?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-1 items-center justify-center px-4 py-10 overflow-hidden">
      {/* Background layer */}
      {background && (
        <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center select-none overflow-hidden">
          {background}
          {/* Subtle vignette / overlay so form text stays clean and legible */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
        </div>
      )}

      <div className="relative z-10 w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-2 rounded-full bg-primary/20 blur-xl" />
            <Image
              src="/logo-icon.png"
              alt="Treinai"
              width={112}
              height={112}
              className="relative h-24 w-24 drop-shadow-2xl transition-transform hover:scale-105 duration-300"
              priority
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>

        {children}

        {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}
