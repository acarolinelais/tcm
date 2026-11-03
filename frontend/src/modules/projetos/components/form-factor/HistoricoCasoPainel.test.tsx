import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { useResumoExecucoes } from "../../hooks/useProjetos";
import { HistoricoCasoPainel } from "./HistoricoCasoPainel";

vi.mock("../../hooks/useProjetos", () => ({ useResumoExecucoes: vi.fn() }));

const caso = { caso_teste_id: "c1", tc_id: "Clock_001", responsavel_identificador: "ANA-001" };
const execucao = { execucao_id: "e1", resultado: "PASS", sdf_id: "SDF-77", origem: "SDF" };
const resumo = {
  caso_teste_id: "c1", tc_id: "Clock_001", responsavel_identificador: "ANA-001",
  modelos: [{ id: "m1", nome: "SM-S26" }], datas: ["2026-10-10"], resultados: { "2026-10-10": { m1: [execucao] } },
};

describe("HistoricoCasoPainel", () => {
  it("abre a grade de modelos por datas do caso e, ao abrir um resultado, mostra o detalhe", async () => {
    vi.mocked(useResumoExecucoes).mockReturnValue({ data: resumo, isPending: false, isError: false } as never);
    render(<HistoricoCasoPainel caso={caso} perfil={{} as PerfilAtual} onFechar={vi.fn()} />);

    expect(await screen.findByRole("table", { name: /Clock_001/ })).toBeInTheDocument();
    expect(screen.getByText("SM-S26")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /SM-S26/ }));
    expect(await screen.findByText("SDF-77")).toBeInTheDocument();
  });

  it("falha: a consulta com erro mostra a mensagem e o botão de tentar de novo", async () => {
    const refetch = vi.fn();
    vi.mocked(useResumoExecucoes).mockReturnValue({ data: undefined, isPending: false, isError: true, refetch } as never);
    render(<HistoricoCasoPainel caso={caso} perfil={{} as PerfilAtual} onFechar={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load results.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("sem caso escolhido, não mostra painel nem detalhe", () => {
    vi.mocked(useResumoExecucoes).mockReturnValue({ data: undefined, isPending: true, isError: false } as never);
    render(<HistoricoCasoPainel caso={null} perfil={{} as PerfilAtual} onFechar={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
