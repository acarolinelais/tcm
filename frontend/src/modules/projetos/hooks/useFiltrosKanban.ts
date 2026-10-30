import { useMemo } from "react";
import { useSearchParams } from "react-router";

import type { KanbanCard, KanbanColuna } from "../model/projeto";

/**
 * Filtros do Kanban (spec 037, RN-11b a RN-11d), guardados na URL ao lado de outros parâmetros da tela (ex.: `aba`).
 * Cada filtro de caso compara um campo do card; o de Status escolhe colunas.
 */
const CAMPO_DO_FILTRO = { responsavel: "responsavel_id", category: "category", difficulty: "difficulty", situation: "situation" } as const satisfies Record<string, keyof KanbanCard>;
const CHAVES = ["status", ...Object.keys(CAMPO_DO_FILTRO)] as ChaveFiltroLista[];
export type ChaveFiltroLista = "status" | keyof typeof CAMPO_DO_FILTRO;
export type FiltrosKanban = Record<ChaveFiltroLista, string[]> & { tc: string };

export function useFiltrosKanban() {
  const [parametros, setParametros] = useSearchParams();
  // A URL em texto é a dependência estável: `parametros` muda de identidade a cada render.
  const busca = parametros.toString();
  const filtros = useMemo(() => {
    const atuais = new URLSearchParams(busca);
    return { ...Object.fromEntries(CHAVES.map((chave) => [chave, atuais.getAll(chave)])), tc: atuais.get("tc") ?? "" } as FiltrosKanban;
  }, [busca]);
  const alterar = (chave: ChaveFiltroLista | "tc", valores: string[]) => setParametros((atuais) => {
    const proximos = new URLSearchParams(atuais);
    proximos.delete(chave);
    valores.filter(Boolean).forEach((valor) => proximos.append(chave, valor));
    return proximos;
  }, { replace: true });
  const limpar = () => setParametros((atuais) => {
    const proximos = new URLSearchParams(atuais);
    [...CHAVES, "tc"].forEach((chave) => proximos.delete(chave));
    return proximos;
  }, { replace: true });
  const ativos = Boolean(filtros.tc) || CHAVES.some((chave) => filtros[chave].length > 0);
  return { filtros, alterar, limpar, ativos };
}

/** Aplica os filtros: o de Status escolhe as colunas; os outros escolhem os casos, e o total conta só eles. */
export function filtrarKanban(colunas: KanbanColuna[], filtros: FiltrosKanban): KanbanColuna[] {
  const tc = filtros.tc.trim().toLocaleLowerCase();
  const ativosNosCasos = Object.entries(CAMPO_DO_FILTRO).filter(([chave]) => filtros[chave as ChaveFiltroLista].length > 0);
  const passa = (card: KanbanCard) =>
    ativosNosCasos.every(([chave, campo]) => filtros[chave as ChaveFiltroLista].includes(String(card[campo])))
    && (!tc || card.tc_id.toLocaleLowerCase().includes(tc));
  const filtraCasos = Boolean(tc) || ativosNosCasos.length > 0;
  return colunas
    .filter((coluna) => !filtros.status.length || filtros.status.includes(coluna.status))
    .map((coluna) => {
      if (!filtraCasos) return coluna;
      const casos = coluna.casos.filter(passa);
      return { ...coluna, casos, total: casos.length };
    });
}
