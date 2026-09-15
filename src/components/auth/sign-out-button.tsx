"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      type="button"
      className="h-11 w-full gap-2.5 rounded-xl bg-destructive px-8 text-sm font-semibold text-destructive-foreground shadow-sm shadow-destructive/20 transition-all hover:bg-destructive/90 hover:shadow-md hover:shadow-destructive/30 active:scale-[0.99]"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut className="h-4 w-4" />
      Sair da conta
    </Button>
  );
}
