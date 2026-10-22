import { useState } from "react";

import type { TeamPerformancePoint } from "../model/overview";

const WIDTH = 941;
const HEIGHT = 90;
const PADDING_Y = 12;

function buildPath(points: TeamPerformancePoint[], max: number, stepX: number) {
  return points
    .map((p, i) => {
      const x = i * stepX;
      const y = PADDING_Y + (HEIGHT - 2 * PADDING_Y) * (1 - p.value / max);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

export function TeamPerformanceChart({
  points,
  currentPct,
}: {
  points: TeamPerformancePoint[];
  currentPct: number;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const max = Math.max(...points.map((p) => p.value));
  const stepX = WIDTH / (points.length - 1);
  const path = buildPath(points, max, stepX);
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">My Team Performance</h2>
        <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground shadow-sm">
          {hovered ? `${hovered.value}%` : `${currentPct}%`}
        </span>
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="overflow-visible"
        role="img"
        aria-label="Gráfico de linha com a performance mensal do time"
      >
        <path
          d={path}
          fill="none"
          stroke="#5588F5"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 6px 18px rgba(7, 58, 188, 0.45))" }}
        />
        {points.map((p, i) => {
          const x = i * stepX;
          const y = PADDING_Y + (HEIGHT - 2 * PADDING_Y) * (1 - p.value / max);
          return (
            <g key={p.month}>
              <rect
                x={x - stepX / 2}
                y={0}
                width={stepX}
                height={HEIGHT}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
                className="cursor-crosshair"
              />
              {hoverIndex === i && (
                <>
                  <line x1={x} y1={0} x2={x} y2={HEIGHT} stroke="#ECEFF2" strokeWidth={1} />
                  <circle cx={x} cy={y} r={5} fill="#FFFFFF" stroke="#3C77F8" strokeWidth={2} />
                </>
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
        {points.map((p, i) => (
          <span key={p.month} className={hoverIndex === i ? "font-medium" : undefined}>
            {p.month}
          </span>
        ))}
      </div>
    </div>
  );
}
