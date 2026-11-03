import { Button, Popover } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { DataTableFilter, DataTableMultiFilter } from "@/shared/ui/data-table-filter";
import { FilterIcon } from "@/shared/ui/figma-icons";
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

/** Botão Filter do Board (spec 056): abre os filtros da spec 037 num painel. O contador mostra quantos estão ativos. */
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
    <Popover>
      <Button
        variant="outline"
        className="h-9 min-h-0 gap-2 rounded-full border border-edge bg-surface px-4 text-[15px] font-medium leading-[21px] text-body shadow-none hover:bg-page data-[focus-visible]:ring-2 data-[focus-visible]:ring-focus"
      >
        <FilterIcon />
        {t("filterButton")}
        {ativos && (
          <span className="rounded-full bg-accent-tint px-1.5 text-[12px] leading-[18px] text-accent-text">
            <span aria-hidden="true">{quantos}</span>
            <span className="sr-only">{t("kanbanActiveFilters", { count: quantos })}</span>
          </span>
        )}
      </Button>
      <Popover.Content placement="bottom end" className="w-[min(16rem,calc(100vw-1rem))] p-3">
        <Popover.Dialog aria-label={t("kanbanFilters")} className="grid gap-1 outline-none">
          <DataTableFilter label={t("tcId")} value={filtros.tc} onChange={(valor) => onAlterar("tc", [valor])} />
          <DataTableMultiFilter label={t("assignee")} values={filtros.responsavel} options={responsaveis} searchable onChange={(valores) => onAlterar("responsavel", valores)} />
          <DataTableMultiFilter label={t("status")} values={filtros.status} options={opcoesRotuladas(ORDEM_KANBAN, ROTULO_STATUS, t)} onChange={(valores) => onAlterar("status", valores)} />
          <DataTableMultiFilter label={t("category")} values={filtros.category} options={OPCOES_CATEGORIA} onChange={(valores) => onAlterar("category", valores)} />
          <DataTableMultiFilter label={t("difficulty")} values={filtros.difficulty} options={opcoesRotuladas(DIFICULDADES_CASO_TESTE, ROTULO_DIFICULDADE, t)} onChange={(valores) => onAlterar("difficulty", valores)} />
          <DataTableMultiFilter label={t("tcSituation")} values={filtros.situation} options={opcoesRotuladas(SITUACOES_CASO_TESTE, ROTULO_SITUACAO, t)} onChange={(valores) => onAlterar("situation", valores)} />
          {ativos && <Button variant="ghost" size="sm" onPress={onLimpar} className="mt-1 justify-self-start text-accent-text">{t("clearFilters")}</Button>}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
