import type { TFunction } from "i18next";

import { comOpcaoTodos } from "@/shared/lib/opcoes";
import type { DataTableColumn } from "@/shared/ui/data-table";
import { DataTableFilter } from "@/shared/ui/data-table-filter";

import { OPCOES_RESULTADO, type ModeloFormFactor } from "../../model/projeto";
import { ResultadoFormFactor } from "./ResultadoFormFactor";

/** SDF ID da linha, ou traço quando a execução não veio de um SDF. */
export const rotuloSdf = (linha: { sdf_id: string | null }) => linha.sdf_id ?? "—";

/** Identificador do responsável da linha, como nas duas tabelas de Form Factor. */
export const rotuloAssignee = (identificadoresMembros: Record<string, string>) => (linha: { responsavel_id: string }) => identificadoresMembros[linha.responsavel_id] ?? "—";

/**
 * Uma coluna por modelo do projeto, com o resultado de cada linha e o filtro PASS/FAIL no cabeçalho.
 * O filtro vale para um modelo por vez: `filtro.modeloId` diz qual.
 */
export function colunasPorModelo<T extends { resultados: Record<string, string> }>(
  t: TFunction,
  modelos: ModeloFormFactor[],
  filtro: { modeloId: string; resultado: string },
  onFiltroResultado: (modeloId: string, resultado: string) => void,
): DataTableColumn<T>[] {
  return modelos.map((modelo) => ({
    id: `modelo-${modelo.id}`,
    exportar: { titulo: modelo.nome, valor: (linha: T) => linha.resultados[modelo.id] || "—" },
    header: <DataTableFilter label={modelo.nome} accessibleLabel={t("filterResultForModel", { model: modelo.nome })} value={filtro.modeloId === modelo.id ? filtro.resultado : ""} onChange={(valor) => onFiltroResultado(modelo.id, valor)} options={comOpcaoTodos(t("all"), OPCOES_RESULTADO)} />,
    cell: (linha: T) => {
      const valor = linha.resultados[modelo.id];
      // O traço sozinho não diz nada ao leitor de tela: o rótulo explica que não houve resultado.
      return valor ? <ResultadoFormFactor valor={valor} /> : <span className="text-muted" aria-label={t("noResult")}>—</span>;
    },
  }));
}
