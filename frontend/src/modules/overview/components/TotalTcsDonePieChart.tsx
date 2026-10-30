import { useState } from "react";

import type { OverviewData } from "../model/overview";
import { useTranslation } from "react-i18next";

const SIZE = 140;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Segment {
  key: string;
  label: string;
  pct: number;
  color: string;
}

export function TotalTcsDonePieChart({ dados }: { dados: OverviewData }) {
  const [hover, setHover] = useState<string | null>(null);
  const { t } = useTranslation();
  // A tela só desenha o gráfico com casos. O restante fecha 100% sem buraco de arredondamento, mas
  // não fica negativo quando as duas primeiras fatias arredondam para cima (ex.: 3 e 5 de 8).
  const completedPct = Math.round((dados.concluidos / dados.total) * 100);
  const todoPct = Math.round((dados.aFazer / dados.total) * 100);

  const segments: Segment[] = [
    { key: "completed", label: t("completed"), pct: completedPct, color: "var(--chart-1)" },
    { key: "todo", label: t("toDo"), pct: todoPct, color: "var(--chart-2)" },
    { key: "inProgress", label: t("inProgress"), pct: Math.max(0, 100 - completedPct - todoPct), color: "var(--chart-3)" },
  ];

  let acc = 0;
  const arcs = segments.map((s) => {
    const length = (s.pct / 100) * CIRCUMFERENCE;
    const offset = -(acc / 100) * CIRCUMFERENCE;
    acc += s.pct;
    return { ...s, strokeDasharray: `${length} ${CIRCUMFERENCE}`, strokeDashoffset: offset };
  });

  const centerPct = hover ? segments.find((s) => s.key === hover)?.pct : completedPct;

  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-5">
      <h2 className="self-start text-sm font-semibold text-foreground">{t("totalTcsDone")}</h2>
      <div className="relative h-[140px] w-[140px]">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90"
          role="img"
          aria-label={t("doughnutChartLabel")}
        >
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" className="stroke-separator" strokeWidth={STROKE} />
          {arcs.map((s) => (
            <circle
              key={s.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              style={{ stroke: s.color }}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={s.strokeDasharray}
              strokeDashoffset={s.strokeDashoffset}
              opacity={hover && hover !== s.key ? 0.45 : 1}
              className="cursor-pointer transition-opacity"
              onMouseEnter={() => setHover(s.key)}
              onMouseLeave={() => setHover(null)}
            >
              <title>
                {s.label}: {s.pct}%
              </title>
            </circle>
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-base font-medium text-foreground">
          {centerPct}%
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
