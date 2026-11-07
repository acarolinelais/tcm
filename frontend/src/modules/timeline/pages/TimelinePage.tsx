import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { useOutletContext, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { ProjetoSwitcher } from "@/modules/projetos/components/ProjetoSwitcher";
import { DetalhesCasoTesteDrawer } from "@/modules/projetos/components/casos-teste/DetalhesCasoTesteDrawer";
import { useProjetosSeletor } from "@/modules/projetos/hooks/useProjetos";
import { filtrarEncerrados, projetoEncerrado, type CasoTesteResumo } from "@/modules/projetos/model/projeto";
import { formatarDiaIso } from "@/shared/lib/utils";
import { AvatarUsuario } from "@/shared/ui/avatar-usuario";
import { ErroComRetry } from "@/shared/ui/erro-com-retry";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { FiltroEncerrados } from "@/shared/ui/filtro-encerrados";
import { PageCard, PageTitle } from "@/shared/ui/page-card";
import { PilhaAvatares } from "@/shared/ui/pilha-avatares";

import { AlteracoesCardDrawer } from "../components/AlteracoesCardDrawer";
import { TimelineFiltros } from "../components/TimelineFiltros";
import { TimelineGrade } from "../components/TimelineGrade";
import { useTimeline } from "../hooks/useTimeline";
import type { CardTimeline, FiltrosTimeline, VisaoTimeline } from "../model/timeline";
import { avancar, periodoDe, rotuloPeriodo } from "../utils/periodo";

const SEM_FILTROS: FiltrosTimeline = { responsavelIds: [], casoIds: [] };
const VISOES: { id: VisaoTimeline; rotulo: string }[] = [
  { id: "dia", rotulo: "viewDay" },
  { id: "semana", rotulo: "viewWeek" },
  { id: "mes", rotulo: "viewMonth" },
];

/** Timeline dos Test Cases de um projeto (spec 054): as mudanças por dia, com filtros por pessoa e por caso. */
export function TimelinePage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const permitido = perfil.perfil_codigo === "ADMIN_UNIDADE" || perfil.permissoes.includes("test_cases.consultar");
  const projetosQuery = useProjetosSeletor(perfil, permitido);
  const todos = projetosQuery.data?.pages.flatMap((pagina) => pagina.items) ?? [];
  const [comEncerrados, setComEncerrados] = useState(false);
  const projetos = filtrarEncerrados(todos, comEncerrados);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = projetosQuery;
  useEffect(() => {
    if (permitido && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [permitido, fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Como na General Results: o projeto fica em ?projeto= (mesmo encerrado); sem ele, ou fora da lista, abre o primeiro visível.
  const [parametros, setParametros] = useSearchParams();
  const pedido = parametros.get("projeto");
  const projetoAberto = todos.find((projeto) => projeto.id === pedido) ?? (pedido && hasNextPage ? undefined : projetos[0]);
  const projetoId = projetoAberto?.id ?? null;

  const [visao, setVisao] = useState<VisaoTimeline>("semana");
  const [periodo, setPeriodo] = useState(() => periodoDe("semana", new Date()));
  const [filtros, setFiltros] = useState(SEM_FILTROS);
  const [cardAberto, setCardAberto] = useState<CardTimeline | null>(null);
  const [casoAberto, setCasoAberto] = useState<CasoTesteResumo | null>(null);
  const timeline = useTimeline(projetoId, formatarDiaIso(periodo.inicio), formatarDiaIso(periodo.fim), filtros, perfil);
  const dados = timeline.data;

  // Uma escolha sem mudanças no período novo continua marcada (RN-07): o nome dela vem do período em que apareceu.
  const rotulos = useRef(new Map<string, { label: string; description?: string | null; icone?: ReactNode }>());
  dados?.pessoas.forEach((pessoa) => rotulos.current.set(pessoa.id, { label: pessoa.nome, icone: <AvatarUsuario cor={pessoa.cor_avatar} /> }));
  dados?.casos.forEach((caso) => rotulos.current.set(caso.id, { label: caso.tc_id, description: caso.title }));
  const opcoes = (ids: string[], escolhidos: string[]) =>
    [...new Set([...ids, ...escolhidos])].map((id) => ({ value: id, ...(rotulos.current.get(id) ?? { label: id }) }));
  const temFiltros = filtros.responsavelIds.length > 0 || filtros.casoIds.length > 0;

  function trocarProjeto(id: string) {
    // replace: voltar no navegador não reabre um projeto com os filtros de outro (spec 053).
    setParametros({ projeto: id }, { replace: true });
    setFiltros(SEM_FILTROS);
  }

  // Desligar a pílula num projeto encerrado volta para o primeiro aberto (ou para o estado vazio, se não houver).
  function alternarEncerrados(ligado: boolean) {
    setComEncerrados(ligado);
    if (ligado || !projetoAberto || !projetoEncerrado(projetoAberto.status)) return;
    const primeiroAberto = filtrarEncerrados(todos, false)[0];
    if (primeiroAberto) trocarProjeto(primeiroAberto.id);
    else setParametros({}, { replace: true });
  }

  function trocarVisao(nova: VisaoTimeline) {
    setVisao(nova);
    // A visão nova parte do primeiro dia da atual: da Semana para o Mês, vale o mês da segunda-feira (CA-05).
    setPeriodo(periodoDe(nova, periodo.inicio));
  }

  if (!permitido) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;

  const cabecalho = <header className="mb-5 flex shrink-0 flex-wrap items-start justify-between gap-4">
    <div className="grid min-w-0 gap-2">
      <PageTitle>{t("timeline")}</PageTitle>
      <p className="text-[15px] leading-[21px] text-subtle">{t("timelineDescription")}</p>
    </div>
    {dados && <PilhaAvatares pessoas={dados.pessoas} rotulo={t("timelinePeopleInPeriod")} rotuloMais={(count) => t("timelineMorePeople", { count })} />}
  </header>;

  if (projetosQuery.isError) {
    return <PageCard>{cabecalho}<ErroComRetry mensagem={t("timelineLoadError")} retry={{ label: t("retryQuery"), onRetry: () => void projetosQuery.refetch() }} /></PageCard>;
  }
  if (projetosQuery.isLoading || (!projetoAberto && hasNextPage)) return <PageCard>{cabecalho}<p role="status" className="text-[14px] text-muted">{t("loading")}</p></PageCard>;
  if (!todos.length) {
    return <PageCard>
      {cabecalho}
      <EstadoVazio className="m-auto" titulo={t("noAccessibleProjects")} dica={t("noAccessibleProjectsHint")} />
    </PageCard>;
  }

  const barra = <div className="mb-5 flex shrink-0 flex-wrap items-center gap-3 border-b border-separator pb-5">
    {projetoAberto && <div className="min-w-0"><ProjetoSwitcher comoTitulo={false} projetoId={projetoAberto.id} nome={projetoAberto.app} projetos={filtrarEncerrados(todos, comEncerrados, projetoAberto.id)} buscavel onEscolher={trocarProjeto} /></div>}
    {/* Como no frame 2550:3921: o projeto à esquerda e, agrupados à direita, as visões, o intervalo, o Hoje e o Filter. */}
    <div className="ml-auto flex flex-wrap items-center gap-3">
      <FiltroEncerrados ligado={comEncerrados} onChange={alternarEncerrados} />
      <ToggleButtonGroup
        aria-label={t("timelineViews")}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[visao]}
        onSelectionChange={(chaves) => { const [chave] = chaves; if (chave) trocarVisao(chave as VisaoTimeline); }}
        className="w-fit gap-0 rounded-full bg-panel p-1"
      >
        {VISOES.map(({ id, rotulo }) => (
          <ToggleButton key={id} id={id} className="h-8 min-w-16 rounded-full border-0 bg-transparent px-4 text-[13px] font-medium text-body shadow-none data-[selected=true]:bg-surface data-[selected=true]:text-accent-text data-[selected=true]:shadow-sm">
            {t(rotulo)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <div className="flex h-9 items-center gap-1 rounded-full border border-edge px-1">
        <Button isIconOnly variant="ghost" size="sm" aria-label={t("previousPeriod")} onPress={() => setPeriodo(avancar(visao, periodo, -1))}>
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Button>
        <span aria-live="polite" className="min-w-28 text-center text-[13px] tabular-nums text-body">{rotuloPeriodo(visao, periodo)}</span>
        <Button isIconOnly variant="ghost" size="sm" aria-label={t("nextPeriod")} onPress={() => setPeriodo(avancar(visao, periodo, 1))}>
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
      <Button variant="outline" className="rounded-full" onPress={() => setPeriodo(periodoDe(visao, new Date()))}>{t("today")}</Button>
      <TimelineFiltros
          opcoesPessoas={opcoes(dados?.pessoas.map((pessoa) => pessoa.id) ?? [], filtros.responsavelIds)}
          opcoesCasos={opcoes(dados?.casos.map((caso) => caso.id) ?? [], filtros.casoIds)}
          filtros={filtros}
          onAlterar={setFiltros}
          onLimpar={() => setFiltros(SEM_FILTROS)}
        />
    </div>
  </div>;

  const vazio = <EstadoVazio
    titulo={t("timelineEmpty")}
    dica={t(temFiltros ? "kanbanNoMatchesHint" : "timelineEmptyHint")}
    icone={temFiltros ? <SearchX aria-hidden="true" className="size-7" /> : undefined}
  >
    {temFiltros && <Button variant="outline" size="sm" className="mt-5" onPress={() => setFiltros(SEM_FILTROS)}>{t("clearFilters")}</Button>}
  </EstadoVazio>;

  return <PageCard>
    {cabecalho}
    {barra}
    {!projetoAberto
      ? <EstadoVazio className="m-auto" titulo={t("noOpenProjects")} dica={t("noOpenProjectsHint")} />
      : timeline.isError
      ? <ErroComRetry mensagem={t("timelineLoadError")} retry={{ label: t("retryQuery"), onRetry: () => void timeline.refetch() }} />
      : !dados
        ? <p role="status" className="text-[14px] text-muted">{t("loading")}</p>
        : <TimelineGrade visao={visao} periodo={periodo} cards={dados.cards} onAbrir={setCardAberto} vazio={vazio} />}
    <AlteracoesCardDrawer card={cardAberto} onFechar={() => setCardAberto(null)} onAbrirCaso={(caso) => { setCardAberto(null); setCasoAberto(caso); }} />
    <DetalhesCasoTesteDrawer caso={casoAberto} perfil={perfil} onFechar={() => setCasoAberto(null)} />
  </PageCard>;
}
