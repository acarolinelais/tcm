import { Button, Dropdown } from "@heroui/react";
import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useExportarTabela, type OpcoesExportacao } from "@/shared/lib/use-exportar-tabela";
import { cn } from "@/shared/lib/utils";

/** Botão "Exportar" do rodapé da tabela, com a página atual ou todos os itens (spec 035, ADR 0042). */
export function DataTableExport<T>({ className, ...opcoes }: OpcoesExportacao<T> & { className?: string }) {
  const { t } = useTranslation();
  const { disponivel, exportando, exportarPagina, exportarTodos } = useExportarTabela(opcoes);

  return (
    <Dropdown>
      {/* Mesmo tamanho e texto dos controles da paginação ao lado (Inter 500 12px). */}
      <Button variant="ghost" size="sm" isDisabled={!disponivel || exportando} aria-busy={exportando} className={cn("h-[26px] min-h-0 gap-1.5 rounded-full px-2.5 text-[12px] font-medium leading-[17px] text-body hover:bg-default/60", className)}>
        <Download aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5" />{t(exportando ? "exporting" : "export")}
      </Button>
      <Dropdown.Popover placement="top start" className="min-w-44">
        <Dropdown.Menu aria-label={t("export")} onAction={(id) => void (id === "todos" ? exportarTodos() : exportarPagina())}>
          <Dropdown.Item id="pagina" textValue={t("exportCurrentPage")} className="text-[14px]">{t("exportCurrentPage")}</Dropdown.Item>
          <Dropdown.Item id="todos" textValue={t("exportAllItems")} className="text-[14px]">{t("exportAllItems")}</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
