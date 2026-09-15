import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  href?: string;
  linkLabel?: string;
}

export function SectionHeader({ title, href, linkLabel = "Ver tudo" }: SectionHeaderProps) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="h-5 w-0.5 rounded-full bg-gradient-to-b from-primary to-accent/60" />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          {linkLabel}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
