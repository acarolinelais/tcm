import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { ApiError } from "@/shared/api/problem-details";
import { toast } from "@/shared/lib/toast";
import { formFactorApi } from "../../api/projetos.api";
import { AcoesGerenciaFormFactor } from "./AcoesGerenciaFormFactor";

vi.mock("../../api/projetos.api", () => ({ formFactorApi: { criarRodada: vi.fn(), importar: vi.fn() } }));
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

  it("gerente e KP com as permissões veem Import SDF Report e Create test round (CA-05)", () => {
    for (const perfil_codigo of ["GERENTE", "KP"]) {
      const { unmount } = renderAcoes({ ...base, perfil_codigo });
      expect(screen.getByRole("button", { name: "Import SDF report" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Create test round" })).toBeInTheDocument();
      unmount();
    }
  });

  it("falha: o dev com form_factor.registrar não vê nenhum dos dois botões (CA-06)", () => {
    const { container } = renderAcoes({ ...base, perfil_codigo: "USUARIO_PADRAO", permissoes: ["form_factor.consultar", "form_factor.registrar", "form_factor.importar"] });

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it("o admin vê os dois botões sem permissões explícitas", () => {
    renderAcoes({ ...base, perfil_codigo: "ADMIN_UNIDADE", permissoes: [] });

    expect(screen.getByRole("button", { name: "Import SDF report" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create test round" })).toBeInTheDocument();
  });

  it("cada botão depende da sua permissão", () => {
    renderAcoes({ ...base, perfil_codigo: "KP", permissoes: ["form_factor.registrar"] });

    expect(screen.getByRole("button", { name: "Create test round" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Import SDF report" })).not.toBeInTheDocument();
  });

  it("cria a rodada e avisa no toast (CA-08)", async () => {
    vi.mocked(formFactorApi.criarRodada).mockResolvedValue({ id: "round-1", sdf_id: "SDF-1", total_test_cases: 2 } as never);
    const user = userEvent.setup();
    renderAcoes(base);

    await user.click(screen.getByRole("button", { name: "Create test round" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("SDF ID"), "SDF-1");
    await user.click(within(dialog).getByRole("button", { name: "Create test round" }));

    await waitFor(() => expect(formFactorApi.criarRodada).toHaveBeenCalledWith("project-1", { sdf_id: "SDF-1" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Test round created."));
  });

  it("importa o relatório e atualiza a tabela da General Results (CA-09)", async () => {
    vi.mocked(formFactorApi.importar).mockResolvedValue({ quantidade_execucoes: 1, quantidade_resultados: 4 } as never);
    const user = userEvent.setup();
    const { container, invalidar } = renderAcoes(base);

    await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, new File(["report"], "sdf.xlsx"));
    expect(screen.getByRole("button", { name: "sdf.xlsx" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^import$/i }));

    await waitFor(() => expect(formFactorApi.importar).toHaveBeenCalledWith("project-1", expect.any(File)));
    await waitFor(() => expect(invalidar).toHaveBeenCalledWith({ queryKey: ["form-factor", "historico", "project-1"] }));
    expect(toast.success).toHaveBeenCalled();
  });

  it("falha: o erro da importação aparece no toast com a mensagem da API (CA-10)", async () => {
    vi.mocked(formFactorApi.importar).mockRejectedValue(new ApiError({ type: "about:blank", title: "Conflito.", status: 409, detail: "Linha 2: TC ID 'X' não pertence ao projeto." }));
    const user = userEvent.setup();
    const { container, invalidar } = renderAcoes(base);

    await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, new File(["report"], "sdf.xlsx"));
    await user.click(screen.getByRole("button", { name: /^import$/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Linha 2: TC ID 'X' não pertence ao projeto."));
    expect(invalidar).not.toHaveBeenCalled();
  });

  it("falha: SDF ID repetido mostra a mensagem traduzida e mantém o diálogo aberto", async () => {
    const mensagem = "Este SDF ID já tem uma rodada neste projeto.";
    vi.mocked(formFactorApi.criarRodada).mockRejectedValue(new ApiError({ type: "about:blank", title: "Conflito.", status: 409, detail: mensagem, errors: [{ campo: "sdf_id", mensagem }] }));
    const user = userEvent.setup();
    renderAcoes(base);

    await user.click(screen.getByRole("button", { name: "Create test round" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("SDF ID"), "SDF-001");
    await user.click(within(dialog).getByRole("button", { name: "Create test round" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("This SDF ID already has a round in this project. Use a different one."));
    expect(within(dialog).getByLabelText("SDF ID")).toHaveValue("SDF-001");
  });
});
