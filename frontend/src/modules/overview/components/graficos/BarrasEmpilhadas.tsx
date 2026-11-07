import { Bar, BarChart, Legend, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";

import { formatNumber } from "@/core/i18n/format";
import type { Andamento } from "../../model/overview";
import { eixo, tooltip } from "./estilo";
import { AreaDoGrafico } from "./GraficoCard";

const ALTURA_DA_BARRA = 40;

/**
 * Andamento por time ou setor (spec 064, RN-02 e RN-08): To-Do, em andamento e Done empilhados, nas cores dos
 * status do Board (ADR 0041). Os tokens `-icon` são os que o tema escuro clareia.
 */
export function BarrasEmpilhadas({ titulo, dados }: { titulo: string; dados: Andamento[] }) {
  const { t } = useTranslation();
  return (
    <AreaDoGrafico altura={Math.max(dados.length, 2) * ALTURA_DA_BARRA + 32}>
      <BarChart data={dados} layout="vertical" accessibilityLayer title={titulo} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey="nome" {...eixo} width={120} />
        <Tooltip {...tooltip} formatter={(valor) => formatNumber(Number(valor))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="aFazer" name={t("toDo")} stackId="etapas" fill="var(--status-todo-icon)" barSize={18} />
        <Bar dataKey="emAndamento" name={t("inProgress")} stackId="etapas" fill="var(--status-progress-icon)" barSize={18} />
        <Bar dataKey="concluidos" name={t("completed")} stackId="etapas" fill="var(--status-done-icon)" barSize={18} radius={[0, 8, 8, 0]} />
      </BarChart>
    </AreaDoGrafico>
  );
}
