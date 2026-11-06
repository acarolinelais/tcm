import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatNumber } from "@/core/i18n/format";
import { eixo, tooltip, type Barra } from "./estilo";

const ALTURA_DA_BARRA = 36;

/** Uma barra por item, com o valor na ponta (Pass Rate por modelo, finalizados por dev). */
export function BarrasHorizontais({ titulo, dados, formatar = (valor) => formatNumber(valor), maximo }: {
  titulo: string;
  dados: Barra[];
  formatar?: (valor: number) => string;
  /** Fim do eixo; sem ele, o maior valor. */
  maximo?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(dados.length, 2) * ALTURA_DA_BARRA}>
      <BarChart data={dados} layout="vertical" accessibilityLayer title={titulo} margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
        <XAxis type="number" hide domain={[0, maximo ?? "dataMax"]} />
        <YAxis type="category" dataKey="nome" {...eixo} width={120} />
        <Tooltip {...tooltip} formatter={(valor) => formatar(Number(valor))} />
        <Bar dataKey="valor" fill="var(--chart-1)" radius={[0, 8, 8, 0]} barSize={18} background={{ fill: "var(--surface-secondary)", radius: 8 }}>
          <LabelList dataKey="valor" position="right" formatter={(valor) => formatar(Number(valor))} fill="var(--foreground)" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
