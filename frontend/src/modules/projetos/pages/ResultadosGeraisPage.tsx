import { useEffect } from "react";
import { Button } from "@heroui/react";
import { useOutletContext, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { ErroComRetry } from "@/shared/ui/erro-com-retry";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageCard, PageTitle } from "@/shared/ui/page-card";
import { PageTabPanel, PageTabs } from "@/shared/ui/page-tabs";
import { WeekPickerHero } from "@/shared/ui/week-picker-hero";
import { useProjetosSeletor } from "../hooks/useProjetos";
import { AcoesGerenciaFormFactor } from "../components/form-factor/AcoesGerenciaFormFactor";
import { HistoricoProjetoTabela } from "../components/resultados-gerais/HistoricoProjetoTabela";
import { ResultadoExecucaoModal } from "../components/resultados-gerais/ResultadoExecucaoModal";
import { ResumoExecucoesDrawer } from "../components/resultados-gerais/ResumoExecucoesDrawer";
import { useTabelaHistorico } from "../components/resultados-gerais/useTabelaHistorico";

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
  const tabela = useTabelaHistorico(projetoId, perfil);
  const { filtros, alterarFiltros } = tabela;

  function trocarProjeto(id: string) {
    // replace: a troca não entra no histórico, então voltar no navegador não reabre um projeto com os filtros de outro.
    setParametros({ projeto: id }, { replace: true });
    tabela.limparFiltros();
  }

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
        {tabela.temFiltros && <Button variant="ghost" onPress={tabela.limparFiltros} className="h-9 min-h-0 rounded-full bg-panel px-4 text-[15px] font-medium leading-[21px] text-body shadow-none transition-[background-color,transform] duration-100 ease-out hover:bg-default data-[pressed]:scale-[0.97] motion-reduce:transition-none motion-reduce:data-[pressed]:scale-100 dark:text-muted">{t("clearFilters")}</Button>}
      </>}
    >
      <PageTabPanel id={projetoId} className="flex min-h-0 flex-1 flex-col p-0">
        <HistoricoProjetoTabela {...tabela.propsTabela} />
      </PageTabPanel>
    </PageTabs>
    <ResumoExecucoesDrawer caso={tabela.casoDoResumo} perfil={perfil} onFechar={() => tabela.setCasoDoResumo(null)} onAbrirResultado={tabela.setResultadoAberto} />
    <ResultadoExecucaoModal resultado={tabela.resultadoAberto} onFechar={() => tabela.setResultadoAberto(null)} />
  </PageCard>;
}
