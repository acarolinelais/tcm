import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { useOutletContext, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { buscarTodasAsPaginas } from "@/shared/lib/exportar-planilha";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import { ErroComRetry } from "@/shared/ui/erro-com-retry";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageCard, PageTitle } from "@/shared/ui/page-card";
import { PageTabPanel, PageTabs } from "@/shared/ui/page-tabs";
import { WeekPickerHero } from "@/shared/ui/week-picker-hero";
import { useHistoricoProjeto, useProjetosSeletor } from "../hooks/useProjetos";
import { formFactorApi } from "../api/projetos.api";
import type { CasoHistorico, FiltrosHistoricoProjeto } from "../model/projeto";
import { AcoesGerenciaFormFactor } from "../components/form-factor/AcoesGerenciaFormFactor";
import { HistoricoProjetoTabela, type ResultadoAberto } from "../components/resultados-gerais/HistoricoProjetoTabela";
import { ResultadoExecucaoModal } from "../components/resultados-gerais/ResultadoExecucaoModal";
import { ResumoExecucoesDrawer } from "../components/resultados-gerais/ResumoExecucoesDrawer";

const SEM_FILTROS: FiltrosHistoricoProjeto = {};
const NENHUM_EXPANDIDO: ReadonlySet<string> = new Set();

/** General Results (specs 032, 053 e 059): uma aba por projeto do escopo, com o histórico por data do projeto aberto. */
export function ResultadosGeraisPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  // O dev também entra, nos projetos dos times dele (spec 059, RN-01 e RN-02).
  const permitido = ["ADMIN_UNIDADE", "GERENTE", "KP", "USUARIO_PADRAO"].includes(perfil.perfil_codigo ?? "") && perfil.permissoes.includes("form_factor.consultar");
  const projetosQuery = useProjetosSeletor(perfil, permitido);
  const projetos = projetosQuery.data?.pages.flatMap((pagina) => pagina.items) ?? [];
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = projetosQuery;
  useEffect(() => {
    if (permitido && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [permitido, fetchNextPage, hasNextPage, isFetchingNextPage]);

  // O projeto fica no endereço (?projeto=); um id fora da lista abre o primeiro, sem erro (spec 053, RN-03).
  // Enquanto a lista ainda carrega páginas, o id do link pode estar numa delas: só então cai no primeiro.
  const [parametros, setParametros] = useSearchParams();
  const pedido = parametros.get("projeto");
  const projetoAberto = projetos.find((projeto) => projeto.id === pedido) ?? (pedido && hasNextPage ? undefined : projetos[0]);
  const projetoId = projetoAberto?.id ?? "";
  const [filtros, setFiltros] = useState(SEM_FILTROS);
  // Página e tamanho (spec 033): fora de `filtros`, que só guarda o que a pessoa filtrou.
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(DEFAULT_TABLE_PAGE_SIZE);
  // Linhas abertas (spec 059, RN-12): só estado de tela, esquecido ao trocar de página, de projeto ou de filtro.
  const [expandidos, setExpandidos] = useState(NENHUM_EXPANDIDO);
  const [resultadoAberto, setResultadoAberto] = useState<ResultadoAberto | null>(null);
  const [casoDoResumo, setCasoDoResumo] = useState<CasoHistorico | null>(null);
  const historico = useHistoricoProjeto(projetoId, { ...filtros, page: pagina, pageSize: tamanhoPagina }, perfil);
  const dados = historico.data;
  const totalPaginas = Math.max(1, Math.ceil((dados?.total_count ?? 0) / tamanhoPagina));
  // Casos removidos encolhem a lista: volta para a última página que existe, como nas outras telas.
  useEffect(() => {
    if (dados && !historico.isPlaceholderData && pagina > totalPaginas) {
      setPagina(totalPaginas);
      setExpandidos(NENHUM_EXPANDIDO);
    }
  }, [dados, historico.isPlaceholderData, pagina, totalPaginas]);

  const buscarCasosParaExportar = () => buscarTodasAsPaginas((page, pageSize) => formFactorApi.historicoProjeto(projetoId, { ...filtros, page, pageSize }));

  function irParaPagina(proxima: number) {
    setPagina(proxima);
    setExpandidos(NENHUM_EXPANDIDO);
  }

  function alterarFiltros(proximos: FiltrosHistoricoProjeto) {
    setFiltros(proximos);
    irParaPagina(1);
  }

  function trocarProjeto(id: string) {
    // replace: a troca não entra no histórico, então voltar no navegador não reabre um projeto com os filtros de outro.
    setParametros({ projeto: id }, { replace: true });
    alterarFiltros(SEM_FILTROS);
  }

  function alternarLinha(casoId: string) {
    setExpandidos((atuais) => {
      const proximos = new Set(atuais);
      if (!proximos.delete(casoId)) proximos.add(casoId);
      return proximos;
    });
  }

  const temFiltros = Object.values(filtros).some(Boolean);

  if (!permitido) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;

  const cabecalho = <header className="mb-[25px] shrink-0">
    <PageTitle>{t("generalResults")}</PageTitle>
    <p className="mt-1.5 text-[14px] leading-5 text-muted">{t("generalResultsDescription")}</p>
  </header>;

  if (projetosQuery.isError) {
    return <PageCard>{cabecalho}<ErroComRetry mensagem={t("resultsLoadError")} retry={{ label: t("retryQuery"), onRetry: () => void projetosQuery.refetch() }} /></PageCard>;
  }
  // Também enquanto o projeto do link espera as próximas páginas da lista: sem projeto aberto, não há ação nem tabela.
  if (projetosQuery.isLoading || (projetos.length && !projetoAberto)) return <PageCard>{cabecalho}<p role="status" className="text-[14px] text-muted">{t("loading")}</p></PageCard>;
  if (!projetos.length) {
    return <PageCard>
      {cabecalho}
      <EstadoVazio className="m-auto" titulo={t("noAccessibleProjects")} dica={t("noAccessibleProjectsHint")} />
    </PageCard>;
  }

  return <PageCard>
    {cabecalho}
    <PageTabs
      aria-label={t("generalResults")}
      // Só o nome do app, sem a versão (spec 059, RN-07).
      tabs={projetos.map((projeto) => ({ id: projeto.id, label: projeto.app }))}
      selectedKey={projetoId}
      onSelectionChange={trocarProjeto}
      actions={<>
        <AcoesGerenciaFormFactor projetoId={projetoId} perfil={perfil} />
        <WeekPickerHero permitirDia label={t("dayOrWeek")} value={filtros.periodo ?? ""} onChange={(valor) => alterarFiltros({ ...filtros, periodo: valor || undefined })} />
        {/* Pílula cinza na altura do filtro de dia ou semana ao lado (design da spec 059). */}
        {temFiltros && <Button variant="ghost" onPress={() => alterarFiltros(SEM_FILTROS)} className="h-9 min-h-0 rounded-full bg-panel px-4 text-[15px] font-medium leading-[21px] text-body shadow-none transition-[background-color,transform] duration-100 ease-out hover:bg-default data-[pressed]:scale-[0.97] motion-reduce:transition-none motion-reduce:data-[pressed]:scale-100 dark:text-muted">{t("clearFilters")}</Button>}
      </>}
    >
      <PageTabPanel id={projetoId} className="flex min-h-0 flex-1 flex-col p-0">
        <HistoricoProjetoTabela
          dados={dados}
          carregando={historico.isLoading}
          erro={historico.isError}
          onTentarDeNovo={() => void historico.refetch()}
          filtros={filtros}
          onFiltroChange={(campo, valor) => alterarFiltros({ ...filtros, [campo]: valor || undefined })}
          temFiltros={temFiltros}
          onLimparFiltros={() => alterarFiltros(SEM_FILTROS)}
          expandidos={expandidos}
          onAlternar={alternarLinha}
          onAbrirResultado={setResultadoAberto}
          onAbrirResumo={setCasoDoResumo}
          buscarTodos={buscarCasosParaExportar}
          page={pagina}
          pageSize={tamanhoPagina}
          onPageChange={irParaPagina}
          onPageSizeChange={(tamanho) => { setTamanhoPagina(tamanho); irParaPagina(1); }}
        />
      </PageTabPanel>
    </PageTabs>
    <ResumoExecucoesDrawer caso={casoDoResumo} perfil={perfil} onFechar={() => setCasoDoResumo(null)} onAbrirResultado={setResultadoAberto} />
    <ResultadoExecucaoModal resultado={resultadoAberto} onFechar={() => setResultadoAberto(null)} />
  </PageCard>;
}
