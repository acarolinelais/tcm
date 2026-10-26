import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { semanaIso } from "@/shared/lib/utils";
import { WeekPickerHero } from "./week-picker-hero";

describe("WeekPickerHero", () => {
  it("escolher um dia seleciona a semana ISO dele", async () => {
    const onChange = vi.fn();
    render(<WeekPickerHero label="Week" value="2026-W13" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /^Week: / }));
    // 2026-W13 vai de 23 a 29 de março; o dia 25 continua na mesma semana.
    await userEvent.click(await screen.findByRole("button", { name: /March 25/ }));
    expect(onChange).toHaveBeenCalledWith("2026-W13");
  });

  it("'Esta semana' escolhe a semana atual e 'Limpar' remove o filtro", async () => {
    const onChange = vi.fn();
    render(<WeekPickerHero label="Week" value="" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /^Week: / }));
    await userEvent.click(await screen.findByRole("button", { name: "This week" }));
    expect(onChange).toHaveBeenLastCalledWith(semanaIso(new Date()));
    await userEvent.click(screen.getByRole("button", { name: /^Week: / }));
    await userEvent.click(await screen.findByRole("button", { name: "Clear filters" }));
    expect(onChange).toHaveBeenLastCalledWith("");
  });
});
