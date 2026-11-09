import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import { ALTURA, eixo, grade, tooltip, type Barra } from "./estilo";
import { AreaDoGrafico } from "./GraficoCard";

interface Forma {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/** Haste fina com um ponto na ponta, no lugar da barra. */
function Pirulito({ x = 0, y = 0, width = 0, height = 0 }: Forma) {
  const centro = x + width / 2;
  return <g>
    <rect x={centro - 1} y={y} width={2} height={height} fill="var(--chart-1)" />
    <circle cx={centro} cy={y} r={6} fill="var(--chart-1)" stroke="var(--surface)" strokeWidth={2} />
  </g>;
}

/** Finalizados e entregas por semana (spec 063, RN-11 e RN-16). */
export function LollipopChart({ titulo, dados, formatarNome = String }: {
  titulo: string;
  dados: Barra[];
  formatarNome?: (nome: string) => string;
}) {
  return (
    <AreaDoGrafico altura={ALTURA}>
      <BarChart data={dados} accessibilityLayer title={titulo} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid {...grade} />
        <XAxis dataKey="nome" {...eixo} tickFormatter={formatarNome} minTickGap={8} />
        <YAxis {...eixo} allowDecimals={false} />
        <Tooltip {...tooltip} labelFormatter={(nome) => formatarNome(String(nome))} />
        <Bar dataKey="valor" shape={Pirulito} />
      </BarChart>
    </AreaDoGrafico>
  );
}
