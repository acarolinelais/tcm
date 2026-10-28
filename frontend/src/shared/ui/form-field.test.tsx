import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SelectField, TextInputField, type SelectOption } from "./form-field";

const gerentes: SelectOption[] = [
  { value: "ivan", label: "Ivan Moreira" },
  { value: "kaique", label: "Kaique Pereira" },
  { value: "rafael", label: "Rafael Lima", isDisabled: true },
];

function Gerente({ inicial = "", onChange = vi.fn() }: { inicial?: string; onChange?: (valor: string) => void }) {
  const [valor, setValor] = useState(inicial);
  return <SelectField label="Manager" value={valor} onChange={(novo) => { setValor(novo); onChange(novo); }} options={gerentes} emptyOption="Unassigned" description="Only active managers." />;
}

describe("SelectField", () => {
  it("mostra a opção \"nenhum\" marcada quando o valor é vazio e devolve \"\" ao escolhê-la", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Gerente inicial="ivan" onChange={onChange} />);

    expect(screen.getByRole("button", { name: /Manager/ })).toHaveTextContent("Ivan Moreira");
    expect(screen.getByText("Only active managers.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Manager/ }));
    const opcoes = await screen.findAllByRole("option");
    expect(opcoes.map((opcao) => opcao.textContent)).toEqual(["Unassigned", "Ivan Moreira", "Kaique Pereira", "Rafael Lima"]);
    await user.click(screen.getByRole("option", { name: "Unassigned" }));

    expect(onChange).toHaveBeenLastCalledWith("");
    expect(screen.getByRole("button", { name: /Manager/ })).toHaveTextContent("Unassigned");
  });

  it("escolhe pelo teclado, e o Esc fecha só a lista", async () => {
    const onChange = vi.fn();
    const onEscPainel = vi.fn();
    const user = userEvent.setup();
    render(<div onKeyDown={(evento) => { if (evento.key === "Escape") onEscPainel(); }}><Gerente onChange={onChange} /></div>);

    screen.getByRole("button", { name: /Manager/ }).focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(onEscPainel).not.toHaveBeenCalled();

    await user.keyboard("{Enter}");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith(expect.stringMatching(/^(ivan|kaique)$/));
  });

  it("mostra a opção indisponível, mas não deixa escolhê-la", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Gerente onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Manager/ }));
    const indisponivel = await screen.findByRole("option", { name: "Rafael Lima" });
    expect(indisponivel).toHaveAttribute("aria-disabled", "true");
    await user.click(indisponivel);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("mostra o erro no lugar da dica", () => {
    render(<SelectField label="Team" value="" onChange={vi.fn()} options={gerentes} description="Pick one." error="Required field." />);

    expect(screen.getByText("Required field.")).toBeInTheDocument();
    expect(screen.queryByText("Pick one.")).not.toBeInTheDocument();
  });
});

describe("TextInputField", () => {
  it("repassa type, name e autoComplete ao campo", () => {
    render(<TextInputField label="Email" value="" type="email" name="email" autoComplete="email" />);

    const campo = screen.getByRole("textbox", { name: "Email" });
    expect(campo).toHaveAttribute("type", "email");
    expect(campo).toHaveAttribute("name", "email");
    expect(campo).toHaveAttribute("autocomplete", "email");
  });
});
