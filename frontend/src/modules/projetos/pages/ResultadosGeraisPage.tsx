import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { Button } from "@/shared/ui/button";
import { WeekPicker } from "@/shared/ui/week-picker";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/ui/table";
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
  const tablistRef = useRef<HTMLDivElement>(null);
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

  function alternarComTeclado(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const proxima = event.key === "Home" ? "summary" : event.key === "End" ? "results" : visao === "summary" ? "results" : "summary";
    setVisao(proxima);
    setFiltros((atual) => ({ ...atual, page: 1 }));
    requestAnimationFrame(() => tablistRef.current?.querySelector<HTMLButtonElement>(`[data-view="${proxima}"]`)?.focus());
  }

  if (!permitido) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;

  return <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-[#EEEEF1] bg-card px-4 py-5 sm:rounded-[42px] sm:px-11 sm:py-10">
    <header className="mb-5 flex shrink-0 flex-wrap items-start gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-medium text-foreground">{t("generalResults")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("generalResultsDescription")}</p>
      </div>
      <WeekPicker label={t("week")} value={semana} onChange={(value) => { setSemana(value); setFiltros((atual) => ({ ...atual, page: 1 })); }} />
    </header>

    <div className="mb-4 flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-border">
      <div ref={tablistRef} role="tablist" aria-label={t("generalResultsViews")} onKeyDown={alternarComTeclado} className="flex gap-4">
        {(["summary", "results"] as const).map((view) => <button
          key={view}
          id={`general-results-${view}-tab`}
          data-view={view}
          type="button"
          role="tab"
          aria-selected={visao === view}
          aria-controls={`general-results-${view}-panel`}
          tabIndex={visao === view ? 0 : -1}
          onClick={() => { setVisao(view); setFiltros((atual) => ({ ...atual, page: 1 })); }}
          className={`relative px-0.5 pb-2 text-base transition-colors ${visao === view ? "text-primary" : "text-foreground hover:text-primary"}`}
        >
          {t(view === "summary" ? "formFactorSummary" : "generalResultsAll")}
          {visao === view && <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
        </button>)}
      </div>
      <div className="mb-2 flex items-center gap-3">
        <p className="text-sm text-muted-foreground">{t(visao === "summary" ? "formFactorSummaryHint" : "generalResultsAllHint")}</p>
        {temFiltros && <Button variant="ghost" size="sm" onClick={limparFiltros}>{t("clearFilters")}</Button>}
      </div>
    </div>

    <div id="general-results-summary-panel" role="tabpanel" aria-labelledby="general-results-summary-tab" hidden={visao !== "summary"} className="flex min-h-0 flex-1 flex-col">
      <FormFactorGlobalTabela
        dados={resumo.data}
        carregando={resumo.isLoading}
        erro={resumo.isError || projetosQuery.isError}
        projetos={projetos}
        filtros={filtros}
        onFiltroChange={alterarFiltro}
        temFiltros={temFiltros}
        onLimparFiltros={limparFiltros}
        page={filtros.page ?? 1}
        pageSize={filtros.pageSize ?? DEFAULT_TABLE_PAGE_SIZE}
        onPageChange={(page) => setFiltros((atual) => ({ ...atual, page }))}
        onPageSizeChange={(pageSize) => setFiltros((atual) => ({ ...atual, page: 1, pageSize }))}
      />
    </div>
    <div id="general-results-results-panel" role="tabpanel" aria-labelledby="general-results-results-tab" hidden={visao !== "results"} className="flex min-h-0 flex-1 flex-col">
      <FormFactorGlobalResultadosTabela
        dados={historico.data}
        carregando={historico.isLoading}
        erro={historico.isError || projetosQuery.isError}
        projetos={projetos}
        filtros={filtros}
        onFiltroChange={alterarFiltro}
        temFiltros={temFiltros}
        onLimparFiltros={limparFiltros}
        page={filtros.page ?? 1}
        pageSize={filtros.pageSize ?? DEFAULT_TABLE_PAGE_SIZE}
        onPageChange={(page) => setFiltros((atual) => ({ ...atual, page }))}
        onPageSizeChange={(pageSize) => setFiltros((atual) => ({ ...atual, page: 1, pageSize }))}
      />
    </div>
  </section>;
}
