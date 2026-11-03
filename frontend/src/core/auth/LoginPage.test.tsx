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
    expect(screen.getByRole("button", { name: "Dark theme" })).toHaveClass("size-[29px]", "border-auth-borda", "bg-auth-card", "text-auth-controle");
    await user.click(screen.getByRole("button", { name: "Dark theme" }));

    expect(document.documentElement).toHaveClass("dark");
    expect(screen.getByLabelText("Email")).toHaveValue("dev@example.com");
  });
});

describe("ilustração do login na troca de tema (spec 049)", () => {
  it("mantém as duas ilustrações e as duas camadas de fundo na tela, e o tema só muda a opacidade delas", async () => {
    await i18n.changeLanguage("en");
    const { container } = render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={["/login"]}><Routes><Route path="/login" element={<LoginPage />} /></Routes></MemoryRouter></QueryClientProvider>);

    const [clara, escura] = Array.from(container.querySelectorAll("aside img"));
    // A que sai fica com 1% (e não 0) e como camada própria: com 0 o navegador não desenha o SVG, e a primeira troca trava.
    expect(clara).toHaveClass("opacity-100", "dark:opacity-[.01]", "will-change-[opacity]");
    expect(escura).toHaveClass("opacity-[.01]", "dark:opacity-100", "will-change-[opacity]");
    // Nenhuma das duas some por `display`: isso não tem transição e dava o salto.
    expect(clara.className).not.toMatch(/hidden|dark:block/);
    expect(escura.className).not.toMatch(/hidden|dark:block/);
    const camadas = container.querySelectorAll("aside > div[aria-hidden='true']");
    expect(camadas).toHaveLength(2);
    expect(camadas[1]).toHaveClass("opacity-[.01]", "dark:opacity-100", "will-change-[opacity]");
    // A camada clara também quase some no escuro: com ela opaca por baixo, o branco vaza pela borda curva (anti-aliasing duplo).
    expect(camadas[0]).toHaveClass("opacity-100", "dark:opacity-[.01]");
    expect(camadas[0].className).not.toMatch(/rounded/);
    expect(camadas[1].className).not.toMatch(/rounded/);
    // O fundo é imagem pronta (WebP, com o vidro do Figma assado) e não filtro em tempo de execução.
    for (const camada of camadas) {
      expect((camada as HTMLElement).style.backgroundImage).toContain(".webp");
      expect(camada.className).not.toMatch(/backdrop-blur/);
    }
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

