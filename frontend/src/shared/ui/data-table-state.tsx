import type { ReactNode } from "react";
import { Button } from "@heroui/react";
import { SearchX } from "lucide-react";

import { ErroComRetry } from "./erro-com-retry";
import { EstadoVazio } from "./estado-vazio";

interface EstadoDaTabela {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
  loadingLabel: string;
  errorLabel: string;
  clearFiltersLabel: string;
  /** Vazio sem filtro: título e dica do que fazer; o ícone é o do protótipo (spec 055). */
  empty: { title: string; hint: string };
  /** Vazio com filtro: título e dica; o ícone é sempre `SearchX` e o botão limpa os filtros. */
  filtered: { title: string; hint: string };
  /** Tentar de novo no estado de erro (ex.: `query.refetch`). */
  retry?: { label: string; onRetry: () => void };
}

/** Os quatro estados da listagem (docs/tables-rules.md), para a prop `state`; `null` quando há linhas. */
export function estadoDaTabela(e: EstadoDaTabela): ReactNode {
  if (e.isLoading) return <p role="status">{e.loadingLabel}</p>;
  if (e.isError) return e.retry ? <ErroComRetry mensagem={e.errorLabel} retry={e.retry} /> : <p role="alert" className="text-danger">{e.errorLabel}</p>;
  if (!e.isEmpty) return null;
  if (!e.hasFilters) return <EstadoVazio titulo={e.empty.title} dica={e.empty.hint} />;
  return (
    <EstadoVazio titulo={e.filtered.title} dica={e.filtered.hint} icone={<SearchX aria-hidden="true" className="size-7" />}>
      <Button variant="outline" size="sm" className="mt-5" onPress={e.onClearFilters}>{e.clearFiltersLabel}</Button>
    </EstadoVazio>
  );
}
