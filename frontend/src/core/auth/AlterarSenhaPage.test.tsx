import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { httpPost } from "@/core/api/http-client";
import i18n from "@/core/i18n";
import { ApiError } from "@/shared/api/problem-details";
import { alterarSenhaInicial, atualizarIdiomaPreferido, type PerfilAtual, type Preferencias } from "./api";
import { AlterarSenhaPage } from "./AlterarSenhaPage";

vi.mock("./api", () => ({ alterarSenhaInicial: vi.fn(), atualizarIdiomaPreferido: vi.fn() }));
vi.mock("@/core/api/http-client", () => ({ httpPost: vi.fn() }));

const perfil = { nome: "Ana", idioma_preferido: "en", senha_alteracao_obrigatoria: true } as PerfilAtual;

function renderTela() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/trocar-senha"]}>
        <Routes>
          <Route element={<Outlet context={perfil} />}>
            <Route path="/trocar-senha" element={<AlterarSenhaPage />} />
          </Route>
          <Route path="/overview" element={<p>Overview</p>} />
          <Route path="/login" element={<p>Login</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const novaSenha = () => screen.getByLabelText("New password");
const confirmacao = () => screen.getByLabelText("Confirm new password");

describe("AlterarSenhaPage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
  });

  it("mostra a moldura do login com os campos, salvar, sair, idioma, tema e crédito", () => {
    renderTela();

    expect(screen.getByRole("img", { name: "TCM" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create your password" })).toBeInTheDocument();
    expect(screen.getByText("To continue, replace the initial password with a personal password.")).toBeInTheDocument();
    expect(novaSenha()).toHaveAttribute("type", "password");
    expect(confirmacao()).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Save password" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /English/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dark theme" })).toBeInTheDocument();
    expect(screen.getByText("Developed by · SDF Automation Team")).toBeInTheDocument();
  });

  it("mostra e oculta cada senha de forma independente, com o estado no aria-pressed", async () => {
    const user = userEvent.setup();
    renderTela();
    const [olhoNova, olhoConfirmacao] = screen.getAllByRole("button", { name: "Show password" });

    await user.click(olhoNova);

    expect(novaSenha()).toHaveAttribute("type", "text");
    expect(confirmacao()).toHaveAttribute("type", "password");
    expect(olhoNova).toHaveAttribute("aria-pressed", "true");
    expect(olhoConfirmacao).toHaveAttribute("aria-pressed", "false");

    await user.click(olhoNova);
    expect(novaSenha()).toHaveAttribute("type", "password");
    expect(olhoNova).toHaveAttribute("aria-pressed", "false");
  });

  it("alcança o botão de mostrar senha pelo teclado", async () => {
    const user = userEvent.setup();
    renderTela();
    await user.click(novaSenha());

    await user.tab();

    expect(screen.getAllByRole("button", { name: "Show password" })[0]).toHaveFocus();
  });

  it("troca o idioma sem perder o que foi digitado e salva na conta", async () => {
    vi.mocked(atualizarIdiomaPreferido).mockResolvedValue({ idioma_preferido: "pt-BR" } as Preferencias);
    const user = userEvent.setup();
    renderTela();
    await user.type(novaSenha(), "segredo");

    await user.click(screen.getByRole("button", { name: /English/ }));
    await user.click(screen.getByRole("menuitem", { name: "Portuguese" }));

    expect(await screen.findByRole("heading", { name: "Crie sua senha" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nova senha")).toHaveValue("segredo");
    expect(atualizarIdiomaPreferido).toHaveBeenCalledWith("pt-BR");
  });

  it("salva a senha e vai para o overview", async () => {
    vi.mocked(alterarSenhaInicial).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderTela();
    await user.type(novaSenha(), "segredo");
    await user.type(confirmacao(), "segredo");

    await user.click(screen.getByRole("button", { name: "Save password" }));

    expect(alterarSenhaInicial).toHaveBeenCalledWith("segredo");
    expect(await screen.findByText("Overview")).toBeInTheDocument();
  });

  it("não deixa sair enquanto a senha está sendo salva", async () => {
    vi.mocked(alterarSenhaInicial).mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    renderTela();
    await user.type(novaSenha(), "segredo");
    await user.type(confirmacao(), "segredo");

    await user.click(screen.getByRole("button", { name: "Save password" }));

    expect(await screen.findByRole("button", { name: "Log out" })).toBeDisabled();
  });

  it("sai sem trocar a senha e volta para o login", async () => {
    vi.mocked(httpPost).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderTela();

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(httpPost).toHaveBeenCalledWith("/api/auth/logout", {});
    expect(await screen.findByText("Login")).toBeInTheDocument();
    expect(alterarSenhaInicial).not.toHaveBeenCalled();
  });

  it("recusa campos vazios e marca os dois como inválidos", async () => {
    const user = userEvent.setup();
    renderTela();

    await user.click(screen.getByRole("button", { name: "Save password" }));

    expect(screen.getAllByRole("alert").map((alerta) => alerta.textContent)).toEqual(["Password is required.", "Password is required."]);
    expect(novaSenha()).toHaveAttribute("aria-invalid", "true");
    expect(novaSenha()).toHaveAccessibleDescription("Password is required.");
    expect(confirmacao()).toHaveAttribute("aria-invalid", "true");
    expect(novaSenha()).toHaveFocus();
    expect(alterarSenhaInicial).not.toHaveBeenCalled();
  });

  it("recusa confirmação diferente e avisa no campo de confirmação", async () => {
    const user = userEvent.setup();
    renderTela();
    await user.type(novaSenha(), "segredo");
    await user.type(confirmacao(), "outra");

    await user.click(screen.getByRole("button", { name: "Save password" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter the same password in both fields.");
    expect(confirmacao()).toHaveAttribute("aria-invalid", "true");
    expect(confirmacao()).toHaveAccessibleDescription("Enter the same password in both fields.");
    expect(confirmacao()).toHaveFocus();
    expect(novaSenha()).not.toHaveAttribute("aria-invalid", "true");
    expect(alterarSenhaInicial).not.toHaveBeenCalled();
  });

  it("mantém a tela e permite tentar de novo quando a API falha", async () => {
    vi.mocked(alterarSenhaInicial).mockRejectedValue(new ApiError({ type: "about:blank", title: "Erro", status: 500 }));
    const user = userEvent.setup();
    renderTela();
    await user.type(novaSenha(), "segredo");
    await user.type(confirmacao(), "segredo");

    await user.click(screen.getByRole("button", { name: "Save password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not change your password. Try again.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Save password" })).toBeEnabled());
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
  });
});
