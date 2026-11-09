import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TcIdBotao } from "./TcIdBotao";

describe("TcIdBotao", () => {
  it("parece link, avisa que abre um painel e abre o caso pelo clique e pelo Enter", async () => {
    const onAbrir = vi.fn();
    const user = userEvent.setup();
    render(<TcIdBotao caso={{ id: "case-1", tc_id: "clock_000001" }} onAbrir={onAbrir} />);

    const botao = screen.getByRole("button", { name: "clock_000001" });
    expect(botao).toHaveAttribute("aria-haspopup", "dialog");
    await user.click(botao);
    botao.focus();
    await user.keyboard("{Enter}");

    expect(onAbrir).toHaveBeenCalledTimes(2);
    expect(onAbrir).toHaveBeenCalledWith({ id: "case-1", tc_id: "clock_000001" });
  });
});
