import type { ReactNode } from "react";

export default function ExecutarLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-6 sm:max-w-lg lg:max-w-2xl">{children}</div>
  );
}
