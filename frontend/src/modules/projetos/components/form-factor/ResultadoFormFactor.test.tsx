import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResultadoFormFactor } from "./ResultadoFormFactor";

const fundo = (texto: string) => screen.getByText(texto).closest<HTMLElement>(".chip")?.style.getPropertyValue("--chip-bg");

describe("ResultadoFormFactor", () => {
  it("PASS e FAIL têm cores próprias, e os outros valores do SDF ganham a etiqueta neutra", () => {
    render(<><ResultadoFormFactor valor="PASS" /><ResultadoFormFactor valor="FAIL" /><ResultadoFormFactor valor="N/A" /><ResultadoFormFactor valor="check" /></>);

    expect(fundo("N/A")).toBe("var(--etiqueta-neutro-bg)");
    expect(fundo("check")).toBe("var(--etiqueta-neutro-bg)");
    expect(new Set(["PASS", "FAIL", "N/A"].map(fundo)).size).toBe(3);
  });

  it("falha: sem resultado, mostra o traço e nenhuma etiqueta", () => {
    const { container } = render(<ResultadoFormFactor valor={undefined} />);

    expect(screen.getByText("—")).toHaveClass("text-muted");
    expect(container.querySelector(".chip")).toBeNull();
  });
});
