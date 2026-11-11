import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import i18n from "@/core/i18n";
import { SeloTentativa } from "./selo-tentativa";

describe("SeloTentativa (spec 073, RN-14)", () => {
  beforeEach(async () => { await i18n.changeLanguage("pt-BR"); });

  it("mostra o número da tentativa a partir da segunda", () => {
    render(<SeloTentativa tentativa={3} />);
    expect(screen.getByText("3ª correção")).toBeInTheDocument();
  });

  it("não mostra nada na primeira tentativa nem fora da correção", () => {
    const { container } = render(<><SeloTentativa tentativa={1} /><SeloTentativa tentativa={0} /></>);
    expect(container).toBeEmptyDOMElement();
  });
});
