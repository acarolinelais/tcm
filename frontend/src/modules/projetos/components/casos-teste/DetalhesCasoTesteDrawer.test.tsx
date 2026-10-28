import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/shared/api/problem-details";
import { casosTesteApi, type CasoTeste, type CasoTesteDetalhe } from "../../api/projetos.api";
import { DetalhesCasoTesteDrawer } from "./DetalhesCasoTesteDrawer";

vi.mock("../../api/projetos.api", () => ({
  projetosApi: {}, casosTesteApi: { obter: vi.fn() }, formFactorApi: {}, modelosDispositivoApi: {},
}));

const caso: CasoTeste = {
  id: "case-1", unidade_id: "unit-1", projeto_id: "project-1", tc_id: "Clock_000001", category: "A", difficulty: "High", automation_level: null,
  situation: "New", status: "To-Do", responsavel_id: "user-1", backup_id: "user-2", ativo: true, created_at: null, updated_at: null,
};
const detalhe: CasoTesteDetalhe = {
  ...caso,
  title: "Check Writing style recording and edit function in Writing assist",
  precondition: "1. Settings > General management > Samsung Keyboard Settings",
  procedure: "1. Messages > Compose New Message\n2-1. Select Spelling and grammar\n2-2. Select Shorten",
  expected_result: null,
};

const falharCom = (status: number) => vi.mocked(casosTesteApi.obter).mockImplementation(async () => {
  throw new ApiError({ type: "about:blank", title: "Erro", status });
});

function renderDrawer(onFechar = vi.fn()) {
  // `retryDelay: 0`: o hook decide quantas vezes repetir (nunca no 404), e o teste não espera o intervalo entre elas.
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  render(<QueryClientProvider client={client}><DetalhesCasoTesteDrawer caso={caso} onFechar={onFechar} /></QueryClientProvider>);
  return onFechar;
}

describe("DetalhesCasoTesteDrawer", () => {
  beforeEach(() => { vi.mocked(casosTesteApi.obter).mockReset(); });

  it("mostra o TC ID no título e as quatro seções na ordem do Figma, com o nome destacado", async () => {
    vi.mocked(casosTesteApi.obter).mockResolvedValue(detalhe);
    renderDrawer();

    const drawer = screen.getByRole("dialog");
    expect(within(drawer).getByRole("heading", { name: "Clock_000001" })).toBeInTheDocument();
    const nomes = await within(drawer).findAllByRole("term");
    expect(nomes.map((nome) => nome.textContent)).toEqual(["Title", "Test Precondition(English)", "Test Procedure(English)", "Expected Result(English)"]);
    expect(nomes.every((nome) => nome.classList.contains("font-medium"))).toBe(true);
    expect(casosTesteApi.obter).toHaveBeenCalledWith("case-1");
  });

  it("mostra o texto como veio da planilha, com as quebras de linha, e um traço no texto vazio", async () => {
    vi.mocked(casosTesteApi.obter).mockResolvedValue(detalhe);
    renderDrawer();

    const valores = await screen.findAllByRole("definition");
    expect(valores[2].textContent).toBe(detalhe.procedure);
    expect(valores[2]).toHaveClass("whitespace-pre-wrap");
    expect(valores[3].textContent).toBe("—");
  });

  it.each(["Cancel", "Done"])("é só de leitura: sem campos, e o botão %s do rodapé fecha o painel", async (botao) => {
    vi.mocked(casosTesteApi.obter).mockResolvedValue(detalhe);
    const user = userEvent.setup();
    const onFechar = renderDrawer();

    const drawer = screen.getByRole("dialog");
    await within(drawer).findAllByRole("term");
    expect(within(drawer).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(drawer).queryByRole("combobox")).not.toBeInTheDocument();
    await user.click(within(drawer).getByRole("button", { name: botao }));
    expect(onFechar).toHaveBeenCalled();
  });

  it("fecha com Esc", async () => {
    vi.mocked(casosTesteApi.obter).mockResolvedValue(detalhe);
    const user = userEvent.setup();
    const onFechar = renderDrawer();

    await screen.findAllByRole("term");
    await user.keyboard("{Escape}");
    expect(onFechar).toHaveBeenCalled();
  });

  it("avisa enquanto carrega", () => {
    vi.mocked(casosTesteApi.obter).mockReturnValue(new Promise(() => undefined));
    renderDrawer();

    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("avisa que o caso não foi encontrado quando a API responde 404, sem mostrar textos", async () => {
    falharCom(404);
    renderDrawer();

    expect(await screen.findByRole("alert")).toHaveTextContent("This Test Case wasn't found.");
    expect(screen.queryByRole("term")).not.toBeInTheDocument();
    expect(casosTesteApi.obter).toHaveBeenCalledTimes(1);
  });

  it("não repete a busca quando a API recusa o acesso (4xx)", async () => {
    falharCom(403);
    renderDrawer();

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load this Test Case.");
    expect(casosTesteApi.obter).toHaveBeenCalledTimes(1);
  });

  it("mostra erro de carregamento para outras falhas e permite tentar de novo", async () => {
    falharCom(500);
    renderDrawer();

    const user = userEvent.setup();
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load this Test Case.");
    expect(casosTesteApi.obter).toHaveBeenCalledTimes(4); // a primeira tentativa e as 3 repetições

    vi.mocked(casosTesteApi.obter).mockResolvedValue(detalhe);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(detalhe.title!)).toBeInTheDocument();
  });
});
