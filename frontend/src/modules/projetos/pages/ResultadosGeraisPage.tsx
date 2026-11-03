import { useCallback, useEffect, useState } from "react";
import { Button, SearchField } from "@heroui/react";
import { Search } from "lucide-react";
import { useOutletContext, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { buscarTodasAsPaginas } from "@/shared/lib/exportar-planilha";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import { ErroComRetry } from "@/shared/ui/erro-com-retry";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageCard, PageTitle } from "@/shared/ui/page-card";
import { WeekPickerHero } from "@/shared/ui/week-picker-hero";
import { useHistoricoProjeto, useProjetosSeletor } from "../hooks/useProjetos";
import { formFactorApi } from "../api/projetos.api";
import type { CasoHistorico, FiltrosHistoricoProjeto } from "../model/projeto";
import { HistoricoProjetoTabela, type ResultadoAberto } from "../components/resultados-gerais/HistoricoProjetoTabela";
import { ProjetoSwitcher } from "../components/ProjetoSwitcher";
import { ResultadoExecucaoModal } from "../components/resultados-gerais/ResultadoExecucaoModal";
import { ResumoExecucoesDrawer } from "../components/resultados-gerais/ResumoExecucoesDrawer";

const SEM_FILTROS: FiltrosHistoricoProjeto = {};

/** Resultados Gerais (spec 032): o histórico por data de um projeto por vez, escolhido no título (spec 053). */
export function ResultadosGeraisPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const permitido = ["ADMIN_UNIDADE", "GERENTE", "KP"].includes(perfil.perfil_codigo ?? "") && perfil.permissoes.includes("form_factor.consultar");
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
  const [rascunhoBusca, setRascunhoBusca] = useState("");
  const [buscaAberta, setBuscaAberta] = useState(false);
  // Modelo escolhido por linha (RN-03): só estado de tela, esquecido ao trocar de projeto ou de filtro e mantido ao trocar de página.
  const [escolhas, setEscolhas] = useState<Record<string, string>>({});
  const [resultadoAberto, setResultadoAberto] = useState<ResultadoAberto | null>(null);
  const [casoDoResumo, setCasoDoResumo] = useState<CasoHistorico | null>(null);
  const historico = useHistoricoProjeto(projetoId, { ...filtros, page: pagina, pageSize: tamanhoPagina }, perfil);
  const dados = historico.data;
  const totalPaginas = Math.max(1, Math.ceil((dados?.total_count ?? 0) / tamanhoPagina));
  // Casos removidos encolhem a lista: volta para a última página que existe, como nas outras telas.
  useEffect(() => { if (dados && !historico.isPlaceholderData && pagina > totalPaginas) setPagina(totalPaginas); }, [dados, historico.isPlaceholderData, pagina, totalPaginas]);

  const buscarCasosParaExportar = () => buscarTodasAsPaginas((page, pageSize) => formFactorApi.historicoProjeto(projetoId, { ...filtros, page, pageSize }));

  function alterarFiltros(proximos: FiltrosHistoricoProjeto) {
    setFiltros(proximos);
    setPagina(1);
    setEscolhas({});
  }

  function trocarProjeto(id: string) {
    // replace: a troca não entra no histórico, então voltar no navegador não reabre um projeto com os filtros de outro.
    setParametros({ projeto: id }, { replace: true });
    limparFiltros();
  }

  function limparFiltros() {
    setRascunhoBusca("");
    setBuscaAberta(false);
    alterarFiltros(SEM_FILTROS);
  }

  const modeloDaLinha = useCallback(
    (caso: CasoHistorico) => escolhas[caso.caso_teste_id] ?? caso.modelo_padrao_id ?? "",
    [escolhas],
  );
  const temFiltros = Object.values(filtros).some(Boolean);

  if (!permitido) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;

  const cabecalho = <header className="mb-[25px] flex shrink-0 flex-wrap items-start gap-4">
    <div className="min-w-0 flex-1">
      {projetoAberto
        ? <ProjetoSwitcher projetoId={projetoId} nome={projetoAberto.nome} projetos={projetos} buscavel onEscolher={trocarProjeto} />
        : <PageTitle>{t("generalResults")}</PageTitle>}
      <p className="mt-1.5 text-[14px] leading-5 text-muted">{t("generalResultsDescription")}</p>
    </div>
  </header>;

  if (projetosQuery.isError) {
    return <PageCard>{cabecalho}<ErroComRetry mensagem={t("resultsLoadError")} retry={{ label: t("retryQuery"), onRetry: () => void projetosQuery.refetch() }} /></PageCard>;
  }
  if (projetosQuery.isLoading) return <PageCard>{cabecalho}<p role="status" className="text-[14px] text-muted">{t("loading")}</p></PageCard>;
  if (!projetos.length) {
    return <PageCard>
      {cabecalho}
      <EstadoVazio className="mx-auto mt-10" titulo={t("noAccessibleProjects")} dica={t("noAccessibleProjectsHint")} />
    </PageCard>;
  }

  const barra = <div className="flex items-center gap-2">
    {buscaAberta || filtros.busca
      ? <form className="w-72" role="search" onSubmit={(evento) => { evento.preventDefault(); alterarFiltros({ ...filtros, busca: rascunhoBusca.trim() || undefined }); }}>
        <SearchField
          aria-label={t("generalResultsSearch")}
          value={rascunhoBusca}
          onChange={setRascunhoBusca}
          onClear={() => alterarFiltros({ ...filtros, busca: undefined })}
          autoFocus={!filtros.busca}
        >
          <SearchField.Group className="h-9">
            <SearchField.SearchIcon />
            <SearchField.Input placeholder={t("generalResultsSearch")} className="text-[13px]" />
            <SearchField.ClearButton aria-label={t("clearText")} />
          </SearchField.Group>
        </SearchField>
      </form>
      : <Button isIconOnly variant="ghost" aria-label={t("generalResultsSearch")} onPress={() => setBuscaAberta(true)} className="size-9 min-w-0 rounded-full border border-edge bg-surface text-body transition-[background-color,transform] duration-100 ease-out hover:bg-page data-[pressed]:scale-[0.97] motion-reduce:transition-none motion-reduce:data-[pressed]:scale-100 dark:text-muted">
        <Search aria-hidden="true" className="size-4" />
      </Button>}
    <WeekPickerHero permitirDia label={t("dayOrWeek")} value={filtros.periodo ?? ""} onChange={(valor) => alterarFiltros({ ...filtros, periodo: valor || undefined })} />
    {temFiltros && <Button variant="ghost" size="sm" onPress={limparFiltros}>{t("clearFilters")}</Button>}
  </div>;

  return <PageCard>
    {cabecalho}
    <div className="mb-5 flex shrink-0 justify-end">{barra}</div>
    <div className="flex min-h-0 flex-1 flex-col">
      <HistoricoProjetoTabela
        dados={dados}
        carregando={historico.isLoading}
        erro={historico.isError}
        onTentarDeNovo={() => void historico.refetch()}
        filtros={filtros}
        onFiltroChange={(campo, valor) => alterarFiltros({ ...filtros, [campo]: valor || undefined })}
        temFiltros={temFiltros}
        onLimparFiltros={limparFiltros}
        modeloDaLinha={modeloDaLinha}
        onModeloChange={(casoId, modeloId) => setEscolhas((atuais) => ({ ...atuais, [casoId]: modeloId }))}
        onAbrirResultado={setResultadoAberto}
        onAbrirResumo={setCasoDoResumo}
        buscarTodos={buscarCasosParaExportar}
        page={pagina}
        pageSize={tamanhoPagina}
        onPageChange={setPagina}
        onPageSizeChange={(tamanho) => { setTamanhoPagina(tamanho); setPagina(1); }}
      />
    </div>
    <ResumoExecucoesDrawer caso={casoDoResumo} perfil={perfil} onFechar={() => setCasoDoResumo(null)} onAbrirResultado={setResultadoAberto} />
    <ResultadoExecucaoModal resultado={resultadoAberto} onFechar={() => setResultadoAberto(null)} />
  </PageCard>;
}
