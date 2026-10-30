import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/core/i18n";
import { ApiError } from "@/shared/api/problem-details";
import { alterarSenhaInicial } from "./api";
import { AlterarSenhaPage } from "./AlterarSenhaPage";

vi.mock("./api", () => ({ alterarSenhaInicial: vi.fn() }));

async function enviar(novaSenha: string, confirmacao: string) {
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/trocar-senha"]}>
        <Routes>
          <Route path="/trocar-senha" element={<AlterarSenhaPage />} />
          <Route path="/overview" element={<p>overview</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  if (novaSenha) await user.type(screen.getByLabelText("New password"), novaSenha);
  if (confirmacao) await user.type(screen.getByLabelText("Confirm new password"), confirmacao);
  await user.click(screen.getByRole("button", { name: "Save password" }));
}

describe("troca da senha inicial (spec 050: campos e botão no HeroUI)", () => {
  beforeEach(() => i18n.changeLanguage("en"));
  afterEach(() => vi.clearAllMocks());

  it("salva a senha nova e vai para o overview", async () => {
    vi.mocked(alterarSenhaInicial).mockResolvedValue();
    await enviar("nova-senha-1", "nova-senha-1");

    expect(await screen.findByText("overview")).toBeInTheDocument();
    expect(alterarSenhaInicial).toHaveBeenCalledWith("nova-senha-1");
  });

  it("sem as senhas, marca os dois campos e não envia (falha)", async () => {
    await enviar("", "");

    expect(screen.getAllByRole("alert").map((alerta) => alerta.textContent)).toEqual(["Password is required.", "Password is required."]);
    expect(screen.getByLabelText("New password")).toHaveAttribute("aria-invalid", "true");
    expect(alterarSenhaInicial).not.toHaveBeenCalled();
  });

  it("com a confirmação diferente, avisa no campo e não envia (falha)", async () => {
    await enviar("nova-senha-1", "outra-senha");

    expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match.");
    expect(screen.getByLabelText("Confirm new password")).toHaveAttribute("aria-invalid", "true");
    expect(alterarSenhaInicial).not.toHaveBeenCalled();
  });

  it("com erro da API, mostra a mensagem e continua na tela (falha)", async () => {
    vi.mocked(alterarSenhaInicial).mockRejectedValue(new ApiError({ type: "about:blank", title: "Erro", status: 422 }));
    await enviar("nova-senha-1", "nova-senha-1");

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not change your password.");
    expect(screen.getByRole("button", { name: "Save password" })).toBeEnabled();
  });
});
