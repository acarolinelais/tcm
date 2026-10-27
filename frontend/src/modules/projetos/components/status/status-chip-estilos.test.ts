import { describe, expect, it } from "vitest";

import { STATUS_CASO_TESTE } from "../../model/projeto";
import { TONS_ETIQUETA } from "@/shared/ui/tag-chip";
import { statusChipTons } from "./status-chip-estilos";

describe("statusChipTons", () => {
  it("cobre todos os status com as cores do Figma", () => {
    expect(Object.keys(statusChipTons).sort()).toEqual([...STATUS_CASO_TESTE].sort());
    expect(statusChipTons.Pass).toEqual({ fundo: "#DCF7E8", texto: "#3C8355" });
    expect(statusChipTons["To-Do"]).toEqual({ fundo: "#EDFAFF", texto: "#5B8DD4" });
    expect(statusChipTons.Fail).toEqual({ fundo: "#FDEEEE", texto: "#C2474B" });
  });

  it("nenhum status usa o tom neutro da TC Situation", () => {
    expect(Object.values(statusChipTons)).not.toContainEqual(TONS_ETIQUETA.neutro);
  });
});
