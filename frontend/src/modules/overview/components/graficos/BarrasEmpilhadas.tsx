import { Bar, BarChart, Legend, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";

import { formatNumber } from "@/core/i18n/format";
import { eixo, tooltip } from "./estilo";
import { AreaDoGrafico } from "./GraficoCard";

const ALTURA_DA_BARRA = 40;

export interface SerieEmpilhada<T> {
  chave: keyof T & string;
  nome: string;
  cor: string;
}

/**
 * Andamento por time ou setor (spec 064, RN-02 e RN-08): To-Do, em andamento e Done empilhados, nas cores dos
 * status do Board (ADR 0041). Os tokens `-icon` são os que o tema escuro clareia. Com `series`, empilha outras
 * contagens, como as correções por dev (spec 076).
 */
export function BarrasEmpilhadas<T extends { nome: string }>({ titulo, dados, series }: {
  titulo: string;
  dados: T[];
  /** Sem séries, são as três etapas do andamento (`Andamento`). */
  series?: SerieEmpilhada<T>[];
}) {
  const { t } = useTranslation();
  const barras: { chave: string; nome: string; cor: string }[] = series ?? [
    { chave: "aFazer", nome: t("toDo"), cor: "var(--status-todo-icon)" },
    { chave: "emAndamento", nome: t("inProgress"), cor: "var(--status-progress-icon)" },
    { chave: "concluidos", nome: t("completed"), cor: "var(--status-done-icon)" },
  ];
  return (
    <AreaDoGrafico altura={Math.max(dados.length, 2) * ALTURA_DA_BARRA + 32}>
      <BarChart data={dados} layout="vertical" accessibilityLayer title={titulo} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey="nome" {...eixo} width={120} />
        <Tooltip {...tooltip} formatter={(valor) => formatNumber(Number(valor))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {barras.map((serie, indice) => (
          <Bar key={serie.chave} dataKey={serie.chave} name={serie.nome} stackId="etapas" fill={serie.cor} barSize={18} radius={indice === barras.length - 1 ? [0, 8, 8, 0] : undefined} />
        ))}
      </BarChart>
    </AreaDoGrafico>
  );
}
