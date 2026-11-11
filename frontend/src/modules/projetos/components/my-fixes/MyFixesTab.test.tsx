import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/core/i18n";

import { casosTesteApi } from "../../api/projetos.api";
import type { CasoComFalhas, FalhaSdf } from "../../model/projeto";
import { agruparPorTentativa } from "./agrupar-por-tentativa";
import { MyFixesTab } from "./MyFixesTab";

vi.mock("../../api/projetos.api", () => ({ casosTesteApi: { listarMyFixes: vi.fn(), mudarStatusDaCorrecao: vi.fn() } }));

const falha = (data: string, tentativa: number | null, extra: Partial<FalhaSdf> = {}): FalhaSdf => ({
  modelo_dispositivo_id: "s26", modelo_nome: "S26 Ultra", sdf_id: "SDF-1", resultado: "FAIL", descricao: null, data_execucao: data, tentativa, ...extra,
});
const caso: CasoComFalhas = {
  caso_teste_id: "caso-1", tc_id: "Clock_01", status: "InFixes", time_id: "time-1", responsavel_id: "caio", responsavel_identificador: "caio.r",
  backup_id: null, dev_fix_id: "ana", dev_fix_identificador: "ana.s", tentativa_correcao: 2, correcao_em_revisao_em: null,
  falhas: [falha("2026-11-10T09:00:00Z", 2, { resultado: "EXCEPTION" }), falha("2026-11-05T09:00:00Z", 1), falha("2026-10-30T09:00:00Z", null, { sdf_id: "SDF-0" })],
};

function renderTab() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MyFixesTab projetoId="clock" /></QueryClientProvider>);
}

describe("MyFixesTab (spec 073)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
    vi.mocked(casosTesteApi.listarMyFixes).mockResolvedValue({ items: [caso], page: 1, page_size: 20, total_count: 1 });
  });

  it("mostra as colunas, o selo da tentativa e muda o Status só pelos da correção (CA-03 e CA-09)", async () => {
    vi.mocked(casosTesteApi.mudarStatusDaCorrecao).mockResolvedValue({} as never);
    const user = userEvent.setup();
    renderTab();

    const [linha] = await screen.findAllByRole("row", { name: /Clock_01/ });
    expect(within(linha).getByText("Fix 2")).toBeInTheDocument();
    expect(within(linha).getByText("caio.r")).toBeInTheDocument();
    expect(within(linha).getByText("ana.s")).toBeInTheDocument();
    for (const coluna of ["Status", "Dev Owner", "Dev Fix", "Run date", "End date"]) expect(screen.getByRole("columnheader", { name: new RegExp(coluna) })).toBeInTheDocument();

    await user.click(within(linha).getByRole("button", { name: /Status Clock_01/ }));
    const opcoes = (await screen.findAllByRole("option")).map((opcao) => opcao.textContent);
    expect(opcoes).toEqual(["In Fixes", "In Progress", "In Review", "In Validation"]);
    await user.click(screen.getByRole("option", { name: "In Review" }));

    await waitFor(() => expect(casosTesteApi.mudarStatusDaCorrecao).toHaveBeenCalledWith("caso-1", "InReview"));
  });

  it("o TC ID abre o histórico de falhas agrupado por tentativa (CA-06)", async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(await screen.findByRole("button", { name: "Clock_01" }));

    const painel = await screen.findByRole("dialog");
    const grupos = within(painel).getAllByRole("region").map((grupo) => grupo.getAttribute("aria-label"));
    expect(grupos).toEqual(["Fix 2", "Fix 1"]);
    expect(within(within(painel).getByRole("region", { name: "Fix 1" })).getByText("SDF-0")).toBeInTheDocument();
  });

  it("falha: sem nada para corrigir mostra o estado vazio (CA-10)", async () => {
    vi.mocked(casosTesteApi.listarMyFixes).mockResolvedValue({ items: [], page: 1, page_size: 20, total_count: 0 });
    renderTab();

    expect(await screen.findByText("Nothing to fix")).toBeInTheDocument();
  });

  it("agrupa da tentativa mais nova para a mais antiga e conta as falhas antigas e as de antes da correção na 1", () => {
    const falhas = [...caso.falhas, falha("2026-10-20T09:00:00Z", 0)];
    expect(agruparPorTentativa(falhas).map(([tentativa, grupo]) => [tentativa, grupo.length])).toEqual([[2, 1], [1, 3]]);
  });
});
