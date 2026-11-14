import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { ApiError } from "@/shared/api/problem-details";
import { toast } from "@/shared/lib/toast";
import { formFactorApi } from "../../api/projetos.api";
import { AcoesGerenciaFormFactor } from "./AcoesGerenciaFormFactor";

vi.mock("../../api/projetos.api", () => ({ formFactorApi: { importar: vi.fn(), ultimaImportacao: vi.fn(), desfazerImportacao: vi.fn() } }));
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(formFactorApi.ultimaImportacao).mockResolvedValue(null);
  });

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
      "Cell F4 (Start Time) doesn't have a valid date. Use year/month/day, like 2026/11/11.",
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


  describe("Undo last import (spec 067)", () => {
    const ultima = {
      id: "imp-1", sdf_id: "456789-990123", device: "SM-S948B", data_execucao: "2026-11-06T18:43:35",
      importado_por_nome: "Ana", importado_em: "2026-11-07T09:00:00",
    };

    it("confirma no diálogo com os dados da importação e desfaz (CA-01)", async () => {
      vi.mocked(formFactorApi.ultimaImportacao).mockResolvedValue(ultima);
      vi.mocked(formFactorApi.desfazerImportacao).mockResolvedValue({ casos_revertidos: 1 });
      const user = userEvent.setup();
      const { invalidar } = renderAcoes(base);

      await user.click(await screen.findByRole("button", { name: "More import actions" }));
      await user.click(await screen.findByRole("menuitem", { name: "Undo last import" }));
      const dialog = await screen.findByRole("alertdialog");
      expect(within(dialog).getByText("456789-990123")).toBeInTheDocument();
      expect(within(dialog).getByText("SM-S948B")).toBeInTheDocument();
      expect(within(dialog).getByText("Ana")).toBeInTheDocument();
      await user.click(within(dialog).getByRole("button", { name: "Undo import" }));

      await waitFor(() => expect(formFactorApi.desfazerImportacao).toHaveBeenCalledWith("project-1", "imp-1"));
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Import undone."));
      expect(invalidar).toHaveBeenCalledWith({ queryKey: ["projetos", "project-1"] });
    });

    it("cancelar não desfaz nada (CA-07)", async () => {
      vi.mocked(formFactorApi.ultimaImportacao).mockResolvedValue(ultima);
      const user = userEvent.setup();
      renderAcoes(base);

      await user.click(await screen.findByRole("button", { name: "More import actions" }));
      await user.click(await screen.findByRole("menuitem", { name: "Undo last import" }));
      await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancel" }));

      await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
      expect(formFactorApi.desfazerImportacao).not.toHaveBeenCalled();
    });

    it("falha: sem importação no projeto o botão não aparece (CA-09)", async () => {
      renderAcoes(base);

      await waitFor(() => expect(formFactorApi.ultimaImportacao).toHaveBeenCalledWith("project-1"));
      expect(screen.queryByRole("button", { name: "More import actions" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Import SDF report" })).toBeInTheDocument();
    });

    it("falha: outra importação entrou no meio e o aviso aparece no toast (CA-10)", async () => {
      vi.mocked(formFactorApi.ultimaImportacao).mockResolvedValue(ultima);
      vi.mocked(formFactorApi.desfazerImportacao).mockRejectedValue(new ApiError({ type: "about:blank", title: "Conflito.", status: 409, detail: "Esta importação não é mais a última do projeto." }));
      const user = userEvent.setup();
      renderAcoes(base);

      await user.click(await screen.findByRole("button", { name: "More import actions" }));
      await user.click(await screen.findByRole("menuitem", { name: "Undo last import" }));
      await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Undo import" }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Another import came in after this one. Check the details and try again."));
      expect(formFactorApi.ultimaImportacao).toHaveBeenCalledTimes(2);
    });

    it("falha: o dev não busca a última importação (CA-08)", () => {
      renderAcoes({ ...base, perfil_codigo: "USUARIO_PADRAO" });

      expect(formFactorApi.ultimaImportacao).not.toHaveBeenCalled();
    });
  });
});
