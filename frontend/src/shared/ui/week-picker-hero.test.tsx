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

  it("com permitirDia, o dia escolhe o dia e o número da semana escolhe a semana (spec 032)", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<WeekPickerHero label="Day or week" value="2026-03-25" onChange={onChange} permitirDia />);
    expect(screen.getByRole("button", { name: /^Day or week: Mar 25, 2026/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Day or week: / }));
    await userEvent.click(await screen.findByRole("button", { name: /March 24/ }));
    expect(onChange).toHaveBeenLastCalledWith("2026-03-24");

    rerender(<WeekPickerHero label="Day or week" value="2026-W12" onChange={onChange} permitirDia />);
    await userEvent.click(screen.getByRole("button", { name: /^Day or week: / }));
    await userEvent.click(await screen.findByRole("button", { name: "Week 13, 2026" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-W13");
  });
});
