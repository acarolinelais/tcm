import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import i18n from "@/core/i18n";
import { LoginPage } from "./LoginPage";

function renderLogin() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter><LoginPage /></MemoryRouter>
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

    await user.click(screen.getByRole("button", { name: "Dark theme" }));

    expect(document.documentElement).toHaveClass("dark");
    expect(screen.getByLabelText("Email")).toHaveValue("dev@example.com");
  });
});
