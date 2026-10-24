import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatNumber } from "@/core/i18n/format";
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from "@/shared/ui/table";
import { agruparErrosPlanilha, formatarErroPlanilha, type ErroPlanilhaExibivel } from "../utils/formatar-erro-planilha";

interface ErrosPlanilhaProps {
  erros: ErroPlanilhaExibivel[];
  /** Linhas de dados lidas; sem ele o resumo "X de Y linhas" não aparece. */
  totalLinhas?: number;
}

/** Problemas da planilha: resumo, problemas gerais e, paginadas, as linhas com todos os seus problemas. */
export function ErrosPlanilha({ erros, totalLinhas }: ErrosPlanilhaProps) {
  const { t } = useTranslation();
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const { gerais, linhas } = useMemo(() => agruparErrosPlanilha(erros), [erros]);
  const linhasDaPagina = linhas.slice((pagina - 1) * tamanho, pagina * tamanho);
  const formatar = (erro: ErroPlanilhaExibivel) => formatarErroPlanilha(t, erro);

  return (
    <div role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <h2 className="text-sm font-semibold text-destructive">{t("projectImportValidationError")}</h2>
      {totalLinhas !== undefined && linhas.length > 0 && (
        <p className="mt-1 text-sm text-destructive">
          {t("spreadsheetErrorsSummary", { count: linhas.length, countLabel: formatNumber(linhas.length), totalLabel: formatNumber(totalLinhas) })}
        </p>
      )}
      {gerais.length > 0 && (
        <section className="mt-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-destructive">{t("spreadsheetGeneralErrors")}</h3>
          <ul className="mt-1 space-y-1 text-sm text-destructive">
            {gerais.map((erro, index) => <li key={index}>{formatar(erro)}</li>)}
          </ul>
        </section>
      )}
      {linhas.length > 0 && (
        <>
          <ul className="mt-3 space-y-3">
            {linhasDaPagina.map(({ linha, erros: errosDaLinha }) => (
              <li key={linha}>
                <h3 className="text-sm font-semibold tabular-nums text-destructive">{t("spreadsheetRow", { linha })}</h3>
                <ul className="mt-1 list-disc space-y-1 ps-5 text-sm text-destructive">
                  {errosDaLinha.map((erro, index) => <li key={index}>{formatar(erro)}</li>)}
                </ul>
              </li>
            ))}
          </ul>
          {linhas.length > tamanho && (
            <TablePagination
              className="mt-3 border-destructive/20"
              page={pagina}
              pageSize={tamanho}
              totalCount={linhas.length}
              onPageChange={setPagina}
              onPageSizeChange={(n) => { setTamanho(n); setPagina(1); }}
            />
          )}
        </>
      )}
    </div>
  );
}
