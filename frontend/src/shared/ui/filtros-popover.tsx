import type { ReactNode } from "react";
import { Button, Popover } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { FilterIcon } from "@/shared/ui/figma-icons";

/**
 * Botão Filter do protótipo (specs 056 e 057): pílula com o ícone e, havendo filtro, o número de ativos. Os filtros
 * ficam no painel (`children`). O número é só visual; o leitor de tela ouve "N active" no nome do botão.
 */
export function FiltrosPopover({ ativos, rotuloDoPainel, children }: { ativos: number; rotuloDoPainel: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <Popover>
      <Button
        variant="outline"
        className="h-9 min-h-0 gap-2 rounded-full border border-edge bg-surface px-4 text-[15px] font-medium leading-[21px] text-body shadow-none hover:bg-page data-[focus-visible]:ring-2 data-[focus-visible]:ring-focus"
      >
        <FilterIcon />
        {t("filterButton")}
        {ativos > 0 && (
          <span className="rounded-full bg-accent-tint px-1.5 text-[12px] leading-[18px] text-accent-text">
            <span aria-hidden="true">{ativos}</span>
            <span className="sr-only">{t("activeFilters", { count: ativos })}</span>
          </span>
        )}
      </Button>
      <Popover.Content placement="bottom end" className="w-[min(16rem,calc(100vw-1rem))] p-3">
        <Popover.Dialog aria-label={rotuloDoPainel} className="grid gap-1 outline-none">{children}</Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
