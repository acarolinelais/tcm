import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TimeMembro } from "@/modules/times/api/times.api";
import { casosTesteApi, type CasoTeste } from "../../api/projetos.api";
import { CasoTesteDrawer } from "./CasoTesteDrawer";

vi.mock("../../api/projetos.api", () => ({
  projetosApi: { obter: vi.fn(), listar: vi.fn() },
  casosTesteApi: { listar: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), transferirParaBackup: vi.fn() },
  formFactorApi: {}, modelosDispositivoApi: {},
}));
vi.mock("@/shared/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const membro = (id: string, nome: string): TimeMembro => ({ id: `m-${id}`, time_id: "team-1", usuario_id: id, usuario_nome: nome, usuario_user_id: null, usuario_perfil: "Developer", usuario_perfil_codigo: null, ativo: true } as TimeMembro);
const membros = [membro("user-1", "Daniel Oliveira"), membro("user-2", "Kaique Pereira")];

const caso: CasoTeste = {
  id: "case-1", unidade_id: "unit-1", projeto_id: "project-1", tc_id: "Clock_001", category: "A", difficulty: "Low", automation_level: null,
  situation: "New", status: "To-Do", responsavel_id: "user-1", backup_id: "user-2", ativo: true, created_at: null, updated_at: null,
};

function renderDrawer(editar: CasoTeste | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><CasoTesteDrawer isOpen onOpenChange={() => undefined} projetoId="project-1" editar={editar} membrosAtivos={membros} /></QueryClientProvider>);
}

async function preencherNovoCaso(user: ReturnType<typeof userEvent.setup>) {
  const drawer = screen.getByRole("dialog");
  await user.type(within(drawer).getByLabelText("TC ID"), "Clock_003");
  await user.click(within(drawer).getByLabelText("TC Situation"));
  await user.click(await screen.findByRole("option", { name: "Without Changes" }));
  await user.click(within(drawer).getByLabelText("Assignee"));
  await user.click(await screen.findByRole("option", { name: /Daniel Oliveira/ }));
  await user.click(within(drawer).getByLabelText("Backup"));
  await user.click(await screen.findByRole("option", { name: /Kaique Pereira/ }));
  return drawer;
}

describe("CasoTesteDrawer: Automation Level (spec 026)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(casosTesteApi.criar).mockResolvedValue(caso);
    vi.mocked(casosTesteApi.atualizar).mockResolvedValue(caso);
  });

  it("cria o Test Case sem Automation Level quando o campo fica sem escolha", async () => {
    const user = userEvent.setup();
    renderDrawer(null);
    const drawer = await preencherNovoCaso(user);

    expect(within(drawer).getByLabelText("Automation Level")).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "Save" })).toBeEnabled();
    await user.click(within(drawer).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(casosTesteApi.criar).toHaveBeenCalledTimes(1));
    const [, input] = vi.mocked(casosTesteApi.criar).mock.calls[0];
    expect(input).toEqual({ tc_id: "Clock_003", category: "A", difficulty: "Low", situation: "Without Changes", responsavel_id: "user-1", backup_id: "user-2" });
    expect(input).not.toHaveProperty("automation_level");
  });

  it("cria o Test Case com o nível escolhido, enviado como número", async () => {
    const user = userEvent.setup();
    renderDrawer(null);
    const drawer = await preencherNovoCaso(user);

    await user.click(within(drawer).getByLabelText("Automation Level"));
    expect((await screen.findAllByRole("option")).map((option) => option.textContent)).toEqual(["1 – Not automatable", "2 – Partially automatable", "3 – 100% automatable"]);
    await user.click(screen.getByRole("option", { name: "3 – 100% automatable" }));
    await user.click(within(drawer).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(casosTesteApi.criar).toHaveBeenCalledWith("project-1", expect.objectContaining({ tc_id: "Clock_003", automation_level: 3 })));
  });

  it("ao editar, mostra o nível atual e só o envia quando mudou", async () => {
    const user = userEvent.setup();
    renderDrawer({ ...caso, automation_level: 1 });
    const drawer = screen.getByRole("dialog");
    expect(within(drawer).getByLabelText("Automation Level")).toHaveTextContent("1 – Not automatable");

    await user.click(within(drawer).getByLabelText("Difficulty"));
    await user.click(await screen.findByRole("option", { name: "High" }));
    await user.click(within(drawer).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("case-1", { difficulty: "High" }));

    await user.click(within(drawer).getByLabelText("Automation Level"));
    await user.click(await screen.findByRole("option", { name: "2 – Partially automatable" }));
    await user.click(within(drawer).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenLastCalledWith("case-1", { difficulty: "High", automation_level: 2 }));
  });

  it("ao editar um caso sem nível, deixar o campo vazio não envia nada sobre ele", async () => {
    const user = userEvent.setup();
    renderDrawer(caso);
    const drawer = screen.getByRole("dialog");

    await user.click(within(drawer).getByLabelText("Difficulty"));
    await user.click(await screen.findByRole("option", { name: "Medium" }));
    await user.click(within(drawer).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledTimes(1));
    expect(vi.mocked(casosTesteApi.atualizar).mock.calls[0][1]).toEqual({ difficulty: "Medium" });
  });
});
