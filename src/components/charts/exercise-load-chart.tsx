"use client";

import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Point {
  /** "dd/mm" */
  date: string;
  weight: number;
}

function formatKg(n: number) {
  return `${n.toLocaleString("pt-BR")} kg`;
}

/**
 * Maior carga de cada treino de um exercício. Linha reta entre os treinos (sem suavizar,
 * para não inventar valores entre eles), um ponto por treino e só o último valor rotulado.
 */
export function ExerciseLoadChart({ data, summary }: { data: Point[]; summary: string }) {
  const last = data.length - 1;
  // Até 6 treinos cabem todas as datas no eixo; acima disso o Recharts escolhe as que não colidem
  const showAllTicks = data.length <= 6;

  return (
    <figure className="m-0">
      <div className="h-52 w-full" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 28, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              interval={showAllTicks ? 0 : "preserveStartEnd"}
              tickMargin={8}
              padding={{ left: 12, right: 12 }}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              tickCount={4}
              allowDecimals={false}
              domain={[0, "auto"]}
              tickFormatter={(v: number) => `${v}`}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              label={{
                value: "kg",
                position: "insideTopLeft",
                offset: -22,
                fill: "var(--muted-foreground)",
                fontSize: 12,
              }}
            />
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "3 3" }}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 13,
                color: "var(--popover-foreground)",
              }}
              labelStyle={{ color: "var(--muted-foreground)" }}
              formatter={(value) => [formatKg(Number(value)), "Carga máxima"]}
            />
            <Line
              type="linear"
              dataKey="weight"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="weight"
                content={({ x, y, value, index }) =>
                  index === last ? (
                    <text
                      x={Number(x)}
                      y={Number(y) - 12}
                      textAnchor="end"
                      fill="var(--foreground)"
                      fontSize={13}
                      fontWeight={700}
                    >
                      {formatKg(Number(value))}
                    </text>
                  ) : null
                }
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}
