"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-transparent py-14 text-center"
    >
      {/* Subtle radial glow behind icon */}
      <div className="absolute top-8 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />

      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 ring-1 ring-primary/10"
      >
        <Icon className="h-6 w-6 text-primary/70" strokeWidth={1.75} />
      </motion.div>

      <div className="relative space-y-1.5 px-6">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action}
    </motion.div>
  );
}
