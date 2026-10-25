import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { MultiSelectCombobox } from "./multi-select-combobox";

const options = [
  { value: "sm-9292", label: "SM-9292", description: "Galaxy S27 Ultra" },
  { value: "tab-s11", label: "Tab S11", description: null },
];

function Seletor() {
  const [value, setValue] = useState<string[]>([]);
  return <MultiSelectCombobox label="Device models" placeholder="Select" options={options} value={value} onValueChange={setValue} emptyLabel="None" removeLabel={(label) => `Remove ${label}`} />;
}

describe("MultiSelectCombobox", () => {
  it("mostra a descrição depois do nome, com o separador só visual, nas opções que a têm", async () => {
    const user = userEvent.setup();
    render(<Seletor />);

    await user.click(screen.getByRole("button", { name: "Device models" }));

    const opcao = await screen.findByRole("option", { name: "SM-9292 Galaxy S27 Ultra" });
    expect(opcao).toHaveTextContent("SM-9292 · Galaxy S27 Ultra");
    expect(screen.getByRole("option", { name: "Tab S11" })).toHaveTextContent(/^Tab S11$/);
  });

  it("a etiqueta do modelo selecionado mostra só o nome", async () => {
    const user = userEvent.setup();
    render(<Seletor />);

    await user.click(screen.getByRole("button", { name: "Device models" }));
    await user.click(await screen.findByRole("option", { name: "SM-9292 Galaxy S27 Ultra" }));
    await user.keyboard("{Escape}");

    const chip = screen.getByRole("button", { name: "Remove SM-9292" }).parentElement!;
    expect(chip).toHaveTextContent(/^SM-9292$/);
    expect(within(chip).queryByText(/Galaxy S27 Ultra/)).not.toBeInTheDocument();
  });
});
