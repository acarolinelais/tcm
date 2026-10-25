import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FormFactorManualDialog } from "./FormFactorManualDialog";

describe("FormFactorManualDialog", () => {
  it("permite resultados vazios e envia somente os modelos escolhidos", async () => {
    const user = userEvent.setup();
    const onSalvar = vi.fn();
    render(<FormFactorManualDialog aberto onAbertoChange={vi.fn()} linha={{ caso_teste_id: "case-1", tc_id: "TC-001" }} modelos={[{ id: "m1", nome: "S25" }, { id: "m2", nome: "S26" }]} salvando={false} onSalvar={onSalvar} />);

    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeEnabled();
    await user.click(screen.getByRole("combobox", { name: "Result for S25" }));
    await user.click(await screen.findByRole("option", { name: "PASS" }));
    expect(save).toBeEnabled();
    await user.click(save);
    expect(onSalvar).toHaveBeenCalledWith({ resultados: { m1: "PASS" } });
  });
});
