import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useOutletContext, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { ErroComRetry } from "@/shared/ui/erro-com-retry";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { FiltroEncerrados } from "@/shared/ui/filtro-encerrados";
import { PageCard, PageTitle } from "@/shared/ui/page-card";
import { PageTabPanel, PageTabs } from "@/shared/ui/page-tabs";
import { WeekPickerHero } from "@/shared/ui/week-picker-hero";
import { useProjetosSeletor } from "../hooks/useProjetos";
import { filtrarEncerrados, projetoEncerrado, temEncerrados } from "../model/projeto";
import { AcoesGerenciaFormFactor } from "../components/form-factor/AcoesGerenciaFormFactor";
import { HistoricoProjetoTabela } from "../components/resultados-gerais/HistoricoProjetoTabela";
import { ResultadoExecucaoModal } from "../components/resultados-gerais/ResultadoExecucaoModal";
import { ResumoExecucoesDrawer } from "../components/resultados-gerais/ResumoExecucoesDrawer";
import { useTabelaHistorico } from "../components/resultados-gerais/useTabelaHistorico";

const ABAS_POR_VEZ = 3;
// Setas soltas: círculo suave no hover, resposta no toque e apagadas quando desabilitadas.
const classeSeta = "rounded-full text-muted transition-[background-color,color,scale] duration-150 ease-out hover:bg-panel hover:text-body data-[pressed]:scale-[0.92] data-[disabled]:opacity-40 motion-reduce:transition-none motion-reduce:data-[pressed]:scale-100";

/** General Results (specs 032, 053 e 059): uma aba por projeto do escopo, com o histórico por data do projeto aberto. */
export function ResultadosGeraisPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  // O dev também entra, nos projetos dos times dele (spec 059, RN-01 e RN-02).
  const permitido = ["ADMIN_UNIDADE", "GERENTE", "KP", "USUARIO_PADRAO"].includes(perfil.perfil_codigo ?? "") && perfil.permissoes.includes("form_factor.consultar");
  const projetosQuery = useProjetosSeletor(perfil, permitido);
  const todos = projetosQuery.data?.pages.flatMap((pagina) => pagina.items) ?? [];
  const [comEncerrados, setComEncerrados] = useState(false);
  const projetos = filtrarEncerrados(todos, comEncerrados);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = projetosQuery;
  useEffect(() => {
    if (permitido && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [permitido, fetchNextPage, hasNextPage, isFetchingNextPage]);

  // O projeto fica em ?projeto= (mesmo encerrado, com a aba dele); um id fora da lista abre o primeiro visível, mas só
  // depois de carregar todas as páginas, porque o id do link pode estar numa delas.
  const [parametros, setParametros] = useSearchParams();
  const pedido = parametros.get("projeto");
  const projetoAberto = todos.find((projeto) => projeto.id === pedido) ?? (pedido && hasNextPage ? undefined : projetos[0]);
  const abas = filtrarEncerrados(todos, comEncerrados, projetoAberto?.id);
  // Três abas por vez. As setas abrem o projeto vizinho; a janela só anda quando ele estaria fora dela, e a última
  // posição escolhida fica enquanto o projeto aberto estiver à vista.
  const indiceAberto = Math.max(0, abas.findIndex((projeto) => projeto.id === projetoAberto?.id));
  const [inicioJanela, setInicioJanela] = useState(0);
  const inicio = Math.min(Math.max(0, abas.length - ABAS_POR_VEZ), indiceAberto < inicioJanela ? indiceAberto : indiceAberto >= inicioJanela + ABAS_POR_VEZ ? indiceAberto - ABAS_POR_VEZ + 1 : inicioJanela);
  const abasVisiveis = abas.slice(inicio, inicio + ABAS_POR_VEZ);
  const [direcaoAbas, setDirecaoAbas] = useState<"proximo" | "anterior">();
  const projetoId = projetoAberto?.id ?? "";
  const tabela = useTabelaHistorico(projetoId, perfil);
  const { filtros, alterarFiltros } = tabela;

  function trocarProjeto(id: string) {
    // replace: a troca não entra no histórico, então voltar no navegador não reabre um projeto com os filtros de outro.
    setParametros({ projeto: id }, { replace: true });
    tabela.limparFiltros();
  }

  // Desligar a pílula num projeto encerrado volta para o primeiro aberto (ou para o estado vazio, se não houver).
  function alternarEncerrados(ligado: boolean) {
    setComEncerrados(ligado);
    if (ligado || !projetoAberto || !projetoEncerrado(projetoAberto.status)) return;
    const primeiroAberto = filtrarEncerrados(todos, false)[0];
    if (primeiroAberto) trocarProjeto(primeiroAberto.id);
    else setParametros({}, { replace: true });
  }

  function irParaVizinho(passo: 1 | -1) {
    const destino = indiceAberto + passo;
    const novoInicio = destino < inicio ? destino : destino >= inicio + ABAS_POR_VEZ ? destino - ABAS_POR_VEZ + 1 : inicio;
    setInicioJanela(novoInicio);
    setDirecaoAbas(passo > 0 ? "proximo" : "anterior");
    trocarProjeto(abas[destino].id);
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
  if (projetosQuery.isLoading || (!projetoAberto && hasNextPage)) return <PageCard>{cabecalho}<p role="status" className="text-[14px] text-muted">{t("loading")}</p></PageCard>;
  if (!todos.length) {
    return <PageCard>
      {cabecalho}
      <EstadoVazio className="m-auto" titulo={t("noAccessibleProjects")} dica={t("noAccessibleProjectsHint")} />
    </PageCard>;
  }
  if (!projetoAberto) {
    return <PageCard>
      {cabecalho}
      <div className="flex justify-end"><FiltroEncerrados existem={temEncerrados(todos)} ligado={comEncerrados} onChange={alternarEncerrados} /></div>
      <EstadoVazio className="m-auto" titulo={t("noOpenProjects")} dica={t("noOpenProjectsHint")} />
    </PageCard>;
  }

  return <PageCard>
    {cabecalho}
    <PageTabs
      aria-label={t("generalResults")}
      // Só o nome do app, sem a versão (spec 059, RN-07).
      tabs={abasVisiveis.map((projeto) => ({ id: projeto.id, label: projeto.app }))}
      direcaoAbas={direcaoAbas}
      navegacao={abas.length > ABAS_POR_VEZ && <>
        <Button isIconOnly size="sm" variant="ghost" className={classeSeta} aria-label={t("previousProject")} isDisabled={indiceAberto === 0} onPress={() => irParaVizinho(-1)}>
          <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={2} />
        </Button>
        <Button isIconOnly size="sm" variant="ghost" className={classeSeta} aria-label={t("nextProject")} isDisabled={indiceAberto === abas.length - 1} onPress={() => irParaVizinho(1)}>
          <ChevronRight aria-hidden="true" className="size-4" strokeWidth={2} />
        </Button>
      </>}
      selectedKey={projetoId}
      onSelectionChange={trocarProjeto}
      actions={<>
        {/* Vindo do estado vazio, a pílula é outra: o foco passa para ela. */}
        <FiltroEncerrados existem={temEncerrados(todos)} ligado={comEncerrados} onChange={alternarEncerrados} autoFocus={comEncerrados} />
        <WeekPickerHero permitirDia label={t("dayOrWeek")} value={filtros.periodo ?? ""} onChange={(valor) => alterarFiltros({ ...filtros, periodo: valor || undefined })} />
        {/* Pílula cinza na altura do filtro de dia ou semana ao lado (design da spec 059). */}
        {tabela.temFiltros && <Button variant="ghost" onPress={tabela.limparFiltros} className="rounded-full bg-panel px-4 font-medium text-body shadow-none transition-[background-color,transform] duration-100 ease-out hover:bg-default data-[pressed]:scale-[0.97] motion-reduce:transition-none motion-reduce:data-[pressed]:scale-100 dark:text-muted">{t("clearFilters")}</Button>}
        <AcoesGerenciaFormFactor projetoId={projetoId} perfil={perfil} />
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
