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
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
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
