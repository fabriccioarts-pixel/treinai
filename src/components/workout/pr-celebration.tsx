"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Trophy } from "lucide-react";

interface PrCelebrationProps {
  exerciseName: string;
  weight: number;
  reps: number;
  visible: boolean;
}

export function PrCelebration({ exerciseName, weight, reps, visible }: PrCelebrationProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-4 top-4 z-[60] mx-auto max-w-md rounded-2xl bg-gold/15 p-4 text-center ring-1 ring-gold/30 backdrop-blur"
        >
          <div className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-gold/20 text-gold">
            <Trophy className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-gold">NOVO PR!</p>
          <p className="text-sm text-foreground">{exerciseName}</p>
          <p className="tabular text-xs text-muted-foreground">
            {weight} kg × {reps} reps — novo melhor resultado
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
