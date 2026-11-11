import type { FalhaSdf } from "../../model/projeto";

/** As falhas por tentativa, da mais nova para a mais antiga; as de antes da correção (0) ou da spec 073 (nulas) contam como a 1. */
export function agruparPorTentativa(falhas: FalhaSdf[]): [number, FalhaSdf[]][] {
  const grupos = new Map<number, FalhaSdf[]>();
  for (const falha of falhas) {
    const tentativa = falha.tentativa || 1;
    grupos.set(tentativa, [...(grupos.get(tentativa) ?? []), falha]);
  }
  return [...grupos].sort(([a], [b]) => b - a);
}
