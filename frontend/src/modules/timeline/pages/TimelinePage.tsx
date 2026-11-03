import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useOutletContext, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { ProjetoSwitcher } from "@/modules/projetos/components/ProjetoSwitcher";
import { DetalhesCasoTesteDrawer } from "@/modules/projetos/components/casos-teste/DetalhesCasoTesteDrawer";
import { useProjetosSeletor } from "@/modules/projetos/hooks/useProjetos";
import type { CasoTesteResumo } from "@/modules/projetos/model/projeto";
import { formatarDiaIso } from "@/shared/lib/utils";
import { AvatarUsuario } from "@/shared/ui/avatar-usuario";
import { ErroComRetry } from "@/shared/ui/erro-com-retry";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { MultiSelectCombobox } from "@/shared/ui/multi-select-combobox";
import { PageCard, PageTitle } from "@/shared/ui/page-card";
import { PilhaAvatares } from "@/shared/ui/pilha-avatares";

import { AlteracoesCardDrawer } from "../components/AlteracoesCardDrawer";
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
  const projetos = projetosQuery.data?.pages.flatMap((pagina) => pagina.items) ?? [];
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = projetosQuery;
  useEffect(() => {
    if (permitido && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [permitido, fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Como na General Results (spec 053): o projeto fica em ?projeto=, e sem ele (ou fora da lista) abre o primeiro.
  const [parametros, setParametros] = useSearchParams();
  const pedido = parametros.get("projeto");
  const projetoAberto = projetos.find((projeto) => projeto.id === pedido) ?? (pedido && hasNextPage ? undefined : projetos[0]);
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

  function trocarVisao(nova: VisaoTimeline) {
    setVisao(nova);
    // A visão nova parte do primeiro dia da atual: da Semana para o Mês, vale o mês da segunda-feira (CA-05).
    setPeriodo(periodoDe(nova, periodo.inicio));
  }

  if (!permitido) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;

  const cabecalho = <header className="mb-6 flex shrink-0 flex-wrap items-start gap-4">
    <div className="min-w-0 flex-1">
      {projetoAberto
        ? <ProjetoSwitcher projetoId={projetoAberto.id} nome={projetoAberto.nome} projetos={projetos} buscavel onEscolher={trocarProjeto} />
        : <PageTitle>{t("timeline")}</PageTitle>}
      <p className="mt-1.5 text-[14px] leading-5 text-muted">{t("timelineDescription")}</p>
    </div>
    {dados && <PilhaAvatares pessoas={dados.pessoas} rotulo={t("timelinePeopleInPeriod")} rotuloMais={(count) => t("timelineMorePeople", { count })} />}
  </header>;

  if (projetosQuery.isError) {
    return <PageCard>{cabecalho}<ErroComRetry mensagem={t("timelineLoadError")} retry={{ label: t("retryQuery"), onRetry: () => void projetosQuery.refetch() }} /></PageCard>;
  }
  if (projetosQuery.isLoading) return <PageCard>{cabecalho}<p role="status" className="text-[14px] text-muted">{t("loading")}</p></PageCard>;
  if (!projetos.length) {
    return <PageCard>
      {cabecalho}
      <EstadoVazio className="mx-auto mt-10" titulo={t("noAccessibleProjects")} dica={t("noAccessibleProjectsHint")} />
    </PageCard>;
  }

  const barra = <div className="mb-5 flex shrink-0 flex-wrap items-start gap-3 border-b border-separator pb-5">
    <ToggleButtonGroup
      aria-label={t("timelineViews")}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[visao]}
      onSelectionChange={(chaves) => { const [chave] = chaves; if (chave) trocarVisao(chave as VisaoTimeline); }}
      className="w-fit gap-0 rounded-xl bg-panel p-1"
    >
      {VISOES.map(({ id, rotulo }) => (
        <ToggleButton key={id} id={id} className="h-8 min-w-16 rounded-lg border-0 bg-transparent px-4 text-[13px] font-medium text-body shadow-none data-[selected=true]:bg-surface data-[selected=true]:text-accent-text data-[selected=true]:shadow-sm">
          {t(rotulo)}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
    <div className="flex h-10 items-center gap-1 rounded-xl border border-edge px-1">
      <Button isIconOnly variant="ghost" size="sm" aria-label={t("previousPeriod")} onPress={() => setPeriodo(avancar(visao, periodo, -1))}>
        <ChevronLeft aria-hidden="true" className="size-4" />
      </Button>
      <span aria-live="polite" className="min-w-28 text-center text-[13px] tabular-nums text-body">{rotuloPeriodo(visao, periodo)}</span>
      <Button isIconOnly variant="ghost" size="sm" aria-label={t("nextPeriod")} onPress={() => setPeriodo(avancar(visao, periodo, 1))}>
        <ChevronRight aria-hidden="true" className="size-4" />
      </Button>
    </div>
    <Button variant="outline" size="sm" className="h-10" onPress={() => setPeriodo(periodoDe(visao, new Date()))}>{t("today")}</Button>
    <div className="ml-auto grid w-full gap-3 sm:w-auto sm:grid-cols-2">
      <div className="sm:w-56">
        <MultiSelectCombobox
          label={t("timelinePeople")}
          placeholder={t("timelinePeoplePlaceholder")}
          options={opcoes(dados?.pessoas.map((pessoa) => pessoa.id) ?? [], filtros.responsavelIds)}
          value={filtros.responsavelIds}
          onValueChange={(responsavelIds) => setFiltros({ ...filtros, responsavelIds })}
          emptyLabel={t("noResults")}
          removeLabel={(nome) => t("removeSelectedModel", { name: nome })}
        />
      </div>
      <div className="sm:w-56">
        <MultiSelectCombobox
          label={t("timelineCases")}
          placeholder={t("timelineCasesPlaceholder")}
          options={opcoes(dados?.casos.map((caso) => caso.id) ?? [], filtros.casoIds)}
          value={filtros.casoIds}
          onValueChange={(casoIds) => setFiltros({ ...filtros, casoIds })}
          emptyLabel={t("noResults")}
          removeLabel={(nome) => t("removeSelectedModel", { name: nome })}
        />
      </div>
    </div>
  </div>;

  const vazio = <div role="status" className="grid justify-items-center gap-3 text-center">
    <p className="text-[14px] text-muted">{t("timelineEmpty")}</p>
    {temFiltros && <Button variant="outline" size="sm" onPress={() => setFiltros(SEM_FILTROS)}>{t("clearFilters")}</Button>}
  </div>;

  return <PageCard>
    {cabecalho}
    {barra}
    {timeline.isError
      ? <ErroComRetry mensagem={t("timelineLoadError")} retry={{ label: t("retryQuery"), onRetry: () => void timeline.refetch() }} />
      : !dados
        ? <p role="status" className="text-[14px] text-muted">{t("loading")}</p>
        : <TimelineGrade visao={visao} periodo={periodo} cards={dados.cards} onAbrir={setCardAberto} vazio={vazio} />}
    <AlteracoesCardDrawer card={cardAberto} onFechar={() => setCardAberto(null)} onAbrirCaso={(caso) => { setCardAberto(null); setCasoAberto(caso); }} />
    <DetalhesCasoTesteDrawer caso={casoAberto} perfil={perfil} onFechar={() => setCasoAberto(null)} />
  </PageCard>;
}
