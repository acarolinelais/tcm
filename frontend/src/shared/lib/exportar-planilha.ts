import type { PagedResult } from "@/shared/types/paged-result";
import { formatarDiaIso } from "@/shared/lib/utils";

/** O que uma coluna leva para a planilha (ADR 0042): título no idioma da tela e o valor legível da célula. */
export interface ColunaExportacao<T> {
  titulo: string;
  valor: (item: T) => string | number | null | undefined;
}

export type BuscarPagina<T> = (page: number, pageSize: number) => Promise<PagedResult<T>>;

/** Por quanto tempo dados auxiliares já em cache (gerentes, membros) valem para uma exportação sem buscar de novo. */
export const CACHE_EXPORTACAO_MS = 30_000;

/** Maior `page_size` aceito pelas listagens da API. */
export const TAMANHO_PAGINA_EXPORTACAO = 100;

const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** `<listagem>_<AAAA-MM-DD>.xlsx`, com a data local. */
export function nomeArquivoExportacao(listagem: string, data = new Date()) {
  return `${listagem}_${formatarDiaIso(data)}.xlsx`;
}

/** Planilha de uma aba: os títulos na primeira linha e uma linha por item, na ordem recebida. */
export async function montarPlanilha<T>(colunas: ColunaExportacao<T>[], itens: T[]): Promise<ArrayBuffer> {
  const XLSX = await import("@e965/xlsx");
  const worksheet = XLSX.utils.aoa_to_sheet([
    colunas.map((coluna) => coluna.titulo),
    ...itens.map((item) => colunas.map((coluna) => coluna.valor(item) ?? "")),
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" });
}

export function baixarPlanilha(bytes: ArrayBuffer, arquivo: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type: TIPO_XLSX }));
  const link = document.createElement("a");
  link.href = url;
  link.download = arquivo;
  document.body.append(link);
  link.click();
  link.remove();
  // Alguns navegadores leem o blob depois do clique: revogar na hora pode cortar o download.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Todas as páginas de uma listagem, uma por vez. Falha numa página rejeita tudo: nada de resultado parcial. */
export async function buscarTodasAsPaginas<T>(buscarPagina: BuscarPagina<T>): Promise<T[]> {
  const primeira = await buscarPagina(1, TAMANHO_PAGINA_EXPORTACAO);
  const itens = [...primeira.items];
  const totalPaginas = Math.ceil(primeira.total_count / TAMANHO_PAGINA_EXPORTACAO);
  for (let pagina = 2; pagina <= totalPaginas; pagina++) {
    const { items } = await buscarPagina(pagina, TAMANHO_PAGINA_EXPORTACAO);
    // A listagem encolheu durante a busca: não há mais o que buscar.
    if (!items.length) break;
    itens.push(...items);
  }
  return itens;
}
