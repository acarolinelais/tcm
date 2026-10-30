import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { baixarPlanilha, montarPlanilha, nomeArquivoExportacao, type ColunaExportacao } from "@/shared/lib/exportar-planilha";
import { toast } from "@/shared/lib/toast";

export interface OpcoesExportacao<T> {
  /** Início do nome do arquivo, ex.: `usuarios` → `usuarios_2026-10-29.xlsx`. */
  listagem: string;
  /** As colunas da tabela; só as que têm `exportar` vão para a planilha. */
  colunas: readonly { exportar?: ColunaExportacao<T> }[];
  /** Os itens da página na tela. */
  itensPagina: T[];
  /**
   * Todos os itens com os filtros atuais: a lista inteira (paginação em memória) ou a função que os busca, em geral
   * `buscarTodasAsPaginas` sobre a mesma chamada de listagem da tela.
   */
  todosOsItens: T[] | (() => Promise<T[]>);
}

/** Exportação da página atual ou de todos os itens de uma tabela (spec 035, ADR 0042). */
export function useExportarTabela<T>({ listagem, colunas, itensPagina, todosOsItens }: OpcoesExportacao<T>) {
  const { t } = useTranslation();
  const [exportando, setExportando] = useState(false);
  // O estado só muda no próximo render; o ref barra um segundo clique antes disso.
  const emAndamento = useRef(false);

  async function exportar(obterItens: () => T[] | Promise<T[]>) {
    if (emAndamento.current) return;
    emAndamento.current = true;
    setExportando(true);
    try {
      const exportaveis = colunas.flatMap((coluna) => (coluna.exportar ? [coluna.exportar] : []));
      baixarPlanilha(await montarPlanilha(exportaveis, await obterItens()), nomeArquivoExportacao(listagem));
    } catch {
      toast.error(t("exportError"));
    } finally {
      emAndamento.current = false;
      setExportando(false);
    }
  }

  return {
    disponivel: itensPagina.length > 0,
    exportando,
    exportarPagina: () => exportar(() => itensPagina),
    exportarTodos: () => exportar(() => (Array.isArray(todosOsItens) ? todosOsItens : todosOsItens())),
  };
}
