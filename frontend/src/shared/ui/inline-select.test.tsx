import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { InlineSelect } from "./inline-select";

const opcoes = [{ value: "Low", label: "Low" }, { value: "High", label: "High" }];

describe("InlineSelect", () => {
  it("grava ao escolher outro valor", async () => {
    const onChange = vi.fn();
    render(<InlineSelect aria-label="Difficulty Clock_000001" value="Low" options={opcoes} onChange={onChange}>Low</InlineSelect>);
    await userEvent.click(screen.getByRole("button", { name: /Difficulty Clock_000001/ }));
    await userEvent.click(await screen.findByRole("option", { name: "High" }));
    expect(onChange).toHaveBeenCalledWith("High");
  });

  it("escolher o mesmo valor não grava", async () => {
    const onChange = vi.fn();
    render(<InlineSelect aria-label="Difficulty Clock_000001" value="Low" options={opcoes} onChange={onChange}>Low</InlineSelect>);
    await userEvent.click(screen.getByRole("button", { name: /Difficulty Clock_000001/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Low" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
