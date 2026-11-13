import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { useResumoExecucoes } from "../../hooks/useProjetos";
import type { CasoHistorico } from "../../model/projeto";
import { formatarDia } from "./formatar-dia";
import { ResultadoExecucaoModal } from "./ResultadoExecucaoModal";
import { ResumoExecucoesDrawer } from "./ResumoExecucoesDrawer";

vi.mock("../../hooks/useProjetos", () => ({ useResumoExecucoes: vi.fn() }));

const caso: CasoHistorico = { caso_teste_id: "c1", tc_id: "Clock_001", responsavel_id: "u1", responsavel_identificador: null, backup_id: null, rodada_pendente_id: null, ultimo_sdf_por_modelo: {}, resultados: {} };

describe("ResumoExecucoesDrawer", () => {
  it("erro na consulta mostra tentar de novo; sem ID de tester, o marcador vazio", async () => {
    const refetch = vi.fn();
    vi.mocked(useResumoExecucoes).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch } as never);
    render(<ResumoExecucoesDrawer caso={caso} perfil={{} as PerfilAtual} onFechar={vi.fn()} onAbrirResultado={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load results.");
    expect(screen.getByText("Tester ID:").nextSibling).toHaveTextContent("—");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("caso sem execução mostra a mensagem em vez da grade", async () => {
    vi.mocked(useResumoExecucoes).mockReturnValue({ data: { caso_teste_id: "c1", tc_id: "Clock_001", responsavel_identificador: "ANA-001", modelos: [], datas: [], resultados: {} }, isLoading: false, isError: false } as never);
    render(<ResumoExecucoesDrawer caso={caso} perfil={{} as PerfilAtual} onFechar={vi.fn()} onAbrirResultado={vi.fn()} />);

    expect(await screen.findByText("This Test Case has no runs yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("ResumoExecucoesDrawer, grade", () => {
  it("uma data por linha, da mais nova para a mais antiga, e um device por coluna", async () => {
    const exec = (id: string, resultado: string) => ({ execucao_id: id, resultado, sdf_id: `SDF-${id}`, origem: "SDF" });
    vi.mocked(useResumoExecucoes).mockReturnValue({ data: {
      caso_teste_id: "c1", tc_id: "Clock_001", responsavel_identificador: "ANA-001",
      modelos: [{ id: "s26", nome: "S26 Ultra" }, { id: "s25", nome: "S25 Ultra" }],
      datas: ["2026-10-01", "2026-10-02", "2026-10-03"],
      resultados: { "2026-10-03": { s26: [exec("e3", "FAIL")] }, "2026-10-01": { s25: [exec("e1", "PASS")] } },
    }, isLoading: false, isError: false } as never);
    render(<ResumoExecucoesDrawer caso={caso} perfil={{} as PerfilAtual} onFechar={vi.fn()} onAbrirResultado={vi.fn()} />);

    expect((await screen.findAllByRole("columnheader")).map((cabecalho) => cabecalho.textContent)).toEqual(["Date", "S26 Ultra", "S25 Ultra"]);
    const dias = screen.getAllByRole("rowheader").map((cabecalho) => cabecalho.textContent);
    expect(dias).toEqual([formatarDia("2026-10-03"), formatarDia("2026-10-02"), formatarDia("2026-10-01")]);
    expect(screen.getByRole("button", { name: `FAIL on S26 Ultra, ${formatarDia("2026-10-03")}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `PASS on S25 Ultra, ${formatarDia("2026-10-01")}` })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: `No run on S26 Ultra, ${formatarDia("2026-10-02")}` })).toBeInTheDocument();
  });
});

describe("ResultadoExecucaoModal", () => {
  it("mostra o SDF ID e a origem importada e fecha com Esc", async () => {
    const onFechar = vi.fn();
    render(<ResultadoExecucaoModal onFechar={onFechar} resultado={{ tcId: "Clock_001", device: "SM-S26", dia: "2026-10-10", resultado: { execucao_id: "e1", resultado: "PASS", sdf_id: "SDF-77", origem: "SDF" } }} />);

    expect(await screen.findByText("SDF-77")).toBeInTheDocument();
    expect(screen.getByText("Imported from the spreadsheet")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(onFechar).toHaveBeenCalled());
  });
});
