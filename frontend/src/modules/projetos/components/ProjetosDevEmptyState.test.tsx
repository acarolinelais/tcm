import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import i18n from "@/core/i18n";
import { ProjetosDevEmptyState } from "./ProjetosDevEmptyState";

it.each(["en", "pt-BR", "ko"])("exibe mensagem traduzida sem ações de gestão em %s", async (idioma) => {
  await i18n.changeLanguage(idioma);
  const { unmount } = render(<ProjetosDevEmptyState />);
  expect(screen.getByRole("heading")).toHaveTextContent(i18n.t("devProjectsEmpty"));
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  unmount();
  await i18n.changeLanguage("en");
});
