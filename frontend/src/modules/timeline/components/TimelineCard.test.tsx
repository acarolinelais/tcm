import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { CardTimeline, PessoaTimeline } from "../model/timeline";
import { AlteracoesCardDrawer } from "./AlteracoesCardDrawer";
import { PilhaAvatares } from "./PilhaAvatares";
import { TimelineCard } from "./TimelineCard";

const alteracao = (campo: string, antes: string, depois: string, alterado_em: string) => ({
  campo, valor_anterior: antes, valor_novo: depois, usuario_nome: "Ana", usuario_perfil: "Key Person", origem: "api", alterado_em,
});

const cardDaAna: CardTimeline = {
  caso_teste_id: "c46", tc_id: "Clock_00046", responsavel_id: "ana", responsavel_nome: "Ana", responsavel_cor_avatar: "roxo",
  dia: "2026-12-28", primeira_em: "2026-12-28T13:00:00Z",
  alteracoes: [alteracao("category", "A", "B", "2026-12-28T15:00:00Z"), alteracao("status", "InProgress", "InReview", "2026-12-28T13:00:00Z")],
};

describe("TimelineCard", () => {
  it("mostra o caso, a pessoa e a quantidade de mudanças, e abre ao clicar", async () => {
    const onAbrir = vi.fn();
    render(<TimelineCard card={cardDaAna} onAbrir={onAbrir} />);

    const botao = screen.getByRole("button", { name: "Clock_00046, Ana, 2 changes" });
    expect(botao).toHaveTextContent("Ana · 2 changes");
    await userEvent.click(botao);
    expect(onAbrir).toHaveBeenCalledWith(cardDaAna);
  });

  it("compacto esconde os textos e mantém o nome acessível com o responsável", () => {
    render(<TimelineCard card={{ ...cardDaAna, alteracoes: cardDaAna.alteracoes.slice(0, 1) }} compacto onAbrir={vi.fn()} />);

    const botao = screen.getByRole("button", { name: "Clock_00046, Ana, 1 change" });
    expect(botao).not.toHaveTextContent("Clock_00046");
  });
});

describe("PilhaAvatares", () => {
  const pessoas: PessoaTimeline[] = ["Ana", "Bia", "Caio", "Dani", "Edu", "Fabi"].map((nome) => ({ id: nome, nome, cor_avatar: "azul" }));

  it("mostra cinco avatares e +1 com seis pessoas", () => {
    render(<PilhaAvatares pessoas={pessoas} />);

    const lista = screen.getByRole("list", { name: "People with changes in this period" });
    expect(lista.querySelectorAll("li")).toHaveLength(6);
    expect(screen.getByLabelText("Ana")).toBeInTheDocument();
    expect(screen.queryByLabelText("Fabi")).not.toBeInTheDocument();
    expect(screen.getByLabelText("1 more")).toHaveTextContent("+1");
  });

  it("sem ninguém no período não mostra a pilha", () => {
    const { container } = render(<PilhaAvatares pessoas={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("AlteracoesCardDrawer", () => {
  it("lista as mudanças do card e abre o Test Case", async () => {
    const onAbrirCaso = vi.fn();
    render(<AlteracoesCardDrawer card={cardDaAna} onFechar={vi.fn()} onAbrirCaso={onAbrirCaso} />);

    const itens = await screen.findAllByRole("listitem");
    expect(itens.map((item) => item.textContent)).toEqual([expect.stringContaining("CategoryA→changed toB"), expect.stringContaining("StatusIn Progress→changed toIn Review")]);
    await userEvent.click(screen.getByRole("button", { name: "Open Test Case" }));
    expect(onAbrirCaso).toHaveBeenCalledWith({ id: "c46", tc_id: "Clock_00046" });
  });
});
