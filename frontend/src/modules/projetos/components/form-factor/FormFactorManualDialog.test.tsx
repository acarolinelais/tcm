import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FormFactorManualDialog } from "./FormFactorManualDialog";

const modelos = [{ id: "m1", nome: "S25" }, { id: "m2", nome: "S26" }];

function renderDialog(onSalvar = vi.fn()) {
  render(<FormFactorManualDialog aberto onAbertoChange={vi.fn()} linha={{ caso_teste_id: "case-1", tc_id: "TC-001" }} modelos={modelos} salvando={false} onSalvar={onSalvar} />);
  return onSalvar;
}

async function escolher(user: ReturnType<typeof userEvent.setup>, modelo: string, resultado: "PASS" | "FAIL") {
  await user.click(screen.getByRole("button", { name: new RegExp(`Result for ${modelo}`) }));
  await user.click(await screen.findByRole("option", { name: resultado }));
}

describe("FormFactorManualDialog", () => {
  it("exige ao menos um resultado e envia somente os modelos escolhidos", async () => {
    const user = userEvent.setup();
    const onSalvar = renderDialog();

    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Choose a result for at least one model.");

    await escolher(user, "S25", "PASS");
    expect(save).toBeEnabled();
    // Resultado parcial: o caso continua em validação, e o aviso lembra que salvar é definitivo.
    expect(screen.getByRole("status")).toHaveTextContent("Models left blank stay without a result, and TC-001 stays in In Validation.");
    expect(screen.getByRole("status")).toHaveTextContent("Saved results can't be changed in this round.");
    await user.click(save);
    expect(onSalvar).toHaveBeenCalledWith({ resultados: { m1: "PASS" } });
  });

  it("avisa que um FAIL leva o Test Case para In Fixes", async () => {
    const user = userEvent.setup();
    renderDialog();

    await escolher(user, "S25", "PASS");
    await escolher(user, "S26", "FAIL");

    expect(screen.getByRole("status")).toHaveTextContent("TC-001 has a FAIL and goes to In Fixes.");
  });

  it("avisa que PASS em todos os modelos leva o Test Case para Done", async () => {
    const user = userEvent.setup();
    renderDialog();

    await escolher(user, "S25", "PASS");
    await escolher(user, "S26", "PASS");

    expect(screen.getByRole("status")).toHaveTextContent("All models PASS: TC-001 goes to Done.");
  });
});
