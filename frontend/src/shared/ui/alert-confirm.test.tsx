import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AlertConfirm } from "./alert-confirm";

function renderizar(isPending = false) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(<AlertConfirm open title="Transfer 2 Test Cases" description="They go to their backups." confirmLabel="Transfer" onConfirm={onConfirm} onOpenChange={onOpenChange} isPending={isPending} />);
  return { onConfirm, onOpenChange };
}

describe("AlertConfirm", () => {
  it("confirmar chama onConfirm", async () => {
    const { onConfirm } = renderizar();
    // A descrição é a descrição acessível da janela, lida junto com o título (spec 050).
    expect(screen.getByRole("alertdialog", { name: "Transfer 2 Test Cases" })).toHaveAccessibleDescription("They go to their backups.");
    await userEvent.click(screen.getByRole("button", { name: "Transfer" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("Esc fecha sem confirmar", async () => {
    const { onConfirm, onOpenChange } = renderizar();
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("enquanto confirma, os botões ficam desabilitados", () => {
    renderizar(true);
    expect(screen.getByRole("button", { name: "Please wait…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
