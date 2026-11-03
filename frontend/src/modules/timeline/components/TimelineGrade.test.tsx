import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CardTimeline } from "../model/timeline";
import { periodoDe } from "../utils/periodo";
import { TimelineGrade } from "./TimelineGrade";

const card = (dia: string, tc_id = "Clock_00046", primeira_em = `${dia}T15:00:00`): CardTimeline => ({
  caso_teste_id: tc_id, tc_id, responsavel_id: "ana", responsavel_nome: "Ana", responsavel_cor_avatar: "roxo", dia,
  primeira_em: new Date(primeira_em).toISOString(),
  alteracoes: [{ campo: "status", valor_anterior: "A", valor_novo: "B", usuario_nome: "Ana", usuario_perfil: null, origem: "api", alterado_em: "2026-12-29T15:00:00Z" }],
});

// Quarta, 30 de dezembro de 2026, 12h.
const agora = new Date(2026, 11, 30, 12);
const semanaAtual = periodoDe("semana", agora);

function montar(props: Partial<Parameters<typeof TimelineGrade>[0]> = {}) {
  return render(<TimelineGrade visao="semana" periodo={semanaAtual} cards={[]} onAbrir={vi.fn()} vazio={<p>Nada aqui</p>} agora={agora} {...props} />);
}

describe("TimelineGrade", () => {
  it("põe o card na coluna do seu dia", () => {
    montar({ cards: [card("2026-12-29"), card("2027-01-02", "Clock_00001")] });

    const terca = screen.getByRole("list", { name: "Tuesday, December 29" });
    expect(within(terca).getByRole("button", { name: /Clock_00046/ })).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Saturday, January 2" })).getByRole("button", { name: /Clock_00001/ })).toBeInTheDocument();
    expect(screen.getAllByRole("list")).toHaveLength(7);
    expect(screen.queryByText("Nada aqui")).not.toBeInTheDocument();
  });

  it("na visão Dia põe o card na hora da primeira mudança, e no Mês usa o card compacto", () => {
    const { unmount } = montar({ visao: "dia", periodo: periodoDe("dia", new Date(2026, 11, 29)), cards: [card("2026-12-29", "Clock_00046", "2026-12-29T09:20:00")] });
    expect(screen.getAllByRole("list")).toHaveLength(24);
    expect(within(screen.getByRole("list", { name: "09:00 AM" })).getByRole("button")).toBeInTheDocument();
    unmount();

    montar({ visao: "mes", periodo: periodoDe("mes", agora), cards: [card("2026-12-29")] });
    expect(screen.getAllByRole("list")).toHaveLength(31);
    expect(screen.getByRole("button", { name: /Clock_00046/ })).not.toHaveTextContent("Clock_00046");
  });

  it("mostra a linha de agora só no período atual", () => {
    const { unmount } = montar();
    expect(screen.getByTestId("linha-agora")).toBeInTheDocument();
    unmount();

    montar({ periodo: periodoDe("semana", new Date(2026, 11, 21)) });
    expect(screen.queryByTestId("linha-agora")).not.toBeInTheDocument();
  });

  it("o dia de hoje fica em azul e sublinhado, e os outros dias não (spec 057, CA-06)", () => {
    montar();

    const hoje = screen.getByText("30").parentElement as HTMLElement;
    expect(hoje).toHaveClass("text-accent-text", "after:bg-accent");
    const outro = screen.getByText("29").parentElement as HTMLElement;
    expect(outro).not.toHaveClass("text-accent-text");
    expect(outro).not.toHaveClass("after:bg-accent");
    // A linha do agora começa logo abaixo do cabeçalho de alturas fixas (2rem do mês + 2.25rem dos dias).
    expect(screen.getByTestId("linha-agora")).toHaveClass("top-[4.25rem]");
  });

  it("o mês do começo do período é cor de texto e o que começa no meio dele é cinza (spec 057, CA-07)", () => {
    montar();

    expect(screen.getByText("December 2026")).toHaveClass("text-body");
    const novo = screen.getByText("January 2027");
    expect(novo).toHaveClass("text-subtle");
    // O mês novo fica na coluna do dia 1º (5ª coluna de segunda a domingo).
    expect(novo).toHaveStyle({ gridColumn: "5" });
  });

  it("tem o fundo quadriculado decorativo, que some no tema escuro (spec 057, CA-08)", () => {
    montar({ cards: [card("2026-12-29")] });

    const fundo = screen.getByTestId("fundo-grade");
    expect(fundo).toHaveAttribute("aria-hidden", "true");
    expect(fundo).toHaveClass("pointer-events-none", "dark:bg-none");
    expect(fundo.getAttribute("style")).toContain("background-timeline");
    // O fundo não tira os cards da árvore de acessibilidade.
    expect(screen.getByRole("button", { name: /Clock_00046/ })).toBeInTheDocument();
  });

  it("falha: um período dentro de um mês só mostra um nome de mês", () => {
    montar({ periodo: periodoDe("semana", new Date(2026, 11, 14)) });

    expect(screen.getByText("December 2026")).toBeInTheDocument();
    expect(screen.queryByText(/2027/)).not.toBeInTheDocument();
  });

  it("sem card no período mostra o aviso de vazio", () => {
    montar({ cards: [card("2026-12-10")] });

    expect(screen.getByText("Nada aqui")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
