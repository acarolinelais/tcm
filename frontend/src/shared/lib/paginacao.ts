/** Tamanho padrão e opções das listagens (ADR 0034). Sem dependência de UI: shadcn e HeroUI usam os mesmos. */
export const DEFAULT_TABLE_PAGE_SIZE = 20;
export const TABLE_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/** Números de página a mostrar: todos até 7 páginas; acima disso, a primeira, a última e a vizinhança da atual. */
export function paginasVisiveis(pagina: number, totalPaginas: number): (number | "reticencias")[] {
  if (totalPaginas <= 7) return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  const inicio = Math.max(2, Math.min(pagina - 1, totalPaginas - 4));
  const fim = Math.min(totalPaginas - 1, Math.max(pagina + 1, 5));
  return [
    1,
    ...(inicio > 2 ? ["reticencias" as const] : []),
    ...Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i),
    ...(fim < totalPaginas - 1 ? ["reticencias" as const] : []),
    totalPaginas,
  ];
}
