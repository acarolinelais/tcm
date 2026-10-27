import { useId, type CSSProperties, type ReactNode } from "react";
import { Checkbox, Table, Tooltip } from "@heroui/react";
import type { Selection } from "react-aria-components";

import { cn } from "@/shared/lib/utils";

export interface DataTableColumn<T> {
  id: string;
  /** Conteúdo do cabeçalho: o rótulo ou um `DataTableFilter`. */
  header: ReactNode;
  cell: (item: T) => ReactNode;
  /** Coluna que identifica a linha para leitores de tela (a primeira, em geral). */
  isRowHeader?: boolean;
  className?: string;
}

export interface DataTableSelection<T> {
  selectedKeys: ReadonlySet<string>;
  onChange: (keys: Set<string>) => void;
  /** Verbo da caixa da linha ("Selecionar"); o React Aria junta o texto da coluna `isRowHeader` ao nome. */
  rowLabel: string;
  selectAllLabel: string;
  /** Motivo de a linha não ser selecionável; `undefined` quando pode ser selecionada. */
  disabledReason?: (item: T) => string | undefined;
}

interface DataTableProps<T extends object> {
  "aria-label": string;
  columns: DataTableColumn<T>[];
  items: T[];
  /** Chave de cada linha; por padrão, `item.id`. Evita copiar os itens só para ganhar um `id`. */
  getKey?: (item: T) => string;
  selection?: DataTableSelection<T>;
  /** Carregando, erro ou vazio: aparece no corpo branco no lugar das linhas. */
  state?: ReactNode;
  /** A `DataTablePagination`, desenhada sobre a moldura, embaixo do corpo. */
  pagination?: ReactNode;
  /**
   * Estado de fora da linha de que as células dependem (permissões, membros, mutation em andamento). Sem ela, as
   * linhas redesenham a cada render da tela; com ela, só quando um desses valores muda.
   */
  rowDependencies?: readonly unknown[];
  className?: string;
}

// Figma TCM 2070:1476: moldura #F3F5F7 (raio 30px), corpo branco (raio 25px, 5px de recuo), cabeçalho
// Inter 500 14px `text-muted` com divisórias #E4E4E7, linhas de 40px com divisória #EFEFF0, texto 14px #454442.
const tokensMoldura = {
  "--surface-secondary": "#F3F5F7",
  "--separator": "#E4E4E7",
  "--separator-tertiary": "#EFEFF0",
} as CSSProperties;

// O corpo branco tem raio de 25px no topo e continua embaixo das linhas, então a última linha não arredonda.
const cantosCorpo = "bg-white [&>tr:first-child>td:first-child]:rounded-ss-[25px] [&>tr:first-child>td:last-child]:rounded-se-[25px] [&>tr:last-child>td]:rounded-es-none [&>tr:last-child>td]:rounded-ee-none";

function CaixaSelecao({ label, describedBy, className }: { label: string; describedBy?: string; className?: string }) {
  return (
    <Checkbox slot="selection" aria-label={label} aria-describedby={describedBy} className="flex">
      <Checkbox.Content>
        <Checkbox.Control className={cn("size-3.5 rounded-[3px] border-0 bg-surface-secondary", className)}><Checkbox.Indicator /></Checkbox.Control>
      </Checkbox.Content>
    </Checkbox>
  );
}

/**
 * Listagem do padrão da spec 022 sobre o `Table` do HeroUI. A seleção é do dono da tela: ele a zera ao trocar
 * de página, filtro ou aba (RN-10); aqui só valem as chaves das linhas visíveis.
 */
const chavePorId = (item: object) => (item as { id: string }).id;

export function DataTable<T extends object>({ columns, items, getKey = chavePorId, selection, state, pagination, rowDependencies, className, "aria-label": ariaLabel }: DataTableProps<T>) {
  const prefixoId = useId();
  const motivos = new Map<string, string>();
  if (selection?.disabledReason) {
    for (const item of items) {
      const motivo = selection.disabledReason(item);
      if (motivo) motivos.set(getKey(item), motivo);
    }
  }
  const selecionaveis = selection ? items.map(getKey).filter((chave) => !motivos.has(chave)) : [];
  const comSelecao = selecionaveis.length > 0;

  function aoSelecionar(keys: Selection) {
    selection?.onChange(keys === "all" ? new Set(selecionaveis) : new Set([...keys].map(String)));
  }

  return (
    <Table
      variant="primary"
      style={tokensMoldura}
      className={cn("flex min-h-0 flex-1 flex-col rounded-[30px] px-[5px] pb-0", className)}
    >
      <Table.ScrollContainer className="thin-scroll flex min-h-0 flex-1 flex-col overflow-auto">
        {/* Tabela e corpo branco com a mesma largura: a da tabela quando ela passa da moldura (scroll horizontal). */}
        <div className="flex w-max min-w-full flex-1 flex-col">
          <Table.Content
            aria-label={ariaLabel}
            selectionMode={comSelecao ? "multiple" : "none"}
            selectionBehavior="toggle"
            selectedKeys={comSelecao ? new Set(selecionaveis.filter((id) => selection!.selectedKeys.has(id))) : undefined}
            onSelectionChange={aoSelecionar}
            disabledKeys={[...motivos.keys()]}
            disabledBehavior="selection"
            className="shrink-0"
          >
            <Table.Header className="sticky top-0 z-10 bg-surface-secondary">
              {comSelecao ? (
                <Table.Column className="w-10 px-0 ps-4 after:hidden">
                  <CaixaSelecao label={selection!.selectAllLabel} className="bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]" />
                </Table.Column>
              ) : null}
              {columns.map((coluna) => (
                <Table.Column key={coluna.id} id={coluna.id} isRowHeader={coluna.isRowHeader} className={cn("h-11 px-2.5 py-0 text-[14px] font-medium leading-5 text-muted first:ps-5 after:h-[21px] last:after:hidden", coluna.className)}>
                  {coluna.header}
                </Table.Column>
              ))}
            </Table.Header>
            {/* O React Aria guarda as linhas em cache pela identidade dos itens; as células dependem também de estado
                de fora da linha, declarado em `rowDependencies` (ou, na falta dele, as próprias colunas). */}
            <Table.Body items={items} dependencies={[...(rowDependencies ?? [columns]), comSelecao, motivos.size, selection?.rowLabel]} className={cantosCorpo}>
              {(item) => {
                const chave = getKey(item);
                const motivo = motivos.get(chave);
                const idMotivo = `${prefixoId}-${chave}-motivo`;
                return (
                  <Table.Row id={chave} className="h-10">
                    {comSelecao ? (
                      <Table.Cell className="w-10 px-0 ps-4">
                        {motivo ? (
                          <Tooltip delay={300} closeDelay={0}>
                            <Tooltip.Trigger className="flex w-fit">
                              <CaixaSelecao label={selection!.rowLabel} describedBy={idMotivo} />
                            </Tooltip.Trigger>
                            <Tooltip.Content className="text-[12px]">{motivo}</Tooltip.Content>
                            <span id={idMotivo} hidden>{motivo}</span>
                          </Tooltip>
                        ) : <CaixaSelecao label={selection!.rowLabel} />}
                      </Table.Cell>
                    ) : null}
                    {columns.map((coluna) => (
                      <Table.Cell key={coluna.id} className={cn("whitespace-nowrap px-2.5 py-0 text-[14px] leading-5 text-[#454442] first:ps-5", coluna.className)}>
                        {coluna.cell(item)}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                );
              }}
            </Table.Body>
          </Table.Content>
          {/* Corpo branco até o fim da moldura: com poucas linhas, ou no lugar delas quando há um estado. */}
          <div className={cn("flex min-h-6 flex-1 flex-col rounded-b-[25px] bg-white", !items.length && "rounded-t-[25px]")}>
            {state ? <div className="flex flex-1 items-center justify-center p-6 text-center text-[14px] text-muted">{state}</div> : null}
          </div>
        </div>
      </Table.ScrollContainer>
      {pagination ? <Table.Footer className="p-0">{pagination}</Table.Footer> : <div className="h-[5px]" />}
    </Table>
  );
}
