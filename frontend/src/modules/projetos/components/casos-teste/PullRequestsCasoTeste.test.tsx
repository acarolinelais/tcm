import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/shared/lib/toast";
import { ApiError } from "@/shared/api/problem-details";
import { casosTesteApi, type LinkPullRequest } from "../../api/projetos.api";
import { PullRequestsCasoTeste } from "./PullRequestsCasoTeste";

vi.mock("../../api/projetos.api", () => ({
  projetosApi: {}, formFactorApi: {}, modelosDispositivoApi: {},
  casosTesteApi: { listarPullRequests: vi.fn(), adicionarPullRequest: vi.fn(), removerPullRequest: vi.fn() },
}));
vi.mock("@/shared/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const URL_PR = "https://github.sec.samsung.net/org/repo/pull/12";
const link = (id: string, url: string, nome = "Ana Souza"): LinkPullRequest => ({
  id, caso_teste_id: "case-1", url, created_at: "2026-10-28T12:00:00Z", created_by: "user-1", created_by_nome: nome,
});
const erroApi = (status: number) => new ApiError({ type: "about:blank", title: "Erro", status });

function listarCom(itens: LinkPullRequest[], podeRemover = false) {
  vi.mocked(casosTesteApi.listarPullRequests).mockResolvedValue({ itens, pode_remover: podeRemover });
}

function renderSecao() {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  render(<QueryClientProvider client={client}><PullRequestsCasoTeste casoId="case-1" /></QueryClientProvider>);
  return userEvent.setup();
}

describe("PullRequestsCasoTeste", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("mostra o estado vazio e o campo para adicionar", async () => {
    listarCom([]);
    renderSecao();

    expect(await screen.findByText("No PRs registered")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "PR link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("lista os links na ordem da API, abrindo em nova aba, com quem adicionou", async () => {
    listarCom([link("pr-2", `${URL_PR}/files`, "Kaique Pereira"), link("pr-1", URL_PR)]);
    renderSecao();

    const itens = await screen.findAllByRole("listitem");
    expect(itens.map((item) => within(item).getByRole("link").textContent)).toEqual([`${URL_PR}/files`, URL_PR]);
    const primeiro = within(itens[0]).getByRole("link");
    expect(primeiro).toHaveAttribute("href", `${URL_PR}/files`);
    expect(primeiro).toHaveAttribute("target", "_blank");
    expect(primeiro).toHaveAttribute("rel", "noopener noreferrer");
    expect(itens[0]).toHaveTextContent("Added by Kaique Pereira");
  });

  it.each([
    ["http://github.sec.samsung.net/org/repo/pull/1", "Enter a valid https link."],
    ["https://github.com/org/repo/pull/1", "Only github.sec.samsung.net links are accepted."],
    ["   ", "Enter the PR link."],
  ])("não envia %j e explica o formato aceito", async (url, mensagem) => {
    listarCom([]);
    const user = renderSecao();

    await user.type(await screen.findByRole("textbox", { name: "PR link" }), url);
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText(mensagem)).toBeInTheDocument();
    expect(casosTesteApi.adicionarPullRequest).not.toHaveBeenCalled();
  });

  it("adiciona o link sem os espaços das pontas, limpa o campo, avisa e recarrega a lista", async () => {
    listarCom([]);
    vi.mocked(casosTesteApi.adicionarPullRequest).mockResolvedValue(link("pr-1", URL_PR));
    const user = renderSecao();

    const campo = await screen.findByRole("textbox", { name: "PR link" });
    await user.type(campo, `  ${URL_PR} `);
    listarCom([link("pr-1", URL_PR)]);
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(casosTesteApi.adicionarPullRequest).toHaveBeenCalledWith("case-1", URL_PR);
    expect(await screen.findByRole("link", { name: URL_PR })).toBeInTheDocument();
    expect(campo).toHaveValue("");
    expect(toast.success).toHaveBeenCalledWith("PR link added.");
  });

  it("mostra no campo que o link já está registrado (409), sem mudar a lista", async () => {
    listarCom([link("pr-1", URL_PR)]);
    vi.mocked(casosTesteApi.adicionarPullRequest).mockRejectedValue(erroApi(409));
    const user = renderSecao();

    await user.type(await screen.findByRole("textbox", { name: "PR link" }), URL_PR);
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText("This PR link is already registered for this Test Case.")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("não mostra o botão de remover quando a API diz que a pessoa não pode remover (dev)", async () => {
    listarCom([link("pr-1", URL_PR)], false);
    renderSecao();

    await screen.findByRole("link", { name: URL_PR });
    expect(screen.queryByRole("button", { name: `Remove PR link ${URL_PR}` })).not.toBeInTheDocument();
  });

  it("pede confirmação antes de remover: cancelar mantém o link", async () => {
    listarCom([link("pr-1", URL_PR)], true);
    const user = renderSecao();

    await user.click(await screen.findByRole("button", { name: `Remove PR link ${URL_PR}` }));
    const dialogo = await screen.findByRole("alertdialog");
    expect(dialogo).toHaveTextContent("Remove PR link?");
    await user.click(within(dialogo).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(casosTesteApi.removerPullRequest).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: URL_PR })).toBeInTheDocument();
  });

  it("remove depois de confirmar, avisa e recarrega a lista", async () => {
    listarCom([link("pr-1", URL_PR)], true);
    vi.mocked(casosTesteApi.removerPullRequest).mockResolvedValue(undefined);
    const user = renderSecao();

    await user.click(await screen.findByRole("button", { name: `Remove PR link ${URL_PR}` }));
    listarCom([], true);
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Remove" }));

    expect(casosTesteApi.removerPullRequest).toHaveBeenCalledWith("case-1", "pr-1");
    expect(await screen.findByText("No PRs registered")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith("PR link removed.");
  });

  it("avisa quando o link já tinha sido removido (404) e recarrega a lista", async () => {
    listarCom([link("pr-1", URL_PR)], true);
    vi.mocked(casosTesteApi.removerPullRequest).mockRejectedValue(erroApi(404));
    const user = renderSecao();

    await user.click(await screen.findByRole("button", { name: `Remove PR link ${URL_PR}` }));
    listarCom([], true);
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("This PR link was already removed."));
    expect(await screen.findByText("No PRs registered")).toBeInTheDocument();
  });

  it("mostra erro ao carregar e deixa tentar de novo", async () => {
    vi.mocked(casosTesteApi.listarPullRequests).mockRejectedValue(erroApi(500));
    const user = renderSecao();

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load the PRs.");
    listarCom([link("pr-1", URL_PR)]);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("link", { name: URL_PR })).toBeInTheDocument();
  });
});
