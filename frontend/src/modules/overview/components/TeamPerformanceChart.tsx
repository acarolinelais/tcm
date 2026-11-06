import { useState } from "react";

import type { PontoDesempenho } from "../model/overview";
import { useTranslation } from "react-i18next";
import { formatDate, formatNumber } from "@/core/i18n/format";

const WIDTH = 941;
const HEIGHT = 90;
const PADDING_Y = 12;
const sombraDaLinha = { filter: "drop-shadow(0 6px 18px color-mix(in oklab, var(--chart-1) 45%, transparent))" };

function buildPath(points: PontoDesempenho[], max: number, stepX: number) {
  return points
    .map((p, i) => {
      const x = i * stepX;
      const y = PADDING_Y + (HEIGHT - 2 * PADDING_Y) * (1 - p.concluidos / max);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

export function TeamPerformanceChart({ points }: { points: PontoDesempenho[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const { t } = useTranslation();

  // Pelo menos 1: com todos os meses zerados a linha fica no chão em vez de virar NaN.
  const max = Math.max(1, ...points.map((p) => p.concluidos));
  const stepX = WIDTH / (points.length - 1);
  const path = buildPath(points, max, stepX);
  const shown = points[hoverIndex ?? points.length - 1];

  return (
    <div className="rounded-3xl border border-edge bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{t("teamPerformance")}</h2>
        <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground shadow-sm">
          {`${formatNumber(shown.concluidos)} ${t("testCases")}`}
        </span>
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="overflow-visible"
        role="img"
        aria-label={t("lineChartLabel")}
      >
        <path
          d={path}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-chart-1"
          style={sombraDaLinha}
        />
        {points.map((p, i) => {
          const x = i * stepX;
          const y = PADDING_Y + (HEIGHT - 2 * PADDING_Y) * (1 - p.concluidos / max);
          return (
            <g key={p.mes}>
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
                  <line x1={x} y1={0} x2={x} y2={HEIGHT} className="stroke-separator" strokeWidth={1} />
                  <circle cx={x} cy={y} r={5} className="fill-surface stroke-chart-1" strokeWidth={2} />
                </>
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
        {points.map((p, i) => (
          <span key={p.mes} className={hoverIndex === i ? "font-medium" : undefined}>
            {formatDate(new Date(Number(p.mes.slice(0, 4)), Number(p.mes.slice(5, 7)) - 1, 1), { month: "short" })}
          </span>
        ))}
      </div>
    </div>
  );
}
