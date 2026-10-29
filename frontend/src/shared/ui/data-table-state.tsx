import type { ReactNode } from "react";
import { Button } from "@heroui/react";
import { SearchX } from "lucide-react";

import { ErroComRetry } from "./erro-com-retry";

interface EstadoDaTabela {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
  loadingLabel: string;
  errorLabel: string;
  clearFiltersLabel: string;
  /** Vazio sem filtro: ícone do domínio, título e dica do que fazer. */
  empty: { icon: ReactNode; title: string; hint: string };
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
  const conteudo = e.hasFilters ? e.filtered : e.empty;
  return (
    <div role="status" className="w-full max-w-md text-center">
      <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-accent/10 text-accent">
        {e.hasFilters ? <SearchX aria-hidden="true" className="size-5" /> : e.empty.icon}
      </div>
      <h2 className="text-[15px] font-medium text-[#454442]">{conteudo.title}</h2>
      <p className="mx-auto mt-1.5 max-w-xs text-[14px] leading-6 text-muted">{conteudo.hint}</p>
      {e.hasFilters && <Button variant="outline" size="sm" className="mt-5" onPress={e.onClearFilters}>{e.clearFiltersLabel}</Button>}
    </div>
  );
}
