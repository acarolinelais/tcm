import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { KanbanCard as Card } from "../../model/projeto";
import { KanbanCard } from "./KanbanCard";

const base: Card = {
  id: "c1", tc_id: "Clock_000001", category: "A", difficulty: "High", situation: "New",
  responsavel_id: "u1", responsavel_nome: "Caroline Lais", responsavel_cor_avatar: "roxo", destinos: ["InProgress"],
};

function renderCard(card: Partial<Card> = {}) {
  render(<KanbanCard card={{ ...base, ...card }} onMover={vi.fn()} onArrastar={vi.fn()} />);
}

const corDaEtiqueta = (texto: string) => screen.getByText(texto).closest("span[style]")?.getAttribute("style") ?? "";

describe("KanbanCard", () => {
  it("mostra TC ID, etiquetas, responsável, o menu de três pontos e a alça de arrastar", () => {
    renderCard();

    expect(screen.getByRole("article", { name: "Clock_000001" })).toHaveTextContent("Clock_000001");
    expect(screen.getByText("Caroline Lais")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move Clock_000001 to" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Drag Clock_000001" })).toBeInTheDocument();
  });

  it("pinta a dificuldade e a TC Situation com a cor de cada valor, e o resto fica neutro", () => {
    renderCard({ difficulty: "High", situation: "New" });

    expect(corDaEtiqueta("High")).toContain("--etiqueta-fixes-bg");
    expect(corDaEtiqueta("New")).toContain("--etiqueta-todo-bg");
    expect(corDaEtiqueta("A")).toContain("--etiqueta-neutro-bg");
  });

  it("Medium usa o tom de progresso e Low o neutro", () => {
    renderCard({ difficulty: "Medium", situation: "Without Changes" });

    expect(corDaEtiqueta("Medium")).toContain("--etiqueta-progress-bg");
    expect(corDaEtiqueta("Without Changes")).toContain("--etiqueta-neutro-bg");
  });

  it("sem destinos permitidos, não mostra menu nem alça (falha)", () => {
    renderCard({ destinos: [] });

    expect(screen.getByRole("article", { name: "Clock_000001" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Move Clock_000001 to" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Drag Clock_000001" })).not.toBeInTheDocument();
  });
});
