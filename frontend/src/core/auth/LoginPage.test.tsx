import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import i18n from "@/core/i18n";
import { ApiError } from "@/shared/api/problem-details";
import { toast } from "@/shared/lib/toast";
import { login } from "./api";
import { LoginPage } from "./LoginPage";

vi.mock("./api", () => ({ login: vi.fn() }));
vi.mock("@/shared/lib/toast", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function renderLogin() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>início</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("tema na tela de login", () => {
  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("alterna o tema antes do login, sem perder o e-mail digitado", async () => {
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText("Email"), "dev@example.com");

    // O mesmo botão da Navbar, sem variante (spec 050, RN-07).
    expect(screen.getByRole("button", { name: "Dark theme" })).toHaveClass("size-[29px]", "border-edge");
    await user.click(screen.getByRole("button", { name: "Dark theme" }));

    expect(document.documentElement).toHaveClass("dark");
    expect(screen.getByLabelText("Email")).toHaveValue("dev@example.com");
  });
});

describe("entrar (spec 050: botões e campos no HeroUI)", () => {
  afterEach(() => vi.clearAllMocks());

  async function preencher(email: string, senha: string) {
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    renderLogin();
    if (email) await user.type(screen.getByLabelText("Email"), email);
    if (senha) await user.type(screen.getByLabelText("Password"), senha);
    await user.click(screen.getByRole("button", { name: "Sign in" }));
  }

  it("com os dados certos, mostra o carregamento e vai para a página inicial", async () => {
    let concluir!: () => void;
    vi.mocked(login).mockReturnValue(new Promise<void>((resolve) => { concluir = resolve; }));
    await preencher("dev@example.com", "segredo");

    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    concluir();
    expect(await screen.findByText("início")).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith("dev@example.com", "segredo");
  });

  it("com a senha errada, avisa e continua no login (falha)", async () => {
    vi.mocked(login).mockRejectedValue(new ApiError({ type: "about:blank", title: "Não autenticado.", status: 401 }));
    await preencher("dev@example.com", "errada");

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Invalid email or password."));
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(screen.getByLabelText("Email")).toHaveValue("dev@example.com");
    expect(screen.queryByText("início")).not.toBeInTheDocument();
  });

  it("os dois campos ocupam a largura do formulário, com o botão de mostrar a senha dentro do campo", async () => {
    await i18n.changeLanguage("en");
    renderLogin();

    // O Input do HeroUI não vem com largura cheia (o do shadcn vinha): sem isso, o campo de senha encolhia.
    expect(screen.getByLabelText("Email")).toHaveClass("w-full");
    expect(screen.getByLabelText("Password")).toHaveClass("w-full");
  });

  it("sem e-mail, mostra o erro no campo e não chama a API (falha)", async () => {
    await preencher("", "segredo");

    expect(screen.getByRole("alert")).toHaveTextContent("Email is required.");
    // O erro fica dentro do label, então o campo é achado pelo papel (o de senha não é textbox).
    expect(screen.getByRole("textbox")).toHaveFocus();
    expect(login).not.toHaveBeenCalled();
  });
});

