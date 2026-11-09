import { useEffect, useState } from "react";

import type { PerfilAtual } from "@/core/auth/api";
import { buscarTodasAsPaginas } from "@/shared/lib/exportar-planilha";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import { formFactorApi } from "../../api/projetos.api";
import { useHistoricoProjeto } from "../../hooks/useProjetos";
import type { CasoHistorico, FiltrosHistoricoProjeto } from "../../model/projeto";
import type { ResultadoAberto } from "./HistoricoProjetoTabela";

const SEM_FILTROS: FiltrosHistoricoProjeto = {};
const NENHUM_EXPANDIDO: ReadonlySet<string> = new Set();

/** Estado da tabela de histórico de um projeto, usado pela General Results e pela aba Form Factor. */
export function useTabelaHistorico(projetoId: string, perfil: PerfilAtual, associadosAMim = false) {
  const [filtros, setFiltros] = useState(SEM_FILTROS);
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(DEFAULT_TABLE_PAGE_SIZE);
  // Só estado de tela: esquecido ao trocar de página, de projeto ou de filtro.
  const [expandidos, setExpandidos] = useState(NENHUM_EXPANDIDO);
  const [resultadoAberto, setResultadoAberto] = useState<ResultadoAberto | null>(null);
  const [casoDoResumo, setCasoDoResumo] = useState<CasoHistorico | null>(null);
  const consulta = { ...filtros, ...(associadosAMim ? { associadosAMim } : {}) };
  const historico = useHistoricoProjeto(projetoId, { ...consulta, page: pagina, pageSize: tamanhoPagina }, perfil);
  const dados = historico.data;
  const totalPaginas = Math.max(1, Math.ceil((dados?.total_count ?? 0) / tamanhoPagina));
  // Casos removidos encolhem a lista: volta para a última página que existe, como nas outras telas.
  useEffect(() => {
    if (dados && !historico.isPlaceholderData && pagina > totalPaginas) {
      setPagina(totalPaginas);
      setExpandidos(NENHUM_EXPANDIDO);
    }
  }, [dados, historico.isPlaceholderData, pagina, totalPaginas]);

  function irParaPagina(proxima: number) {
    setPagina(proxima);
    setExpandidos(NENHUM_EXPANDIDO);
  }

  function alterarFiltros(proximos: FiltrosHistoricoProjeto) {
    setFiltros(proximos);
    irParaPagina(1);
  }

  function alternarLinha(casoId: string) {
    setExpandidos((atuais) => {
      const proximos = new Set(atuais);
      if (!proximos.delete(casoId)) proximos.add(casoId);
      return proximos;
    });
  }

  const temFiltros = Object.values(filtros).some(Boolean);
  const limparFiltros = () => alterarFiltros(SEM_FILTROS);

  return {
    historico,
    filtros,
    alterarFiltros,
    limparFiltros,
    temFiltros,
    resultadoAberto,
    setResultadoAberto,
    casoDoResumo,
    setCasoDoResumo,
    propsTabela: {
      dados,
      carregando: historico.isLoading,
      erro: historico.isError,
      onTentarDeNovo: () => void historico.refetch(),
      filtros,
      onFiltroChange: (campo: keyof FiltrosHistoricoProjeto, valor: string) => alterarFiltros({ ...filtros, [campo]: valor || undefined }),
      temFiltros,
      onLimparFiltros: limparFiltros,
      expandidos,
      onAlternar: alternarLinha,
      onAbrirResultado: setResultadoAberto,
      onAbrirResumo: setCasoDoResumo,
      buscarTodos: () => buscarTodasAsPaginas((page, pageSize) => formFactorApi.historicoProjeto(projetoId, { ...consulta, page, pageSize })),
      page: pagina,
      pageSize: tamanhoPagina,
      onPageChange: irParaPagina,
      onPageSizeChange: (tamanho: number) => { setTamanhoPagina(tamanho); irParaPagina(1); },
    },
  };
}
