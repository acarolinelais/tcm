import type { CSSProperties, ReactNode } from "react";
import { Table } from "@heroui/react";

import type { ColunaExportacao } from "@/shared/lib/exportar-planilha";
import type { OpcoesExportacao } from "@/shared/lib/use-exportar-tabela";
import { cn } from "@/shared/lib/utils";
import { DataTableExport } from "@/shared/ui/data-table-export";

export interface DataTableColumn<T> {
  id: string;
  /** Conteúdo do cabeçalho: o rótulo ou um `DataTableFilter`. */
  header: ReactNode;
  cell: (item: T) => ReactNode;
  /** Coluna que identifica a linha para leitores de tela (a primeira, em geral). */
  isRowHeader?: boolean;
  className?: string;
  /** Título e valor da coluna na planilha (spec 035). Sem ele, a coluna não é exportada (ex.: ações). */
  exportar?: ColunaExportacao<T>;
}

interface DataTableProps<T extends object> {
  "aria-label": string;
  columns: DataTableColumn<T>[];
  items: T[];
  /** Chave de cada linha; por padrão, `item.id`. Evita copiar os itens só para ganhar um `id`. */
  getKey?: (item: T) => string;
  /** Carregando, erro ou vazio: aparece no corpo branco no lugar das linhas. */
  state?: ReactNode;
  /** A `DataTablePagination`, desenhada sobre a moldura, embaixo do corpo. */
  pagination?: ReactNode;
  /**
   * Estado de fora da linha de que as células dependem (permissões, membros, mutation em andamento). Sem ela, as
   * linhas redesenham a cada render da tela; com ela, só quando um desses valores muda.
   */
  rowDependencies?: readonly unknown[];
  /** Botão "Exportar" no rodapé (spec 035): exporta as colunas com `exportar`, da página (`items`) ou de todos os itens. */
  exportacao?: Pick<OpcoesExportacao<T>, "listagem" | "todosOsItens">;
  className?: string;
}

// Figma TCM 2070:1476: moldura `--panel` (raio 30px), corpo na superfície (raio 25px, 5px de recuo), cabeçalho
// Inter 500 14px `text-muted` com divisórias, linhas de 40px com divisória mais clara, texto 14px `text-body`.
const tokensMoldura = {
  "--surface-secondary": "var(--panel)",
  "--separator-tertiary": "var(--table-row-divider)",
} as CSSProperties;

// O corpo branco tem raio de 25px no topo e continua embaixo das linhas, então a última linha não arredonda.
const cantosCorpo = "bg-surface [&>tr:first-child>td:first-child]:rounded-ss-[25px] [&>tr:first-child>td:last-child]:rounded-se-[25px] [&>tr:last-child>td]:rounded-es-none [&>tr:last-child>td]:rounded-ee-none";

const chavePorId = (item: object) => (item as { id: string }).id;

/** Listagem do padrão da spec 022 sobre o `Table` do HeroUI. */
export function DataTable<T extends object>({ columns, items, getKey = chavePorId, state, pagination, rowDependencies, exportacao, className, "aria-label": ariaLabel }: DataTableProps<T>) {
  return (
    <Table
      variant="primary"
      style={tokensMoldura}
      className={cn("flex min-h-0 flex-1 flex-col rounded-[30px] px-[5px] pb-0", className)}
    >
      <Table.ScrollContainer className="thin-scroll flex min-h-0 flex-1 flex-col overflow-auto">
        {/* Tabela e corpo branco com a mesma largura: a da tabela quando ela passa da moldura (scroll horizontal). */}
        <div className="flex w-max min-w-full flex-1 flex-col">
          <Table.Content aria-label={ariaLabel} className="shrink-0">
            <Table.Header className="sticky top-0 z-10 bg-surface-secondary">
              {columns.map((coluna) => (
                <Table.Column key={coluna.id} id={coluna.id} isRowHeader={coluna.isRowHeader} className={cn("h-11 px-2.5 py-0 text-[14px] font-medium leading-5 text-muted first:ps-5 after:h-[21px] last:after:hidden", coluna.className)}>
                  {coluna.header}
                </Table.Column>
              ))}
            </Table.Header>
            {/* O React Aria guarda as linhas em cache pela identidade dos itens; as células dependem também de estado
                de fora da linha, declarado em `rowDependencies` (ou, na falta dele, as próprias colunas). */}
            <Table.Body items={items} dependencies={rowDependencies ?? [columns]} className={cantosCorpo}>
              {(item) => (
                <Table.Row id={getKey(item)} className="h-10">
                  {columns.map((coluna) => (
                    <Table.Cell key={coluna.id} className={cn("whitespace-nowrap px-2.5 py-0 text-[14px] leading-5 text-body first:ps-5", coluna.className)}>
                      {coluna.cell(item)}
                    </Table.Cell>
                  ))}
                </Table.Row>
              )}
            </Table.Body>
          </Table.Content>
          {/* Corpo branco até o fim da moldura: com poucas linhas, ou no lugar delas quando há um estado. */}
          <div className={cn("flex min-h-6 flex-1 flex-col rounded-b-[25px] bg-surface", !items.length && "rounded-t-[25px]")}>
            {state ? <div className="flex flex-1 items-center justify-center p-6 text-center text-[14px] text-muted">{state}</div> : null}
          </div>
        </div>
      </Table.ScrollContainer>
      {pagination || exportacao ? (
        <Table.Footer className="flex items-center p-0">
          {exportacao ? <DataTableExport {...exportacao} colunas={columns} itensPagina={items} className="ms-4 shrink-0" /> : null}
          <div className="min-w-0 flex-1">{pagination}</div>
        </Table.Footer>
      ) : <div className="h-[5px]" />}
    </Table>
  );
}
