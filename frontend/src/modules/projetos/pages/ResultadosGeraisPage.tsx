import { useCallback, useEffect, useState } from "react";
import { Button, SearchField } from "@heroui/react";
import { FolderOpen, Search } from "lucide-react";
import { useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { ErroComRetry } from "@/shared/ui/erro-com-retry";
import { PageCard, PageTitle } from "@/shared/ui/page-card";
import { PageTabPanel, PageTabs } from "@/shared/ui/page-tabs";
import { WeekPickerHero } from "@/shared/ui/week-picker-hero";
import { useHistoricoProjeto, useProjetosSeletor } from "../hooks/useProjetos";
import type { CasoHistorico, CasoTesteResumo, FiltrosHistoricoProjeto } from "../model/projeto";
import { DetalhesCasoTesteDrawer } from "../components/casos-teste/DetalhesCasoTesteDrawer";
import { HistoricoProjetoTabela, type ResultadoAberto } from "../components/resultados-gerais/HistoricoProjetoTabela";
import { ResultadoExecucaoModal } from "../components/resultados-gerais/ResultadoExecucaoModal";
import { ResumoExecucoesDrawer } from "../components/resultados-gerais/ResumoExecucoesDrawer";

const SEM_FILTROS: FiltrosHistoricoProjeto = {};

/** Resultados Gerais (spec 032): uma aba por projeto, com o histórico por data e o modelo escolhido em cada linha. */
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

  const [abaEscolhida, setAbaEscolhida] = useState("");
  const projetoId = projetos.some((projeto) => projeto.id === abaEscolhida) ? abaEscolhida : projetos[0]?.id ?? "";
  const [filtros, setFiltros] = useState(SEM_FILTROS);
  const [rascunhoBusca, setRascunhoBusca] = useState("");
  const [buscaAberta, setBuscaAberta] = useState(false);
  // Modelo escolhido por linha (RN-03): só estado de tela, esquecido ao trocar de aba e ao mudar a consulta.
  const [escolhas, setEscolhas] = useState<Record<string, string>>({});
  const [resultadoAberto, setResultadoAberto] = useState<ResultadoAberto | null>(null);
  const [casoDoResumo, setCasoDoResumo] = useState<CasoHistorico | null>(null);
  const [casoDetalhado, setCasoDetalhado] = useState<CasoTesteResumo | null>(null);
  const historico = useHistoricoProjeto(projetoId, filtros, perfil);
  const dados = historico.data;

  function alterarFiltros(proximos: FiltrosHistoricoProjeto) {
    setFiltros(proximos);
    setEscolhas({});
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
      <PageTitle>{t("generalResults")}</PageTitle>
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
      <div role="status" className="mx-auto mt-10 max-w-md text-center">
        <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-accent/10 text-accent-text"><FolderOpen aria-hidden="true" className="size-5" /></div>
        <h2 className="text-[15px] font-medium text-body">{t("noAccessibleProjects")}</h2>
        <p className="mt-1.5 text-[14px] leading-6 text-muted">{t("noAccessibleProjectsHint")}</p>
      </div>
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
      : <Button isIconOnly variant="ghost" aria-label={t("generalResultsSearch")} onPress={() => setBuscaAberta(true)} className="size-9 min-w-0 rounded-[10px]">
        <Search aria-hidden="true" className="size-4" />
      </Button>}
    <WeekPickerHero permitirDia label={t("dayOrWeek")} value={filtros.periodo ?? ""} onChange={(valor) => alterarFiltros({ ...filtros, periodo: valor || undefined })} />
    {temFiltros && <Button variant="ghost" size="sm" onPress={limparFiltros}>{t("clearFilters")}</Button>}
  </div>;

  return <PageCard>
    {cabecalho}
    <PageTabs
      aria-label={t("generalResultsProjects")}
      tabs={projetos.map((projeto) => ({ id: projeto.id, label: projeto.nome }))}
      selectedKey={projetoId}
      onSelectionChange={(id) => { setAbaEscolhida(id); limparFiltros(); }}
      actions={barra}
    >
      {projetos.map((projeto) => <PageTabPanel key={projeto.id} id={projeto.id} className="flex min-h-0 flex-1 flex-col p-0">
        {projeto.id === projetoId && <HistoricoProjetoTabela
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
          onAbrirDetalhes={setCasoDetalhado}
        />}
      </PageTabPanel>)}
    </PageTabs>
    <ResumoExecucoesDrawer caso={casoDoResumo} perfil={perfil} onFechar={() => setCasoDoResumo(null)} onAbrirResultado={setResultadoAberto} />
    <ResultadoExecucaoModal resultado={resultadoAberto} onFechar={() => setResultadoAberto(null)} />
    <DetalhesCasoTesteDrawer caso={casoDetalhado} perfil={perfil} onFechar={() => setCasoDetalhado(null)} />
  </PageCard>;
}
