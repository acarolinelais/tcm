import { Cell, Pie, PieChart } from "recharts";
import { useTranslation } from "react-i18next";

import { formatNumber } from "@/core/i18n/format";
import { AreaDoGrafico } from "./GraficoCard";

/** Done contra o total atribuído, com a porcentagem no centro (dev, spec 063, RN-14). */
export function DonutDone({ titulo, concluidos, total }: { titulo: string; concluidos: number; total: number }) {
  const { t } = useTranslation();
  const fatias = [
    { nome: t("completed"), valor: concluidos },
    { nome: t("remaining"), valor: Math.max(total - concluidos, 0) },
  ];
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <AreaDoGrafico altura={180}>
        <PieChart accessibilityLayer title={titulo}>
          <Pie data={fatias} dataKey="valor" nameKey="nome" innerRadius={58} outerRadius={78} startAngle={90} endAngle={-270} stroke="none">
            <Cell fill="var(--chart-1)" />
            <Cell fill="var(--surface-secondary)" />
          </Pie>
        </PieChart>
      </AreaDoGrafico>
      <p aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-content-center text-center">
        <span className="text-2xl font-semibold text-foreground">{formatNumber(total ? concluidos / total : 0, { style: "percent" })}</span>
        <span className="text-xs text-muted">{t("doneOfTotal", { done: formatNumber(concluidos), total: formatNumber(total) })}</span>
      </p>
    </div>
  );
}
