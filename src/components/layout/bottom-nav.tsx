"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot } from "lucide-react";
import { HomeIcon, WorkoutIcon, ProgressIcon, ProfileIcon } from "@/components/ui/app-icon";
import { cn } from "@/lib/utils";
import { AsciiCoach } from "@/components/workout/ascii-coach";

const NAV_ITEMS = [
  { href: "/", label: "Início", icon: HomeIcon },
  { href: "/treinos", label: "Treinos", icon: WorkoutIcon },
  { href: "/theo", label: "Théo", icon: Bot },
  { href: "/progresso", label: "Progresso", icon: ProgressIcon },
  { href: "/perfil", label: "Perfil", icon: ProfileIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/85 backdrop-blur-lg safe-bottom">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 sm:max-w-lg">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors"
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground"
                )}
              >
                {href === "/theo" ? (
                  <AsciiCoach
                    variant="icon"
                    className={cn(
                      "h-8 w-8 rounded-full ring-1 transition-[box-shadow,color]",
                      isActive ? "ring-primary/60 text-primary" : "ring-border text-muted-foreground"
                    )}
                  />
                ) : (
                  <Icon
                    className="h-5 w-5"
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                )}
              </span>
              <span
                className={cn(
                  "leading-none",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
