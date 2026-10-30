import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CorAvatar } from "@/core/auth/api";
import { AvatarUsuario } from "./avatar-usuario";

const ESFERAS = "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars";

function avatar(cor: CorAvatar) {
  const { container } = render(<AvatarUsuario cor={cor} />);
  return container.firstElementChild as HTMLElement;
}

// O jsdom não carrega imagens: simula uma que já terminou de carregar.
function simularImagemCarregada() {
  vi.stubGlobal("Image", class {
    complete = true;
    naturalWidth = 160;
    src = "";
    crossOrigin: string | null = null;
    addEventListener() {}
    removeEventListener() {}
  });
}

describe("AvatarUsuario", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("mostra a esfera do HeroUI da cor escolhida, decorativa e sem texto", async () => {
    simularImagemCarregada();
    const elemento = avatar("verde");

    await waitFor(() => expect(elemento.querySelector("img")).toHaveAttribute("src", `${ESFERAS}/green.jpg`));
    expect(elemento).toHaveAttribute("aria-hidden", "true");
    expect(elemento).toHaveTextContent("");
  });

  it.each([["cinza", "black"], ["cinza-claro", "white"]] as const)("%s usa a esfera %s", async (cor, esfera) => {
    simularImagemCarregada();
    const elemento = avatar(cor);

    await waitFor(() => expect(elemento.querySelector("img")).toHaveAttribute("src", `${ESFERAS}/${esfera}.jpg`));
  });

  it("se a esfera não carrega, mostra a cor lisa do token", async () => {
    const elemento = avatar("verde");

    await waitFor(() => expect(elemento.querySelector("[data-slot='avatar-fallback']")).toHaveClass("bg-avatar-6"));
  });

  it("com uma cor desconhecida (dado antigo), cai no azul", async () => {
    simularImagemCarregada();
    const elemento = avatar("dourado" as CorAvatar);

    await waitFor(() => expect(elemento.querySelector("img")).toHaveAttribute("src", `${ESFERAS}/blue.jpg`));
  });
});
