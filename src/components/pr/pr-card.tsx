import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";

interface PrCardProps {
  exerciseName: string;
  weight: number;
  reps: number;
  date: string;
}

export function PrCard({ exerciseName, weight, reps, date }: PrCardProps) {
  return (
    <Card className="flex-row items-center gap-3 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
        <Trophy className="h-5 w-5" strokeWidth={2} />
      </div>
      <div className="flex-1">
        <p className="font-medium text-foreground">{exerciseName}</p>
        <p className="tabular text-sm text-muted-foreground">
          {weight} kg × {reps} reps
        </p>
      </div>
      <p className="text-xs text-muted-foreground">{date}</p>
    </Card>
  );
}
