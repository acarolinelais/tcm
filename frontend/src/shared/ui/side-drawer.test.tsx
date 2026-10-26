import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SideDrawer } from "./side-drawer";

describe("SideDrawer", () => {
  it("mostra título, conteúdo e rodapé", () => {
    render(<SideDrawer isOpen onOpenChange={vi.fn()} title="New team" subtitle="4 members" footer={<button type="button">Save</button>}><p>Body</p></SideDrawer>);
    expect(screen.getByRole("dialog", { name: "New team" })).toBeInTheDocument();
    expect(screen.getByText("4 members")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("Esc fecha", async () => {
    const onOpenChange = vi.fn();
    render(<SideDrawer isOpen onOpenChange={onOpenChange} title="New team"><p>Body</p></SideDrawer>);
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("fechado, não renderiza nada", () => {
    render(<SideDrawer isOpen={false} onOpenChange={vi.fn()} title="New team"><p>Body</p></SideDrawer>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
