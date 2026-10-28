import type { TFunction } from "i18next";

import type { ProblemDetails } from "@/shared/api/problem-details";
import { formatList, formatNumber } from "@/core/i18n/format";
import { CODIGOS_ERRO_PLANILHA, type CodigoErroPlanilha, type ErroPlanilha } from "../model/projeto";

const codigos = new Set<string>(CODIGOS_ERRO_PLANILHA);

/** Erro de planilha pronto para exibir; `mensagem` só existe quando a API não mandou um código conhecido. */
export type ErroPlanilhaExibivel = ErroPlanilha | (Omit<ErroPlanilha, "codigo"> & { codigo: null; mensagem: string });

/** Converte o 422 da importação (ADR 0033) para o mesmo formato da validação no navegador. */
export function errosDaApi(problem: ProblemDetails): ErroPlanilhaExibivel[] {
  return (problem.errors ?? []).map((erro) => {
    const base = { linha: erro.linha ?? null, coluna: erro.coluna ?? null, valor: erro.valor ?? null, parametros: erro.parametros as ErroPlanilha["parametros"] };
    return erro.codigo && codigos.has(erro.codigo)
      ? { ...base, codigo: erro.codigo as CodigoErroPlanilha }
      // Sem código conhecido (ex.: validação de outro campo do formulário), o campo ainda identifica o problema.
      : { ...base, codigo: null, mensagem: erro.campo ? `${erro.campo}: ${erro.mensagem}` : erro.mensagem };
  });
}

export function formatarErroPlanilha(t: TFunction, erro: ErroPlanilhaExibivel): string {
  if (erro.codigo === null) return erro.mensagem;
  const esperados = erro.parametros?.esperados;
  const maximo = erro.parametros?.maximo;
  return t(`spreadsheetError.${erro.codigo}`, {
    coluna: erro.coluna ?? "",
    valor: erro.valor ?? "",
    primeira_linha: erro.parametros?.primeira_linha,
    maximo: maximo === undefined ? "" : formatNumber(maximo),
    esperados: esperados ? formatList(esperados, "disjunction") : "",
  });
}

export interface LinhaComErros {
  linha: number;
  erros: ErroPlanilhaExibivel[];
}

/** Separa os problemas da planilha inteira e agrupa os demais por linha, em ordem crescente. */
export function agruparErrosPlanilha(erros: ErroPlanilhaExibivel[]) {
  const gerais = erros.filter((erro) => erro.linha === null);
  const porLinha = new Map<number, ErroPlanilhaExibivel[]>();
  for (const erro of erros) {
    if (erro.linha === null) continue;
    const daLinha = porLinha.get(erro.linha);
    if (daLinha) daLinha.push(erro);
    else porLinha.set(erro.linha, [erro]);
  }
  const linhas: LinhaComErros[] = [...porLinha].sort(([a], [b]) => a - b).map(([linha, itens]) => ({ linha, erros: itens }));
  return { gerais, linhas };
}
