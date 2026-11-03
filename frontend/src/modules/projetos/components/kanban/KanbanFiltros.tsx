import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { DataTableFilter, DataTableMultiFilter } from "@/shared/ui/data-table-filter";
import { FiltrosPopover } from "@/shared/ui/filtros-popover";
import {
  OPCOES_CATEGORIA,
  DIFICULDADES_CASO_TESTE,
  ORDEM_KANBAN,
  ROTULO_DIFICULDADE,
  ROTULO_SITUACAO,
  ROTULO_STATUS,
  SITUACOES_CASO_TESTE,
  opcoesRotuladas,
  type KanbanColuna,
} from "../../model/projeto";
import type { ChaveFiltroLista, FiltrosKanban } from "../../hooks/useFiltrosKanban";

/** Filtros do Board (spec 037) no botão Filter da spec 056. */
export function KanbanFiltros({ colunas, filtros, ativos, onAlterar, onLimpar }: {
  colunas: KanbanColuna[];
  filtros: FiltrosKanban;
  ativos: boolean;
  onAlterar: (chave: ChaveFiltroLista | "tc", valores: string[]) => void;
  onLimpar: () => void;
}) {
  const { t } = useTranslation();
  // Responsáveis que aparecem no projeto, em ordem alfabética.
  const responsaveis = [...new Map(colunas.flatMap((coluna) => coluna.casos).map((card) => [card.responsavel_id, card.responsavel_nome])).entries()]
    .sort(([, a], [, b]) => a.localeCompare(b))
    .map(([value, label]) => ({ value, label }));
  const quantos = Object.values(filtros).filter((valor) => (Array.isArray(valor) ? valor.length : valor)).length;

  return (
    <FiltrosPopover ativos={quantos} rotuloDoPainel={t("kanbanFilters")}>
      <DataTableFilter label={t("tcId")} value={filtros.tc} onChange={(valor) => onAlterar("tc", [valor])} />
      <DataTableMultiFilter label={t("assignee")} values={filtros.responsavel} options={responsaveis} searchable onChange={(valores) => onAlterar("responsavel", valores)} />
      <DataTableMultiFilter label={t("status")} values={filtros.status} options={opcoesRotuladas(ORDEM_KANBAN, ROTULO_STATUS, t)} onChange={(valores) => onAlterar("status", valores)} />
      <DataTableMultiFilter label={t("category")} values={filtros.category} options={OPCOES_CATEGORIA} onChange={(valores) => onAlterar("category", valores)} />
      <DataTableMultiFilter label={t("difficulty")} values={filtros.difficulty} options={opcoesRotuladas(DIFICULDADES_CASO_TESTE, ROTULO_DIFICULDADE, t)} onChange={(valores) => onAlterar("difficulty", valores)} />
      <DataTableMultiFilter label={t("tcSituation")} values={filtros.situation} options={opcoesRotuladas(SITUACOES_CASO_TESTE, ROTULO_SITUACAO, t)} onChange={(valores) => onAlterar("situation", valores)} />
      {ativos && <Button variant="ghost" size="sm" onPress={onLimpar} className="mt-1 justify-self-start text-accent-text">{t("clearFilters")}</Button>}
    </FiltrosPopover>
  );
}
