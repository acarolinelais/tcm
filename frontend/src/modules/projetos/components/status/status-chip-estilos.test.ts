import { describe, expect, it } from "vitest";

import { STATUS_CASO_TESTE } from "../../model/projeto";
import { TONS_ETIQUETA } from "@/shared/ui/tag-chip";
import { statusChipTons } from "./status-chip-estilos";

describe("statusChipTons", () => {
  it("cobre todos os status com os tokens de cada tom", () => {
    expect(Object.keys(statusChipTons).sort()).toEqual([...STATUS_CASO_TESTE].sort());
    expect(statusChipTons.Done).toEqual({ fundo: "var(--etiqueta-ativo-bg)", texto: "var(--etiqueta-ativo-fg)" });
    expect(statusChipTons["To-Do"]).toEqual({ fundo: "var(--etiqueta-todo-bg)", texto: "var(--etiqueta-todo-fg)" });
    expect(statusChipTons.InFixes).toEqual({ fundo: "var(--etiqueta-fixes-bg)", texto: "var(--etiqueta-fixes-fg)" });
  });

  it("nenhum status usa o tom neutro da TC Situation", () => {
    expect(Object.values(statusChipTons)).not.toContainEqual(TONS_ETIQUETA.neutro);
  });
});
