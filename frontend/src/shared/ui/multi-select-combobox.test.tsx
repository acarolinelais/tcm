import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { MultiSelectCombobox } from "./multi-select-combobox";

const options = [
  { value: "sm-9292", label: "SM-9292", description: "Galaxy S27 Ultra" },
  { value: "tab-s11", label: "Tab S11", description: null },
  { value: "tab-s12", label: "Tab S12", description: null },
];

function Seletor({ onChange = vi.fn() }: { onChange?: (valor: string[]) => void }) {
  const [value, setValue] = useState<string[]>([]);
  return <MultiSelectCombobox label="Device models" placeholder="Select models" options={options} value={value} onValueChange={(novo) => { setValue(novo); onChange(novo); }} emptyLabel="No models found" removeLabel={(label) => `Remove ${label}`} />;
}

const abrir = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "Device models" }));

describe("MultiSelectCombobox", () => {
  it("mostra a descrição depois do nome, com o separador só visual, nas opções que a têm", async () => {
    const user = userEvent.setup();
    render(<Seletor />);

    await abrir(user);

    const opcao = await screen.findByRole("option", { name: "SM-9292 Galaxy S27 Ultra" });
    expect(opcao).toHaveTextContent("SM-9292 · Galaxy S27 Ultra");
    expect(screen.getByRole("option", { name: "Tab S11" })).toHaveTextContent(/^Tab S11$/);
  });

  it("busca por parte do nome, escolhe dois e remove um pela etiqueta", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Seletor onChange={onChange} />);

    await abrir(user);
    await user.type(await screen.findByRole("searchbox"), "tab");
    expect(screen.queryByRole("option", { name: /SM-9292/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "Tab S11" }));
    await user.click(screen.getByRole("option", { name: "Tab S12" }));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    const etiquetas = screen.getByRole("grid", { name: "Device models" });
    expect(within(etiquetas).getAllByRole("row").map((linha) => linha.textContent)).toEqual(["Tab S11", "Tab S12"]);
    await user.click(screen.getByRole("button", { name: "Remove Tab S11" }));

    expect(onChange).toHaveBeenLastCalledWith(["tab-s12"]);
    expect(within(screen.getByRole("grid", { name: "Device models" })).getAllByRole("row").map((linha) => linha.textContent)).toEqual(["Tab S12"]);
  });

  it("a etiqueta do modelo escolhido mostra só o nome", async () => {
    const user = userEvent.setup();
    render(<Seletor />);

    await abrir(user);
    await user.click(await screen.findByRole("option", { name: "SM-9292 Galaxy S27 Ultra" }));
    await user.keyboard("{Escape}");

    const etiqueta = within(await screen.findByRole("grid", { name: "Device models" })).getByRole("row");
    expect(etiqueta).toHaveTextContent(/^SM-9292$/);
  });

  it("mostra o ícone antes do rótulo, fora do nome acessível da opção", async () => {
    const user = userEvent.setup();
    render(<MultiSelectCombobox label="Pessoas" placeholder="Todas" options={[{ value: "ana", label: "Ana", icone: <span data-testid="avatar-ana" /> }]} value={[]} onValueChange={vi.fn()} emptyLabel="Nada" removeLabel={(l) => l} />);

    await user.click(screen.getByRole("button", { name: "Pessoas" }));

    const opcao = await screen.findByRole("option", { name: "Ana" });
    expect(within(opcao).getByTestId("avatar-ana")).toBeInTheDocument();
  });

  it("a busca também encontra pela descrição", async () => {
    const user = userEvent.setup();
    render(<Seletor />);

    await abrir(user);
    await user.type(await screen.findByRole("searchbox"), "galaxy");

    expect(screen.getAllByRole("option").map((opcao) => opcao.getAttribute("data-key"))).toEqual(["sm-9292"]);
  });

  it("falha: busca sem resultado mostra a mensagem e nada é escolhido", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Seletor onChange={onChange} />);

    await abrir(user);
    await user.type(await screen.findByRole("searchbox"), "iphone");

    expect(screen.getByRole("status")).toHaveTextContent("No models found");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("escolher com a busca ativa mantém os escolhidos que ela esconde", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Seletor onChange={onChange} />);

    await abrir(user);
    await user.click(await screen.findByRole("option", { name: "SM-9292 Galaxy S27 Ultra" }));
    await user.type(screen.getByRole("searchbox"), "tab");
    await user.click(screen.getByRole("option", { name: "Tab S11" }));

    expect(onChange).toHaveBeenLastCalledWith(["sm-9292", "tab-s11"]);
  });

  it("remover a última etiqueta devolve o foco ao botão", async () => {
    const user = userEvent.setup();
    render(<Seletor />);

    await abrir(user);
    await user.click(await screen.findByRole("option", { name: "Tab S11" }));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Remove Tab S11" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Device models" })).toHaveFocus());
  });

  it("um escolhido que saiu das opções continua com etiqueta e pode ser removido", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MultiSelectCombobox label="Device models" placeholder="Select models" options={options} value={["modelo-inativo"]} onValueChange={onChange} emptyLabel="No models found" removeLabel={(label) => `Remove ${label}`} />);

    await user.click(screen.getByRole("button", { name: "Remove modelo-inativo" }));

    expect(onChange).toHaveBeenCalledWith([]);
  });
});
