import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/core/i18n";
import { baixarPlanilha, montarPlanilha } from "@/shared/lib/exportar-planilha";

import { casosTesteApi } from "../../api/projetos.api";
import type { CorrecaoConcluida } from "../../model/projeto";
import { CorrecoesConcluidas } from "./CorrecoesConcluidas";

vi.mock("../../api/projetos.api", () => ({ casosTesteApi: { listarCorrecoesConcluidas: vi.fn() } }));
vi.mock("@/shared/lib/exportar-planilha");

const correcao: CorrecaoConcluida = {
  id: "c-1", caso_teste_id: "caso-1", tc_id: "Clock_007", tentativa: 2, origem: "regressao", corretor_id: "ana", corretor_identificador: "ana.s",
  falha_em: "2026-11-10T18:00:00Z", em_revisao_em: "2026-11-12T15:00:00Z", fechada_em: "2026-11-14T09:00:00Z", resultado: "corrigida", dias_ate_corrigir: 4,
};

function renderTabela(opcoesCorretor?: { value: string; label: string }[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><CorrecoesConcluidas projetoId="clock" opcoesCorretor={opcoesCorretor} /></QueryClientProvider>);
}

describe("CorrecoesConcluidas (spec 076)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
    vi.mocked(casosTesteApi.listarCorrecoesConcluidas).mockResolvedValue({ items: [correcao], page: 1, page_size: 20, total_count: 1 });
  });

  it("mostra a tentativa com selo, a origem, o resultado e os dias (CA-10)", async () => {
    renderTabela();

    const [linha] = await screen.findAllByRole("row", { name: /Clock_007/ });
    expect(within(linha).getByText("Fix 2")).toBeInTheDocument();
    expect(within(linha).getByText("ana.s")).toBeInTheDocument();
    expect(within(linha).getByText("Regression")).toBeInTheDocument();
    expect(within(linha).getByText("Fixed")).toBeInTheDocument();
    expect(within(linha).getByText("4")).toBeInTheDocument();
    for (const coluna of ["Fixer", "Origin", "Failed on", "End date", "Closed on", "Result", "Days to fix"]) {
      expect(screen.getByRole("columnheader", { name: new RegExp(coluna) })).toBeInTheDocument();
    }
  });

  it("a gestão filtra pelo corretor e pelo resultado (CA-12)", async () => {
    const user = userEvent.setup();
    renderTabela([{ value: "ana", label: "ana.s" }, { value: "bia", label: "bia.c" }]);
    await screen.findAllByRole("row", { name: /Clock_007/ });

    await user.click(screen.getByRole("button", { name: "Filter by Fixer" }));
    await user.click(await screen.findByRole("option", { name: "bia.c" }));
    await user.click(screen.getByRole("button", { name: "Filter by Result" }));
    await user.click(await screen.findByRole("option", { name: "Failed again" }));

    await waitFor(() => expect(casosTesteApi.listarCorrecoesConcluidas).toHaveBeenLastCalledWith("clock", 1, 20, { corretor_id: "bia", resultado: "falhou_de_novo" }));
  });

  it("falha: para o dev não há filtro de corretor, só as dele (CA-11)", async () => {
    renderTabela();
    await screen.findAllByRole("row", { name: /Clock_007/ });

    expect(screen.queryByRole("button", { name: "Filter by Fixer" })).not.toBeInTheDocument();
  });

  it("falha: sem tentativas fechadas, explica quando elas aparecem", async () => {
    vi.mocked(casosTesteApi.listarCorrecoesConcluidas).mockResolvedValue({ items: [], page: 1, page_size: 20, total_count: 0 });
    renderTabela();

    expect(await screen.findByText("No completed fixes")).toBeInTheDocument();
    expect(screen.getByText("A fix shows up here when it passes on every device or fails again.")).toBeInTheDocument();
  });

  it("exporta as linhas da página com as datas e o resultado como a tela mostra (CA-12)", async () => {
    const user = userEvent.setup();
    renderTabela();
    await screen.findAllByRole("row", { name: /Clock_007/ });

    await user.click(screen.getByRole("button", { name: /Export/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Current page" }));

    await waitFor(() => expect(baixarPlanilha).toHaveBeenCalled());
    const [colunas, linhas] = vi.mocked(montarPlanilha).mock.calls[0] as [{ titulo: string; valor: (c: CorrecaoConcluida) => unknown }[], CorrecaoConcluida[]];
    expect(linhas.map((linha) => linha.tc_id)).toEqual(["Clock_007"]);
    expect(colunas.find((coluna) => coluna.titulo === "Result")?.valor(correcao)).toBe("Fixed");
  });
});
