import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { atualizarCorAvatar, type PerfilAtual } from "@/core/auth/api";
import { perfilAtualQueryKey } from "@/core/auth/usePerfilAtual";
import i18n from "@/core/i18n";
import { toast } from "@/shared/lib/toast";
import { SeletorCorAvatar } from "./SeletorCorAvatar";

vi.mock("@/core/auth/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/core/auth/api")>();
  return { ...actual, atualizarCorAvatar: vi.fn() };
});
vi.mock("@/shared/lib/toast", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const perfil = { nome: "Ana Lais", idioma_preferido: "en", cor_avatar: "azul" } as PerfilAtual;

// Lê o perfil do cache, como o AppLayout faz, para a troca otimista aparecer no seletor.
function SeletorComCache() {
  const { data } = useQuery({ queryKey: perfilAtualQueryKey(), queryFn: () => perfil, staleTime: Infinity });
  return data ? <><span id="titulo">Avatar color</span><SeletorCorAvatar perfil={data} labelledBy="titulo" /></> : null;
}

function renderSeletor() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(perfilAtualQueryKey(), perfil);
  render(<QueryClientProvider client={queryClient}><SeletorComCache /></QueryClientProvider>);
  return queryClient;
}

describe("SeletorCorAvatar", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
  });

  it("mostra as 8 cores com nome acessível num grupo rotulado, com a cor salva marcada", () => {
    renderSeletor();

    const grupo = screen.getByRole("radiogroup", { name: "Avatar color" });
    const opcoes = screen.getAllByRole("radio");
    expect(grupo).toBeInTheDocument();
    expect(opcoes.map((opcao) => opcao.getAttribute("aria-label"))).toEqual(["Blue", "Indigo", "Purple", "Pink", "Red", "Orange", "Green", "Gray"]);
    expect(screen.getByRole("radio", { name: "Blue" })).toBeChecked();
  });

  it("ao escolher verde, marca na hora e grava só a cor na conta", async () => {
    vi.mocked(atualizarCorAvatar).mockResolvedValue({ idioma_preferido: "en", cor_avatar: "verde" });
    const user = userEvent.setup();
    const queryClient = renderSeletor();

    await user.click(screen.getByRole("radio", { name: "Green" }));

    expect(screen.getByRole("radio", { name: "Green" })).toBeChecked();
    expect(atualizarCorAvatar).toHaveBeenCalledWith("verde");
    expect(queryClient.getQueryData<PerfilAtual>(perfilAtualQueryKey())?.cor_avatar).toBe("verde");
  });

  it("se a gravação falha, avisa e volta para a cor salva", async () => {
    vi.mocked(atualizarCorAvatar).mockRejectedValue(new Error("500"));
    const user = userEvent.setup();
    renderSeletor();

    await user.click(screen.getByRole("radio", { name: "Red" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Could not save your avatar color. Your previous color was restored."));
    expect(screen.getByRole("radio", { name: "Blue" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Red" })).not.toBeChecked();
  });

  it("troca a cor pelo teclado, com as setas", async () => {
    vi.mocked(atualizarCorAvatar).mockResolvedValue({ idioma_preferido: "en", cor_avatar: "indigo" });
    const user = userEvent.setup();
    renderSeletor();

    await user.tab();
    expect(screen.getByRole("radio", { name: "Blue" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");

    await waitFor(() => expect(atualizarCorAvatar).toHaveBeenCalledWith("indigo"));
    expect(screen.getByRole("radio", { name: "Indigo" })).toBeChecked();
  });
});
