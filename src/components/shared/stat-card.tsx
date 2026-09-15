"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  accentColor?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accentColor = "var(--primary)",
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card className="relative gap-2 overflow-hidden p-4 transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/5">
        {/* Subtle gradient overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, transparent 60%)`,
          }}
        />

        <div className="relative flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: `color-mix(in oklch, ${accentColor} 15%, transparent)`,
            }}
          >
            <Icon
              className="h-4 w-4"
              strokeWidth={2}
              style={{ color: accentColor }}
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
        </div>

        <p className="relative tabular text-2xl font-bold tracking-tight text-foreground">
          {value}
        </p>
        {hint && (
          <p className="relative text-xs text-muted-foreground">{hint}</p>
        )}
      </Card>
    </motion.div>
  );
}
