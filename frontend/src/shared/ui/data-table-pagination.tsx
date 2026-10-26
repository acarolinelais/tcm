import { ListBox, Pagination, Select } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { TABLE_PAGE_SIZE_OPTIONS, paginasVisiveis } from "@/shared/lib/paginacao";
import { cn } from "@/shared/lib/utils";
import { EditableChevronIcon, PageChevronIcon } from "@/shared/ui/figma-icons";

interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  pageSizeOptions?: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
}

// Figma (TCM 2070:1476): total à esquerda; "Prev", números e "Next" à direita; Inter 500 12px.
const botaoPagina = "inline-flex h-[26px] min-w-[26px] items-center justify-center gap-1.5 rounded-full px-1.5 text-[12px] font-medium leading-[17px] text-[#454442] outline-none transition-colors hover:bg-[#EBEBEC]/60 data-[disabled]:cursor-not-allowed data-[disabled]:text-[#909092] data-[disabled]:hover:bg-transparent data-[focus-visible]:ring-2 data-[focus-visible]:ring-focus";

export function DataTablePagination({
  page,
  pageSize,
  totalCount,
  pageSizeOptions = TABLE_PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
  className,
}: DataTablePaginationProps) {
  const { t } = useTranslation();
  const totalPaginas = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className={cn("flex w-full shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3", className)}>
      <div className="flex items-center gap-3 text-[12px] font-medium leading-[17px] text-[#909092]">
        <span aria-live="polite">{t("totalItems", { count: totalCount })}</span>
        <Select aria-label={t("pageSize")} value={pageSize} onChange={(valor) => { if (valor !== null) onPageSizeChange(Number(valor)); }} className="w-auto">
          <Select.Trigger className="h-[22px] min-h-0 items-center gap-1 rounded-full border-0 bg-transparent px-1.5 py-0 pe-1.5 text-[12px] font-medium text-[#909092] shadow-none hover:bg-[#EBEBEC]/60">
            <Select.Value className="leading-[17px]" />
            <Select.Indicator className="static my-0"><EditableChevronIcon className="text-[#909092]" /></Select.Indicator>
          </Select.Trigger>
          <Select.Popover className="min-w-20">
            <ListBox>
              {pageSizeOptions.map((opcao) => (
                <ListBox.Item key={opcao} id={opcao} textValue={String(opcao)} className="text-[12px]">{opcao}</ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
      <Pagination aria-label={t("paginationLabel")} className="w-auto">
        <Pagination.Content className="gap-1">
          <Pagination.Item>
            <Pagination.Previous className={botaoPagina} isDisabled={page <= 1} onPress={() => onPageChange(page - 1)} aria-label={t("previousPage")}>
              <PageChevronIcon direcao="anterior" />
              <span>{t("previousShort")}</span>
            </Pagination.Previous>
          </Pagination.Item>
          {paginasVisiveis(page, totalPaginas).map((item, indice) => (
            <Pagination.Item key={item === "reticencias" ? `reticencias-${indice}` : item}>
              {item === "reticencias" ? <Pagination.Ellipsis className="text-[12px] text-[#909092]" /> : (
                <Pagination.Link
                  isActive={item === page}
                  aria-label={t("goToPage", { page: item })}
                  onPress={() => onPageChange(item)}
                  className={cn(botaoPagina, "tabular-nums", item === page && "bg-[#EBEBEC] hover:bg-[#EBEBEC]")}
                >
                  {item}
                </Pagination.Link>
              )}
            </Pagination.Item>
          ))}
          <Pagination.Item>
            <Pagination.Next className={botaoPagina} isDisabled={page >= totalPaginas} onPress={() => onPageChange(page + 1)} aria-label={t("nextPage")}>
              <span>{t("nextShort")}</span>
              <PageChevronIcon direcao="proxima" />
            </Pagination.Next>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
    </div>
  );
}
