import type { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-6 sm:max-w-lg lg:max-w-3xl lg:px-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
