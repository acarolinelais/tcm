import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RowActions } from "./row-action-button";

describe("RowActions", () => {
  it("cada ação vira um botão com o nome '<ação> <identificador>' e dispara onPress", async () => {
    const transferir = vi.fn();
    render(<RowActions identificador="Clock_000001" actions={[{ label: "Transfer to backup", icon: <span />, onPress: transferir }]} />);
    await userEvent.click(screen.getByRole("button", { name: "Transfer to backup Clock_000001" }));
    expect(transferir).toHaveBeenCalledTimes(1);
  });

  it("põe as destrutivas por último e não dispara ação desabilitada", async () => {
    const inativar = vi.fn();
    render(<RowActions identificador="SDF" actions={[
      { label: "Inactivate", icon: <span />, onPress: inativar, destructive: true, disabled: true },
      { label: "View team", icon: <span />, onPress: vi.fn() },
    ]} />);
    const botoes = screen.getAllByRole("button");
    expect(botoes.map((b) => b.getAttribute("aria-label"))).toEqual(["View team SDF", "Inactivate SDF"]);
    await userEvent.click(botoes[1]);
    expect(inativar).not.toHaveBeenCalled();
  });
});
