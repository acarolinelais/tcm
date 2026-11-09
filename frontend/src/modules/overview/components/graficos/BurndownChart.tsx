import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";

import { ALTURA, diaCurto, eixo, grade, tooltip } from "./estilo";
import { AreaDoGrafico } from "./GraficoCard";

export interface PontoBurndown {
  dia: string;
  planejado: number;
  executado: number;
}

/** Planejado (tracejado) contra executado, por dia (spec 063, RN-07). */
export function BurndownChart({ titulo, pontos }: { titulo: string; pontos: PontoBurndown[] }) {
  const { t } = useTranslation();
  return (
    <AreaDoGrafico altura={ALTURA}>
      <LineChart data={pontos} accessibilityLayer title={titulo} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid {...grade} />
        <XAxis dataKey="dia" {...eixo} tickFormatter={diaCurto} minTickGap={24} />
        <YAxis {...eixo} allowDecimals={false} />
        <Tooltip {...tooltip} labelFormatter={(dia) => diaCurto(String(dia))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="planejado" name={t("burndownPlanned")} stroke="var(--chart-3)" strokeDasharray="6 4" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="executado" name={t("burndownExecuted")} stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
      </LineChart>
    </AreaDoGrafico>
  );
}
