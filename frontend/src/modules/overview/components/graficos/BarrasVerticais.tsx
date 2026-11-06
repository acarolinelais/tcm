import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import { formatNumber } from "@/core/i18n/format";
import { ALTURA, eixo, grade, tooltip, type Barra } from "./estilo";
import { AreaDoGrafico } from "./GraficoCard";

/** Uma coluna por item (criação e Done por projeto, dificuldade, entregas por dia). */
export function BarrasVerticais({ titulo, dados, formatar = (valor) => formatNumber(valor), formatarNome = String, maximo }: {
  titulo: string;
  dados: Barra[];
  formatar?: (valor: number) => string;
  formatarNome?: (nome: string) => string;
  maximo?: number;
}) {
  return (
    <AreaDoGrafico altura={ALTURA}>
      <BarChart data={dados} accessibilityLayer title={titulo} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid {...grade} />
        <XAxis dataKey="nome" {...eixo} tickFormatter={formatarNome} minTickGap={8} />
        <YAxis {...eixo} allowDecimals={false} domain={[0, maximo ?? "auto"]} tickFormatter={(valor: number) => formatar(valor)} />
        <Tooltip {...tooltip} labelFormatter={(nome) => formatarNome(String(nome))} formatter={(valor) => formatar(Number(valor))} />
        <Bar dataKey="valor" fill="var(--chart-1)" radius={[8, 8, 0, 0]} maxBarSize={40} />
      </BarChart>
    </AreaDoGrafico>
  );
}
