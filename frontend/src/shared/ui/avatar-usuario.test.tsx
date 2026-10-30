import { render, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CorAvatar } from "@/core/auth/api";
import { AvatarUsuario } from "./avatar-usuario";

function avatar(nome: string, cor: CorAvatar) {
  const { container } = render(<AvatarUsuario nome={nome} cor={cor} />);
  return container.firstElementChild as HTMLElement;
}

describe("AvatarUsuario", () => {
  it("mostra as iniciais sobre a cor escolhida, sem imagem e escondido do leitor de tela", async () => {
    const elemento = avatar("Ana Lais", "verde");

    expect(await within(elemento).findByText("AL")).toHaveClass("bg-avatar-7", "text-avatar-7-foreground");
    expect(elemento.querySelector("img")).toBeNull();
    expect(elemento).toHaveAttribute("aria-hidden", "true");
  });

  it("com uma cor desconhecida (dado antigo), cai no azul em vez de ficar sem fundo", async () => {
    const elemento = avatar("Ana Lais", "dourado" as CorAvatar);

    expect(await within(elemento).findByText("AL")).toHaveClass("bg-avatar-1");
  });

  it("com o nome vazio, mostra o ícone genérico de pessoa", async () => {
    const elemento = avatar("   ", "azul");

    await waitFor(() => expect(elemento.querySelector("svg.lucide-user-round")).not.toBeNull());
  });
});
