import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import { PageCard, PageTitle } from "@/shared/ui/page-card";
import { PageTabPanel, PageTabs } from "@/shared/ui/page-tabs";
import { WeekPickerHero } from "@/shared/ui/week-picker-hero";
import { useFormFactorGlobal, useFormFactorResultadosGlobais, useProjetosSeletor } from "../hooks/useProjetos";
import type { FiltrosFormFactorGlobal } from "../model/projeto";
import { FormFactorGlobalResultadosTabela, FormFactorGlobalTabela } from "../components/form-factor/FormFactorGlobalTabela";

type Visao = "summary" | "results";

const filtrosIniciais: FiltrosFormFactorGlobal = {
  page: 1,
  pageSize: DEFAULT_TABLE_PAGE_SIZE,
  projetoId: "",
  responsavelId: "",
  tcId: "",
  sdfId: "",
  modeloDispositivoId: "",
  resultado: "",
  origem: undefined,
};

export function ResultadosGeraisPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const permitido = ["ADMIN_UNIDADE", "GERENTE", "KP"].includes(perfil.perfil_codigo ?? "") && perfil.permissoes.includes("form_factor.consultar");
  const [visao, setVisao] = useState<Visao>("summary");
  const [semana, setSemana] = useState("");
  const [filtros, setFiltros] = useState(filtrosIniciais);
  const projetosQuery = useProjetosSeletor(perfil, permitido);
  const projetos = projetosQuery.data?.pages.flatMap((pagina) => pagina.items) ?? [];
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = projetosQuery;
  useEffect(() => {
    if (permitido && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [permitido, fetchNextPage, hasNextPage, isFetchingNextPage]);
  const consulta = {
    ...filtros,
    semana: semana || undefined,
    page: filtros.page ?? 1,
    pageSize: filtros.pageSize ?? DEFAULT_TABLE_PAGE_SIZE,
  };
  const resumo = useFormFactorGlobal(consulta, perfil, permitido && visao === "summary");
  const historico = useFormFactorResultadosGlobais(consulta, perfil, permitido && visao === "results");

  function alterarFiltro(campo: keyof FiltrosFormFactorGlobal, valor: string) {
    setFiltros((atual) => ({ ...atual, [campo]: valor, page: 1 }));
  }

  function limparFiltros() {
    setSemana("");
    setFiltros({ ...filtrosIniciais });
  }

  const temFiltros = Boolean(semana || filtros.projetoId || filtros.responsavelId || filtros.tcId || filtros.sdfId || filtros.modeloDispositivoId || filtros.resultado || filtros.origem);

  if (!permitido) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;

  const paginacao = {
    page: filtros.page ?? 1,
    pageSize: filtros.pageSize ?? DEFAULT_TABLE_PAGE_SIZE,
    onPageChange: (page: number) => setFiltros((atual) => ({ ...atual, page })),
    onPageSizeChange: (pageSize: number) => setFiltros((atual) => ({ ...atual, page: 1, pageSize })),
  };
  const comuns = { projetos, filtros, onFiltroChange: alterarFiltro, temFiltros, onLimparFiltros: limparFiltros, ...paginacao };

  return <PageCard>
    <header className="mb-[25px] flex shrink-0 flex-wrap items-start gap-4">
      <div className="min-w-0 flex-1">
        <PageTitle>{t("generalResults")}</PageTitle>
        <p className="mt-1.5 text-[14px] leading-5 text-muted">{t("generalResultsDescription")}</p>
      </div>
      <WeekPickerHero label={t("week")} value={semana} onChange={(value) => { setSemana(value); setFiltros((atual) => ({ ...atual, page: 1 })); }} className="ml-auto" />
    </header>

    <PageTabs
      aria-label={t("generalResultsViews")}
      tabs={[{ id: "summary", label: t("formFactorSummary") }, { id: "results", label: t("generalResultsAll") }]}
      selectedKey={visao}
      onSelectionChange={(chave) => { setVisao(chave as Visao); setFiltros((atual) => ({ ...atual, page: 1 })); }}
      actions={<>
        <p className="text-[14px] text-muted">{t(visao === "summary" ? "formFactorSummaryHint" : "generalResultsAllHint")}</p>
        {temFiltros && <Button variant="ghost" size="sm" onPress={limparFiltros}>{t("clearFilters")}</Button>}
      </>}
    >
      <PageTabPanel id="summary" className="flex min-h-0 flex-1 flex-col p-0">
        <FormFactorGlobalTabela dados={resumo.data} carregando={resumo.isLoading} erro={resumo.isError || projetosQuery.isError} {...comuns} />
      </PageTabPanel>
      <PageTabPanel id="results" className="flex min-h-0 flex-1 flex-col p-0">
        <FormFactorGlobalResultadosTabela dados={historico.data} carregando={historico.isLoading} erro={historico.isError || projetosQuery.isError} {...comuns} />
      </PageTabPanel>
    </PageTabs>
  </PageCard>;
}
