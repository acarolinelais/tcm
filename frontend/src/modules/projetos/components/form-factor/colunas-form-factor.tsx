import type { TFunction } from "i18next";

import { comOpcaoTodos } from "@/shared/lib/opcoes";
import type { DataTableColumn } from "@/shared/ui/data-table";
import { DataTableFilter } from "@/shared/ui/data-table-filter";

import { OPCOES_RESULTADO, type ModeloFormFactor } from "../../model/projeto";
import { ResultadoFormFactor } from "./ResultadoFormFactor";

/**
 * Uma coluna por modelo do projeto, com o resultado de cada linha e o filtro PASS/FAIL no cabeçalho.
 * O filtro vale para um modelo por vez: `filtro.modeloId` diz qual. Com `aplicavel`, o modelo que não pertence ao
 * projeto da linha aparece como N/A (visões que juntam vários projetos).
 */
export function colunasPorModelo<T extends { resultados: Record<string, string> }>(
  t: TFunction,
  modelos: ModeloFormFactor[],
  filtro: { modeloId: string; resultado: string },
  onFiltroResultado: (modeloId: string, resultado: string) => void,
  aplicavel?: (linha: T, modeloId: string) => boolean,
): DataTableColumn<T>[] {
  return modelos.map((modelo) => ({
    id: `modelo-${modelo.id}`,
    header: <DataTableFilter label={modelo.nome} accessibleLabel={t("filterResultForModel", { model: modelo.nome })} value={filtro.modeloId === modelo.id ? filtro.resultado : ""} onChange={(valor) => onFiltroResultado(modelo.id, valor)} options={comOpcaoTodos(t("all"), OPCOES_RESULTADO)} />,
    cell: (linha: T) => {
      if (aplicavel && !aplicavel(linha, modelo.id)) return <span className="text-muted" aria-label={t("notApplicable")}>N/A</span>;
      const valor = linha.resultados[modelo.id];
      // O traço sozinho não diz nada ao leitor de tela: o rótulo explica que não houve resultado.
      return valor ? <ResultadoFormFactor valor={valor} /> : <span className="text-muted" aria-label={t("noResult")}>—</span>;
    },
  }));
}
