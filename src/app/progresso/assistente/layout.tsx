import type { ReactNode } from "react";

export default function AssistenteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col px-4 py-4 sm:max-w-lg lg:max-w-2xl">
      {children}
    </div>
  );
}
