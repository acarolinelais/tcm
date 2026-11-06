import { render } from "@testing-library/react";
import { expect, it } from "vitest";

import { BarrasHorizontais } from "./BarrasHorizontais";
import { BarrasVerticais } from "./BarrasVerticais";
import { BurndownChart } from "./BurndownChart";
import { DonutDone } from "./DonutDone";
import { diaCurto } from "./estilo";
import { LollipopChart } from "./LollipopChart";

// No jsdom o Recharts não mede o contêiner e desenha vazio (ADR 0051): aqui só se confere que cada gráfico monta.
// O desenho, o tooltip e o teclado ficam para o e2e.
it.each([
  ["burndown", <BurndownChart key="b" titulo="Burndown" pontos={[{ dia: "2026-11-05", planejado: 4, executado: 3 }]} />],
  ["barras horizontais", <BarrasHorizontais key="h" titulo="Pass Rate" dados={[{ nome: "S26", valor: 75 }]} maximo={100} />],
  ["barras verticais", <BarrasVerticais key="v" titulo="Criação" dados={[{ nome: "Clock", valor: 0.5 }]} />],
  ["lollipop", <LollipopChart key="l" titulo="Semana" dados={[{ nome: "2026-11-02", valor: 2 }]} />],
  ["donut", <DonutDone key="d" titulo="Done" concluidos={3} total={4} />],
])("o gráfico de %s monta sem erro", (_, grafico) => {
  expect(() => render(grafico)).not.toThrow();
});

it("o donut mostra a porcentagem de Done no centro, e 0% sem nada atribuído", () => {
  const { getByText, rerender } = render(<DonutDone titulo="Done" concluidos={3} total={4} />);
  expect(getByText("75%")).toBeInTheDocument();

  rerender(<DonutDone titulo="Done" concluidos={0} total={0} />);
  expect(getByText("0%")).toBeInTheDocument();
});

it("diaCurto formata o dia sem o fuso trocar a data", () => {
  expect(diaCurto("2026-11-05")).toBe("11/05");
});
