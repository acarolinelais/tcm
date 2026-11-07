import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { ApiError } from "@/shared/api/problem-details";
import { toast } from "@/shared/lib/toast";
import { formFactorApi } from "../../api/projetos.api";
import { AcoesGerenciaFormFactor } from "./AcoesGerenciaFormFactor";

vi.mock("../../api/projetos.api", () => ({ formFactorApi: { importar: vi.fn() } }));
vi.mock("@/shared/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const base: PerfilAtual = {
  id: "user-1", nome: "Gestão", email: "gestao@example.com", unidade_id: "unit-1", unidade_nome: "Unidade",
  perfil_codigo: "GERENTE", perfil: "Gerente", permissoes: ["form_factor.consultar", "form_factor.registrar", "form_factor.importar"],
  times: [], setores_gerenciados: [], time_atual_id: null, tem_multiplos_times: false, senha_alteracao_obrigatoria: false,
  idioma_preferido: "en", cor_avatar: "azul",
};

function renderAcoes(perfil: PerfilAtual) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidar = vi.spyOn(client, "invalidateQueries");
  const tela = render(<QueryClientProvider client={client}><AcoesGerenciaFormFactor projetoId="project-1" perfil={perfil} /></QueryClientProvider>);
  return { ...tela, invalidar };
}

describe("AcoesGerenciaFormFactor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gerente e KP com a permissão veem só o Import SDF Report (CA-05)", () => {
    for (const perfil_codigo of ["GERENTE", "KP"]) {
      const { unmount } = renderAcoes({ ...base, perfil_codigo });
      expect(screen.getAllByRole("button").map((botao) => botao.textContent)).toEqual(["Import SDF report"]);
      unmount();
    }
  });

  it("falha: o dev com form_factor.registrar não vê o botão (CA-06)", () => {
    const { container } = renderAcoes({ ...base, perfil_codigo: "USUARIO_PADRAO", permissoes: ["form_factor.consultar", "form_factor.registrar", "form_factor.importar"] });

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it("o admin vê o botão sem permissões explícitas", () => {
    renderAcoes({ ...base, perfil_codigo: "ADMIN_UNIDADE", permissoes: [] });

    expect(screen.getByRole("button", { name: "Import SDF report" })).toBeInTheDocument();
  });

  it("falha: KP sem form_factor.importar não vê o botão", () => {
    renderAcoes({ ...base, perfil_codigo: "KP", permissoes: ["form_factor.registrar"] });

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("importa o relatório assim que o arquivo é escolhido e atualiza a tabela da General Results (CA-09)", async () => {
    vi.mocked(formFactorApi.importar).mockResolvedValue({ quantidade_execucoes: 1, quantidade_resultados: 4 } as never);
    const user = userEvent.setup();
    const { container, invalidar } = renderAcoes(base);

    await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, new File(["report"], "sdf.xlsx"));

    await waitFor(() => expect(formFactorApi.importar).toHaveBeenCalledWith("project-1", expect.any(File)));
    await waitFor(() => expect(invalidar).toHaveBeenCalledWith({ queryKey: ["form-factor", "historico", "project-1"] }));
    expect(toast.success).toHaveBeenCalled();
  });

  it("falha: o erro da importação aparece no toast com a mensagem da API (CA-10)", async () => {
    vi.mocked(formFactorApi.importar).mockRejectedValue(new ApiError({ type: "about:blank", title: "Conflito.", status: 409, detail: "Linha 2: TC ID 'X' não pertence ao projeto." }));
    const user = userEvent.setup();
    const { container, invalidar } = renderAcoes(base);

    await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, new File(["report"], "sdf.xlsx"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Linha 2: TC ID 'X' não pertence ao projeto."));
    expect(invalidar).not.toHaveBeenCalled();
  });

  it("falha: o relatório recusado lista os problemas no idioma da tela, com a linha (CA-16, CA-18)", async () => {
    const erro = (codigo: string, linha: number | null, coluna: string | null, valor: string | null) => ({ campo: "x", mensagem: "em português", codigo, linha, coluna, valor });
    vi.mocked(formFactorApi.importar).mockRejectedValue(new ApiError({
      type: "about:blank", title: "Planilha inválida.", status: 422,
      errors: [erro("sdf_data_invalida", null, "F4", "ontem"), erro("sdf_tc_fora_do_projeto", 9, "Script Name", "Keyboard_000099")],
    }));
    const user = userEvent.setup();
    const { container } = renderAcoes(base);

    await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, new File(["report"], "123456-789012_0_Test_1_Detail.xlsx"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Could not import the SDF report.", expect.anything()));
    const [, opcoes] = vi.mocked(toast.error).mock.calls[0];
    // A lista não se lê em 4 s: o aviso fica aberto até a pessoa fechar.
    expect(opcoes?.timeout).toBe(0);
    render(<>{opcoes?.description}</>);
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Cell F4 (Start Time) doesn't have a valid date. Use month/day/year and time, like 10/21/2026 6:43:35 PM.",
      'Row 9: TC ID "Keyboard_000099" isn\'t in this project.',
    ]);
  });

  it("falha: com muitos problemas, o toast mostra 5 e conta o resto", async () => {
    const errors = Array.from({ length: 8 }, (_, indice) => ({ campo: "x", mensagem: "x", codigo: "sdf_tc_fora_do_projeto", linha: indice + 8, coluna: "Script Name", valor: `TC_${indice}` }));
    vi.mocked(formFactorApi.importar).mockRejectedValue(new ApiError({ type: "about:blank", title: "Planilha inválida.", status: 422, errors }));
    const user = userEvent.setup();
    const { container } = renderAcoes(base);

    await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, new File(["report"], "sdf.xlsx"));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    const [, opcoes] = vi.mocked(toast.error).mock.calls[0];
    render(<>{opcoes?.description}</>);
    const itens = screen.getAllByRole("listitem");
    expect(itens).toHaveLength(6);
    expect(itens.at(-1)).toHaveTextContent("And 3 more problems.");
  });

});
