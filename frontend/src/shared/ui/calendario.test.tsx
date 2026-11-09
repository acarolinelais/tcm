import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/core/i18n";
import { semanaIso } from "@/shared/lib/utils";
import { Calendario, type ModoCalendario } from "./calendario";

// Spec 050: começou como a prova da T16 sobre o react-day-picker (opção b do plan) e agora roda sobre o componente.
// Dezembro de 2025 começa numa segunda: a primeira linha é a semana 49 e a última, a 1 de 2026.

function renderizar(modo: ModoCalendario, valor = "2025-12-10") {
  const onEscolher = vi.fn();
  render(<Calendario modo={modo} valor={valor} onEscolher={onEscolher} />);
  return onEscolher;
}

describe("Calendario (spec 050)", () => {
  beforeEach(() => i18n.changeLanguage("en"));
  afterEach(() => i18n.changeLanguage("en"));

  it("mostra a coluna de semanas nos modos com semana", () => {
    renderizar("dia-ou-semana");
    expect(screen.getAllByRole("button", { name: /^Week \d+, \d{4}$/ }).map((botao) => botao.textContent)).toEqual(["49", "50", "51", "52", "1"]);
  });

  it("no modo dia, não há números de semana e o dia escolhe o dia", async () => {
    const onEscolher = renderizar("dia");

    expect(screen.queryByRole("button", { name: /^Week / })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /December 29th, 2025/ }));
    expect(onEscolher).toHaveBeenCalledWith("2025-12-29");
  });

  it("clicar no número escolhe a semana, e 29/12/2025 é a semana 1 de 2026 (falha se virar a 53 de 2025)", async () => {
    const onEscolher = renderizar("dia-ou-semana");

    await userEvent.click(screen.getByRole("button", { name: "Week 1, 2026" }));

    expect(onEscolher).toHaveBeenCalledWith("2026-W01");
    expect(semanaIso(new Date(2025, 11, 29))).toBe("2026-W01");
    expect(semanaIso(new Date(2025, 11, 28))).toBe("2025-W52");
  });

  it("no modo dia ou semana, o dia escolhe o dia", async () => {
    const diaOuSemana = renderizar("dia-ou-semana");
    await userEvent.click(screen.getByRole("button", { name: /December 29th, 2025/ }));
    expect(diaOuSemana).toHaveBeenCalledWith("2025-12-29");
  });

  it("no modo semana, clicar num dia escolhe a semana ISO dele", async () => {
    const semana = renderizar("semana", "2025-W50");
    await userEvent.click(screen.getByRole("button", { name: /December 29th, 2025/ }));
    expect(semana).toHaveBeenCalledWith("2026-W01");
  });

  it("o dia escolhido fica marcado como selecionado para leitores de tela", () => {
    renderizar("dia", "2025-12-10");
    expect(screen.getByRole("gridcell", { name: "10" })).toHaveAttribute("aria-selected", "true");
  });

  it("as setas levam o foco de um dia para o outro e Enter escolhe", async () => {
    const onEscolher = renderizar("dia");
    const user = userEvent.setup();
    screen.getByRole("button", { name: /December 10th, 2025/ }).focus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: /December 11th, 2025/ })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: /December 18th, 2025/ })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onEscolher).toHaveBeenCalledWith("2025-12-18");
  });

  it.each([["pt-BR", /dezembro/i], ["ko", /12월/]] as const)("mostra o mês no idioma da pessoa (%s)", async (idioma, mes) => {
    await i18n.changeLanguage(idioma);
    renderizar("dia-ou-semana");

    expect(screen.getByRole("grid")).toHaveAccessibleName(mes);
  });
});
