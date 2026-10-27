import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, Pencil, Plus, UploadCloud } from "lucide-react";
import { useOutletContext, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { formatDate } from "@/core/i18n/format";
import { timesApi } from "@/modules/times/api/times.api";
import { Button } from "@/shared/ui/button";
import { DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, Dialog } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { DEFAULT_TABLE_PAGE_SIZE, Table, TableBody, TableCell, TableHead, TableHeader, TableLayout, TablePagination, TableRow } from "@/shared/ui/table";
import { TableRowActions } from "@/shared/ui/table-row-actions";
import { WeekPicker } from "@/shared/ui/week-picker";

import { FormFactorTabela } from "../components/form-factor/FormFactorTabela";
import { FormFactorManualDialog } from "../components/form-factor/FormFactorManualDialog";
import { FormFactorCriarRodadaDialog } from "../components/FormFactorCriarRodadaDialog";
import { CategoriaBadge, DificuldadeBadge, SituacaoBadge } from "../components/AtributosCasoBadge";
import { atributoCasoBadgeClass } from "../components/atributos-caso-badge-estilos";
import { FormFactorResultadosTabela } from "../components/form-factor/FormFactorResultadosTabela";
import { ProjetoSwitcher } from "../components/ProjetoSwitcher";
import { CasosTesteEmptyState } from "../components/CasosTesteEmptyState";
import { StatusBadgeContent, StatusPill } from "../components/status/StatusBadge";
import { statusBadgeBase, statusBadges } from "../components/status/status-badge-estilos";
import { ProjetosEntradaPage } from "./ProjetosEntradaPage";
import { useCasosTeste, useCriarRodadaFormFactor, useFormFactor, useFormFactorResultados, useRegistrarResultadosRodadaFormFactor } from "../hooks/useProjetos";
import { TableColumnFilter } from "@/shared/ui/table-column-filter";
import { toast } from "@/shared/lib/toast";
import { formatarDiaIso } from "@/shared/lib/utils";

import { casosTesteApi, formFactorApi, projetosApi, type CasoTeste, type CategoriaCasoTeste, type DificuldadeCasoTeste, type SituacaoCasoTeste } from "../api/projetos.api";
import { CATEGORIAS_CASO_TESTE as categorias, DIFICULDADES_CASO_TESTE as dificuldades, opcoesStatusResponsavel, ROTULO_SITUACAO, ROTULO_STATUS, SITUACOES_CASO_TESTE, STATUS_CASO_TESTE, type LinhaFormFactor, type StatusCasoTeste } from "../model/projeto";

const difficultyLabels: Record<DificuldadeCasoTeste, string> = { Low: "difficultyLow", Medium: "difficultyMedium", High: "difficultyHigh" };
/** Só os campos que mudaram: reenviar o resto desfaria edições feitas por outra pessoa enquanto o drawer estava aberto. */
function camposAlterados(original: CasoTeste, editado: Pick<CasoTeste, "category" | "difficulty" | "situation" | "status" | "responsavel_id" | "backup_id">) {
  return Object.fromEntries(Object.entries(editado).filter(([campo, valor]) => original[campo as keyof typeof editado] !== valor)) as Partial<typeof editado>;
}

export function ProjetoDetalhePage() {
  const { projetoId = "" } = useParams();
  // key: ao trocar de projeto, filtros, página e aba voltam ao estado inicial.
  return <ProjetoDetalhe key={projetoId} />;
}

function ProjetoDetalhe() {
  const { t, i18n } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const { projetoId = "" } = useParams();
  const client = useQueryClient();
  const [aba, setAba] = useState<"cases" | "form-factor">(perfil.perfil_codigo === "ADMIN_UNIDADE" || perfil.permissoes.includes("test_cases.consultar") ? "cases" : "form-factor");
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtrosCaso, setFiltrosCaso] = useState({ tcId: "", status: "", situation: "", assignee: "", difficulty: "", category: "", endDate: "", backup: "" });
  const [criarAberto, setCriarAberto] = useState(false);
  const [editar, setEditar] = useState<CasoTeste | null>(null);
  const [tcId, setTcId] = useState("");
  const [category, setCategory] = useState<CategoriaCasoTeste>("A");
  const [difficulty, setDifficulty] = useState<DificuldadeCasoTeste>("Low");
  const [situation, setSituation] = useState<SituacaoCasoTeste | "">("");
  const [status, setStatus] = useState<StatusCasoTeste>("To-Do");
  const [responsavelId, setResponsavelId] = useState("");
  const [backupId, setBackupId] = useState("");
  const [semana, setSemana] = useState("");
  const [assigneeFormFactor, setAssigneeFormFactor] = useState("");
  const [filtrosResumo, setFiltrosResumo] = useState({ tcId: "", sdfId: "", modeloDispositivoId: "", resultado: "" });
  const [visaoFormFactor, setVisaoFormFactor] = useState<"summary" | "results">("summary");
  const [filtrosResultados, setFiltrosResultados] = useState({ tcId: "", sdfId: "", responsavelId: "", origem: "", modeloDispositivoId: "", resultado: "" });
  const [linhaManual, setLinhaManual] = useState<LinhaFormFactor | null>(null);
  const [abrirCriacaoRodada, setAbrirCriacaoRodada] = useState(false);
  const [semanaCasos, setSemanaCasos] = useState("");
  const [arquivoSdf, setArquivoSdf] = useState<File | null>(null);
  const inputSdf = useRef<HTMLInputElement>(null);
  const abasRef = useRef<HTMLDivElement>(null);
  const visoesFormFactorRef = useRef<HTMLElement>(null);
  const [indicador, setIndicador] = useState<{ left: number; width: number } | null>(null);

  const admin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  const dev = perfil.perfil_codigo === "USUARIO_PADRAO";
  const podeConsultar = admin || perfil.permissoes.includes("projetos.consultar") || perfil.permissoes.includes("test_cases.consultar");
  const podeGerenciarCasos = admin || (["GERENTE", "KP"].includes(perfil.perfil_codigo ?? "") && perfil.permissoes.includes("test_cases.gerenciar"));
  const podeConsultarCasos = admin || perfil.permissoes.includes("test_cases.consultar");
  const podeConsultarFormFactor = admin || perfil.permissoes.includes("form_factor.consultar");
  const perfilGestao = admin || ["GERENTE", "KP"].includes(perfil.perfil_codigo ?? "");
  const podeCriarRodada = perfilGestao && (admin || perfil.permissoes.includes("form_factor.registrar"));
  const podeImportarSdf = perfilGestao && (admin || perfil.permissoes.includes("form_factor.importar"));
  const podeRegistrarResultado = admin || (["GERENTE", "KP", "USUARIO_PADRAO"].includes(perfil.perfil_codigo ?? "") && perfil.permissoes.includes("form_factor.registrar"));
  const podeRegistrarLinha = (linha: LinhaFormFactor) => Boolean(linha.rodada_pendente_id) && (perfilGestao || linha.responsavel_id === perfil.id || linha.backup_id === perfil.id);
  const projeto = useQuery({ queryKey: ["projetos", "detalhe", projetoId, perfil.unidade_id, perfil.id], queryFn: () => projetosApi.obter(projetoId), enabled: podeConsultar && Boolean(projetoId) });
  const casos = useCasosTeste(projetoId, pagina, tamanhoPagina, { responsavelId: filtrosCaso.assignee || undefined, ...(dev ? { associadosAMim: true } : {}), ...(semanaCasos ? { semana: semanaCasos } : {}) }, perfil, Boolean(projeto.isSuccess && podeConsultarCasos && aba === "cases"));
  const associacao = useCasosTeste(projetoId, 1, 1, { associadosAMim: true }, perfil, dev && projeto.isSuccess && podeConsultarCasos);
  const membros = useQuery({ queryKey: ["projetos", projetoId, "membros", perfil.unidade_id, perfil.id], queryFn: async () => timesApi.membros(projeto.data!.time_id), enabled: projeto.isSuccess && (podeConsultarCasos || podeConsultarFormFactor) });
  const resultados = useFormFactor(projetoId, { page: pagina, pageSize: tamanhoPagina, semana: semana || undefined, responsavelId: assigneeFormFactor || undefined, tcId: filtrosResumo.tcId || undefined, sdfId: filtrosResumo.sdfId || undefined, modeloDispositivoId: filtrosResumo.modeloDispositivoId || undefined, resultado: filtrosResumo.resultado || undefined }, perfil, projeto.isSuccess && podeConsultarFormFactor && aba === "form-factor" && visaoFormFactor === "summary");
  const historico = useFormFactorResultados(projetoId, { page: pagina, pageSize: tamanhoPagina, semana: semana || undefined, tcId: filtrosResultados.tcId || undefined, sdfId: filtrosResultados.sdfId || undefined, responsavelId: filtrosResultados.responsavelId || undefined, origem: filtrosResultados.origem ? filtrosResultados.origem as "SDF" | "MANUAL" : undefined, modeloDispositivoId: filtrosResultados.modeloDispositivoId || undefined, resultado: filtrosResultados.resultado || undefined }, perfil, projeto.isSuccess && podeConsultarFormFactor && aba === "form-factor" && visaoFormFactor === "results");
  const criarRodada = useCriarRodadaFormFactor(projetoId);
  const registrarResultadoRodada = useRegistrarResultadosRodadaFormFactor(projetoId);

  const saveCase = useMutation({
    mutationFn: () => editar
      ? casosTesteApi.atualizar(editar.id, camposAlterados(editar, { category, difficulty, situation: situation || editar.situation, status, responsavel_id: responsavelId, backup_id: backupId || null }))
      : casosTesteApi.criar(projetoId, { tc_id: tcId.trim(), category, difficulty, situation: situation as SituacaoCasoTeste, responsavel_id: responsavelId, backup_id: backupId }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["projetos"] }); setCriarAberto(false); toast.success(t("caseSaveSuccess", { defaultValue: "Test Case salvo." })); },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("caseSaveError", { defaultValue: "Não foi possível salvar o Test Case." })),
  });
  const updateMemberCase = useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: "category" | "difficulty" | "situation" | "status" | "responsavel_id" | "backup_id"; value: string }) => casosTesteApi.atualizar(id, { [field]: value } as Pick<CasoTeste, typeof field>),
    // A célula muda na hora; se a API recusar, o cache volta ao que era.
    onMutate: async ({ id, field, value }) => {
      const queryKey = ["projetos", projetoId, "test-cases"];
      await client.cancelQueries({ queryKey });
      const anteriores = client.getQueriesData<Awaited<ReturnType<typeof casosTesteApi.listar>>>({ queryKey });
      client.setQueriesData<Awaited<ReturnType<typeof casosTesteApi.listar>>>({ queryKey }, (old) => old && { ...old, items: old.items.map((item) => item.id === id ? { ...item, [field]: value } : item) });
      return { anteriores };
    },
    onError: (error, _input, contexto) => {
      contexto?.anteriores.forEach(([queryKey, dados]) => client.setQueryData(queryKey, dados));
      toast.error(error instanceof Error ? error.message : t("caseUpdateError", { defaultValue: "Não foi possível atualizar o Test Case." }));
    },
    onSettled: () => client.invalidateQueries({ queryKey: ["projetos", projetoId, "test-cases"] }),
  });
  const transfer = useMutation({
    mutationFn: casosTesteApi.transferirParaBackup,
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["projetos"] }); toast.success(t("caseTransferred", { defaultValue: "Test Case transferido para o backup." })); },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("caseTransferError", { defaultValue: "Não foi possível transferir o Test Case." })),
  });
  const importReport = useMutation({
    mutationFn: () => {
      if (!arquivoSdf) throw new Error(t("projectFileRequired"));
      return formFactorApi.importar(projetoId, arquivoSdf);
    },
    onSuccess: async (result) => { await client.invalidateQueries({ queryKey: ["projetos", projetoId, "form-factor"] }); setArquivoSdf(null); toast.success(t("sdfImportSuccess", { defaultValue: "Relatório importado: {{rows}} execuções e {{results}} resultados.", rows: result.quantidade_execucoes, results: result.quantidade_resultados })); },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("sdfImportError", { defaultValue: "Não foi possível importar o relatório SDF." })),
  });

  const identificadoresMembros = useMemo(() => Object.fromEntries((membros.data ?? []).map((member) => [member.usuario_id, member.usuario_user_id ?? "—"])), [membros.data]);
  const { membrosAtivos, opcoesAssignee } = useMemo(() => {
    const ativos = (membros.data ?? []).filter((member) => member.ativo);
    return { membrosAtivos: ativos, opcoesAssignee: ativos.map((member) => ({ value: member.usuario_id, label: member.usuario_user_id ?? "—", searchText: member.usuario_nome ?? "" })) };
  }, [membros.data]);
  const responsavelAtual = perfil.id;
  const camposFaltando = !tcId.trim() || !situation || !responsavelId || !backupId;
  useLayoutEffect(() => {
    const ativa = abasRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    setIndicador(ativa ? { left: ativa.offsetLeft, width: ativa.offsetWidth } : null);
  }, [aba, projeto.data, i18n.resolvedLanguage]);
  const mostrarAcoes = podeGerenciarCasos || Boolean(casos.data?.items.some((item) => item.responsavel_id === responsavelAtual));
  const temFiltrosCaso = Boolean(semanaCasos || Object.values(filtrosCaso).some(Boolean));
  const casosFiltrados = (casos.isError ? [] : casos.data?.items ?? []).filter((item) => {
    const endDate = item.status === "Done" ? item.updated_at ?? item.created_at : null;
    const dataFinal = endDate ? formatarDiaIso(new Date(endDate)) : "";
    return item.tc_id.toLocaleLowerCase().includes(filtrosCaso.tcId.toLocaleLowerCase())
      && (!filtrosCaso.status || item.status === filtrosCaso.status)
      && (!filtrosCaso.situation || item.situation === filtrosCaso.situation)
      && (!filtrosCaso.assignee || item.responsavel_id === filtrosCaso.assignee)
      && (!filtrosCaso.difficulty || item.difficulty === filtrosCaso.difficulty)
      && (!filtrosCaso.category || item.category === filtrosCaso.category)
      && (!filtrosCaso.endDate || dataFinal === filtrosCaso.endDate)
      && (item.backup_id ? identificadoresMembros[item.backup_id] ?? "—" : "—").toLocaleLowerCase().includes(filtrosCaso.backup.toLocaleLowerCase());
  });
  const alterarFiltroCaso = (campo: keyof typeof filtrosCaso, valor: string) => {
    setPagina(1);
    setFiltrosCaso((atual) => ({ ...atual, [campo]: valor }));
  };

  function limparCaso() {
    setTcId(""); setCategory("A"); setDifficulty("Low"); setSituation(""); setStatus("To-Do"); setResponsavelId(""); setBackupId(""); setEditar(null);
  }

  function abrirEdicao(testCase: CasoTeste) {
    setEditar(testCase);
    setTcId(testCase.tc_id);
    setCategory(testCase.category);
    setDifficulty(testCase.difficulty);
    setSituation(testCase.situation);
    setStatus(testCase.status);
    setResponsavelId(testCase.responsavel_id);
    setBackupId(testCase.backup_id ?? "");
    setCriarAberto(true);
  }

  if (!podeConsultar || (!podeConsultarCasos && !podeConsultarFormFactor && !podeImportarSdf)) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;
  if (dev && !podeConsultarCasos) return <p role="alert">{t("permissionDenied")}</p>;
  if (projeto.isError) return <p role="alert" className="p-6 text-sm">{t("projectNotFound")}</p>;
  if (dev && projeto.isSuccess && associacao.isSuccess && !associacao.isFetching && associacao.data.total_count === 0) return <ProjetosEntradaPage projetoSemCasosId={projetoId} />;

  return <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-[#EEEEF1] bg-card px-4 py-5 sm:rounded-[42px] sm:px-11 sm:py-10">
    <header className="mb-4 flex shrink-0 flex-wrap items-start gap-4">
      <div className="min-w-0 flex-1">{projeto.data ? <ProjetoSwitcher projetoId={projetoId} nome={projeto.data.nome} /> : <h1 className="truncate text-2xl font-medium text-primary">{t("loadingProjects")}</h1>}</div>
      {projeto.data && <div className="ml-auto grid w-full shrink-0 gap-1 sm:w-auto"><WeekPicker label={t("week")} value={aba === "cases" ? semanaCasos : semana} onChange={(valor) => { if (aba === "cases") setSemanaCasos(valor); else setSemana(valor); setPagina(1); }} className="w-full sm:w-auto" /></div>}
    </header>

    {projeto.isLoading ? <p role="status" className="py-8 text-sm text-muted-foreground">{t("loadingProjects")}</p> : projeto.isError || !projeto.data ? <p role="alert" className="py-8 text-sm text-muted-foreground">{t("projectNotFound", { defaultValue: "Projeto não encontrado ou sem acesso." })}</p> : <>
      {/* A ação da aba mora na barra de abas: o cabeçalho não muda de layout ao trocar de aba. */}
      <div className="mb-5 flex shrink-0 flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-border">
      <div ref={abasRef} onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        const abasDisponiveis = [
          ...(podeConsultarCasos ? ["cases" as const] : []),
          ...(podeConsultarFormFactor || podeImportarSdf ? ["form-factor" as const] : []),
        ];
        if (abasDisponiveis.length < 2) return;
        event.preventDefault();
        const indiceAtual = abasDisponiveis.indexOf(aba);
        const indiceSeguinte = event.key === "Home" ? 0
          : event.key === "End" ? abasDisponiveis.length - 1
            : (indiceAtual + (event.key === "ArrowRight" ? 1 : -1) + abasDisponiveis.length) % abasDisponiveis.length;
        const proximaAba = abasDisponiveis[indiceSeguinte];
        setAba(proximaAba);
        setPagina(1);
        requestAnimationFrame(() => abasRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${proximaAba}"]`)?.focus());
      }} className="relative flex gap-4" role="tablist" aria-label={t("projectTabs", { defaultValue: "Abas do projeto" })}>
        {podeConsultarCasos && <button id="project-cases-tab" data-tab="cases" type="button" role="tab" tabIndex={aba === "cases" ? 0 : -1} aria-selected={aba === "cases"} onClick={() => { setAba("cases"); setPagina(1); }} className={`px-0.5 pb-2 text-base transition-colors sm:text-lg ${aba === "cases" ? "text-primary" : "text-foreground hover:text-primary"}`}>{t("testCasesTab")}</button>}
        {(podeConsultarFormFactor || podeImportarSdf) && <button id="project-form-factor-tab" data-tab="form-factor" type="button" role="tab" tabIndex={aba === "form-factor" ? 0 : -1} aria-selected={aba === "form-factor"} onClick={() => { setAba("form-factor"); setPagina(1); }} className={`px-0.5 pb-2 text-base transition-colors sm:text-lg ${aba === "form-factor" ? "text-primary" : "text-foreground hover:text-primary"}`}>{t("formFactor", { defaultValue: "Form Factor" })}</button>}
        {/* Uma barra só, que desliza até a aba ativa. */}
        {indicador && <span aria-hidden="true" className="absolute -bottom-px left-0 h-0.5 rounded-full bg-primary transition-[translate,width] duration-200 ease-out motion-reduce:transition-none" style={{ width: indicador.width, translate: `${indicador.left}px 0` }} />}
      </div>
      {podeGerenciarCasos && aba === "cases" && <Button size="sm" className="mb-2 max-sm:w-full" onClick={() => { limparCaso(); setCriarAberto(true); }}><Plus aria-hidden="true" className="size-4" />{t("newTestCase", { defaultValue: "Novo Test Case" })}</Button>}
      {podeImportarSdf && aba === "form-factor" && <div className="mb-2 flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end"><input ref={inputSdf} className="sr-only" type="file" accept=".xls,.xlsx" onChange={(event) => setArquivoSdf(event.target.files?.[0] ?? null)} /><Button size="sm" variant="outline" className="h-auto min-h-8 whitespace-normal text-left leading-tight sm:h-8" onClick={() => inputSdf.current?.click()}><UploadCloud aria-hidden="true" className="size-4 shrink-0" />{arquivoSdf?.name ?? t("importSdf", { defaultValue: "Importar relatório SDF" })}</Button>{arquivoSdf && <Button size="sm" disabled={importReport.isPending} onClick={() => importReport.mutate()}>{importReport.isPending ? t("saving") : t("import")}</Button>}</div>}
      </div>

      {aba === "cases" && podeConsultarCasos ? <div id="project-cases-panel" role="tabpanel" aria-labelledby="project-cases-tab" className="flex min-h-0 flex-1 flex-col"><TableLayout>
        <Table containerClassName={casos.data?.items.length ? "thin-scroll min-h-0 flex-1 overflow-auto" : "shrink-0 overflow-visible"}>
          <TableHeader><TableRow>
            <TableHead aria-hidden="true" className="w-14 px-4" />
            <TableHead><TableColumnFilter label={t("tcId")} value={filtrosCaso.tcId} onChange={(value) => alterarFiltroCaso("tcId", value)} /></TableHead>
            <TableHead><TableColumnFilter label={t("status")} value={filtrosCaso.status} onChange={(value) => alterarFiltroCaso("status", value)} options={[{ value: "", label: t("all") }, ...STATUS_CASO_TESTE.map((value) => ({ value, label: t(ROTULO_STATUS[value]) }))]} /></TableHead>
            <TableHead><TableColumnFilter label={t("tcSituation")} value={filtrosCaso.situation} onChange={(value) => alterarFiltroCaso("situation", value)} options={[{ value: "", label: t("all") }, ...SITUACOES_CASO_TESTE.map((value) => ({ value, label: t(ROTULO_SITUACAO[value]) }))]} /></TableHead>
            <TableHead><TableColumnFilter label={t("assignee")} value={filtrosCaso.assignee} onChange={(value) => alterarFiltroCaso("assignee", value)} options={[{ value: "", label: t("all") }, ...opcoesAssignee]} searchable /></TableHead>
            <TableHead><TableColumnFilter label={t("difficulty")} value={filtrosCaso.difficulty} onChange={(value) => alterarFiltroCaso("difficulty", value)} options={[{ value: "", label: t("all") }, ...dificuldades.map((value) => ({ value, label: t(difficultyLabels[value]) }))]} /></TableHead>
            <TableHead><TableColumnFilter label={t("category")} value={filtrosCaso.category} onChange={(value) => alterarFiltroCaso("category", value)} options={[{ value: "", label: t("all") }, ...categorias.map((value) => ({ value, label: value }))]} /></TableHead>
            <TableHead><TableColumnFilter label={t("endDate", { defaultValue: "Data final" })} value={filtrosCaso.endDate} onChange={(value) => alterarFiltroCaso("endDate", value)} type="date" /></TableHead>
            <TableHead><TableColumnFilter label={t("backup")} value={filtrosCaso.backup} onChange={(value) => alterarFiltroCaso("backup", value)} /></TableHead>
            {mostrarAcoes && <TableHead className="text-right">{t("actions")}</TableHead>}
          </TableRow></TableHeader>
          {casosFiltrados.length ? <TableBody>{casosFiltrados.map((testCase, index) => {
            const canManage = podeGerenciarCasos;
            const canEditOwn = testCase.responsavel_id === responsavelAtual;
            const endDate = testCase.status === "Done" ? testCase.updated_at ?? testCase.created_at : null;
            const canCancel = canManage || canEditOwn || testCase.backup_id === responsavelAtual;
            const statusOptions = canManage
              ? STATUS_CASO_TESTE
              : canEditOwn
                ? opcoesStatusResponsavel(testCase.status)
                : canCancel ? [...new Set([testCase.status, "Cancelled" as const])] : [];
            const numeroDaLinha = (pagina - 1) * tamanhoPagina + index + 1;
            return <TableRow key={testCase.id}>
              <TableCell className="w-14 px-4 text-right tabular-nums text-muted-foreground">{String(numeroDaLinha).padStart(2, "0")}</TableCell>
              <TableCell className="font-medium">{testCase.tc_id}</TableCell>
              <TableCell>{statusOptions.length > 0 ? <Select value={testCase.status} onValueChange={(value) => updateMemberCase.mutate({ id: testCase.id, field: "status", value })}><SelectTrigger aria-label={`${t("status")} ${testCase.tc_id}`} className={`${statusBadgeBase} ${statusBadges[testCase.status].badge}`}><StatusBadgeContent status={testCase.status} label={t(ROTULO_STATUS[testCase.status])} /></SelectTrigger><SelectContent>{statusOptions.map((value) => <SelectItem key={value} value={value}>{t(ROTULO_STATUS[value])}</SelectItem>)}</SelectContent></Select> : <StatusPill status={testCase.status} label={t(ROTULO_STATUS[testCase.status])} />}</TableCell>
              <TableCell>{canManage ? <Select value={testCase.situation} onValueChange={(value) => updateMemberCase.mutate({ id: testCase.id, field: "situation", value })}><SelectTrigger aria-label={`${t("tcSituation")} ${testCase.tc_id}`} className={atributoCasoBadgeClass}><SelectValue /></SelectTrigger><SelectContent>{SITUACOES_CASO_TESTE.map((value) => <SelectItem key={value} value={value}>{t(ROTULO_SITUACAO[value])}</SelectItem>)}</SelectContent></Select> : <SituacaoBadge label={t(ROTULO_SITUACAO[testCase.situation])} />}</TableCell>
              <TableCell className="text-muted-foreground">{canManage ? <Select value={testCase.responsavel_id} onValueChange={(value) => updateMemberCase.mutate({ id: testCase.id, field: "responsavel_id", value })}><SelectTrigger aria-label={`${t("assignee")} ${testCase.tc_id}`} className="h-8 w-auto min-w-28 border-0 bg-transparent px-0 text-muted-foreground shadow-none"><SelectValue /></SelectTrigger><SelectContent>{membrosAtivos.filter((member) => member.usuario_id !== testCase.backup_id).map((member) => <SelectItem key={member.usuario_id} value={member.usuario_id}>{member.usuario_user_id ?? "—"}</SelectItem>)}</SelectContent></Select> : identificadoresMembros[testCase.responsavel_id] ?? "—"}</TableCell>
              <TableCell>{canManage || canEditOwn ? <Select value={testCase.difficulty} onValueChange={(value) => updateMemberCase.mutate({ id: testCase.id, field: "difficulty", value })}><SelectTrigger aria-label={`${t("difficulty")} ${testCase.tc_id}`} className={atributoCasoBadgeClass}><SelectValue /></SelectTrigger><SelectContent>{dificuldades.map((value) => <SelectItem key={value} value={value}>{t(difficultyLabels[value])}</SelectItem>)}</SelectContent></Select> : <DificuldadeBadge label={t(difficultyLabels[testCase.difficulty])} />}</TableCell>
              <TableCell>{canManage || canEditOwn ? <Select value={testCase.category} onValueChange={(value) => updateMemberCase.mutate({ id: testCase.id, field: "category", value })}><SelectTrigger aria-label={`${t("category")} ${testCase.tc_id}`} className={atributoCasoBadgeClass}><SelectValue /></SelectTrigger><SelectContent>{categorias.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select> : <CategoriaBadge value={testCase.category} />}</TableCell>
              <TableCell className="text-muted-foreground">{endDate ? formatDate(endDate) : "—"}</TableCell>
              <TableCell className="text-muted-foreground">{canManage ? <Select value={testCase.backup_id ?? ""} onValueChange={(value) => updateMemberCase.mutate({ id: testCase.id, field: "backup_id", value })}><SelectTrigger aria-label={`${t("backup")} ${testCase.tc_id}`} className="h-8 w-auto min-w-28 border-0 bg-transparent px-0 text-muted-foreground shadow-none"><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{membrosAtivos.filter((member) => member.usuario_id !== testCase.responsavel_id).map((member) => <SelectItem key={member.usuario_id} value={member.usuario_id}>{member.usuario_user_id ?? "—"}</SelectItem>)}</SelectContent></Select> : testCase.backup_id ? identificadoresMembros[testCase.backup_id] ?? "—" : "—"}</TableCell>
              {mostrarAcoes && <TableCell className="text-right">{(canManage || canEditOwn) && <TableRowActions label={testCase.tc_id} actions={[
                ...(canManage ? [{ label: t("edit"), icon: Pencil, onSelect: () => abrirEdicao(testCase) }] : []),
                ...(canEditOwn && testCase.backup_id ? [{ label: t("transferToBackup", { defaultValue: "Transferir ao backup" }), icon: ArrowRightLeft, disabled: transfer.isPending, onSelect: () => transfer.mutate(testCase.id) }] : []),
              ]} />}</TableCell>}
            </TableRow>;
          })}</TableBody> : null}
        </Table>
        {!casos.isLoading && !casos.isError && !casosFiltrados.length && <CasosTesteEmptyState temFiltros={temFiltrosCaso} onLimparFiltros={() => { setSemanaCasos(""); setFiltrosCaso({ tcId: "", status: "", situation: "", assignee: "", difficulty: "", category: "", endDate: "", backup: "" }); setPagina(1); }} />}
        {casos.isLoading && <p role="status" className="p-5 text-sm text-muted-foreground">{t("loading", { defaultValue: "Carregando…" })}</p>}
        {casos.isError && <p role="alert" className="p-5 text-sm text-destructive">{t("caseLoadError", { defaultValue: "Não foi possível carregar os Test Cases." })}</p>}
        <TablePagination page={pagina} pageSize={tamanhoPagina} totalCount={casos.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(size) => { setTamanhoPagina(size); setPagina(1); }} />
      </TableLayout></div> : <div id="project-form-factor-panel" role="tabpanel" aria-labelledby="project-form-factor-tab" className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <nav ref={visoesFormFactorRef} onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? "summary"
              : event.key === "End" ? "results"
                : visaoFormFactor === "summary" ? "results" : "summary";
            setVisaoFormFactor(next);
            setPagina(1);
            requestAnimationFrame(() => visoesFormFactorRef.current?.querySelector<HTMLButtonElement>(`[data-view="${next}"]`)?.focus());
          }} className="inline-flex w-fit items-center rounded-xl border border-border/70 bg-muted/70 p-1" role="tablist" aria-label={t("formFactorViews", { defaultValue: "Form Factor views" })}>
            <button id="form-factor-summary-tab" data-view="summary" type="button" role="tab" tabIndex={visaoFormFactor === "summary" ? 0 : -1} aria-selected={visaoFormFactor === "summary"} aria-controls="form-factor-summary-panel" onClick={() => { setVisaoFormFactor("summary"); setPagina(1); }} className={`min-h-9 rounded-lg px-3.5 text-sm font-medium transition-[background-color,color,box-shadow,scale] duration-150 active:scale-[.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${visaoFormFactor === "summary" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{t("formFactorSummary", { defaultValue: "Summary" })}</button>
            <button id="form-factor-results-tab" data-view="results" type="button" role="tab" tabIndex={visaoFormFactor === "results" ? 0 : -1} aria-selected={visaoFormFactor === "results"} aria-controls="form-factor-results-panel" onClick={() => { setVisaoFormFactor("results"); setPagina(1); }} className={`min-h-9 rounded-lg px-3.5 text-sm font-medium transition-[background-color,color,box-shadow,scale] duration-150 active:scale-[.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${visaoFormFactor === "results" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{t("formFactorResults", { defaultValue: "Results" })}</button>
          </nav>
          <p className="text-sm text-muted-foreground">{t(visaoFormFactor === "summary" ? "formFactorSummaryHint" : "formFactorResultsHint", { defaultValue: visaoFormFactor === "summary" ? "Latest result per test case and model." : "Every recorded run, one row per execution." })}</p>
        </div>
        <div id="form-factor-summary-panel" role="tabpanel" aria-labelledby="form-factor-summary-tab" hidden={visaoFormFactor !== "summary"} className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t("validationCasesReady", { defaultValue: "Test Cases in In Validation are ready for a test round." })}</p>
          {podeCriarRodada && <Button size="sm" onClick={() => setAbrirCriacaoRodada(true)}><Plus className="mr-1.5 size-4" />{t("createTestRound", { defaultValue: "Create a test round" })}</Button>}
        </div>
        <FormFactorTabela dados={resultados.data} podeRegistrar={podeRegistrarResultado ? podeRegistrarLinha : undefined} onRegistrar={setLinhaManual} carregando={resultados.isLoading} erro={resultados.isError} identificadoresMembros={identificadoresMembros} opcoesAssignee={opcoesAssignee} assignee={assigneeFormFactor} onAssigneeChange={(valor) => { setAssigneeFormFactor(valor); setPagina(1); }} tcId={filtrosResumo.tcId} sdfId={filtrosResumo.sdfId} onFiltroTexto={(campo, valor) => { setFiltrosResumo((atual) => ({ ...atual, [campo]: valor })); setPagina(1); }} modeloDispositivoId={filtrosResumo.modeloDispositivoId} resultadoFiltro={filtrosResumo.resultado} onFiltroResultado={(modeloId, valor) => { setFiltrosResumo({ ...filtrosResumo, modeloDispositivoId: valor ? modeloId : "", resultado: valor }); setPagina(1); }} temFiltros={Boolean(semana || assigneeFormFactor || filtrosResumo.tcId || filtrosResumo.sdfId || filtrosResumo.resultado)} onLimparFiltros={() => { setSemana(""); setAssigneeFormFactor(""); setFiltrosResumo({ tcId: "", sdfId: "", modeloDispositivoId: "", resultado: "" }); setPagina(1); }} page={pagina} pageSize={tamanhoPagina} onPageChange={setPagina} onPageSizeChange={(size) => { setTamanhoPagina(size); setPagina(1); }} />
        </div>
        <div id="form-factor-results-panel" role="tabpanel" aria-labelledby="form-factor-results-tab" hidden={visaoFormFactor !== "results"} className="flex min-h-0 flex-1 flex-col"><FormFactorResultadosTabela dados={historico.data} carregando={historico.isLoading} erro={historico.isError} identificadoresMembros={identificadoresMembros} opcoesAssignee={opcoesAssignee} filtros={filtrosResultados} onFiltroChange={(campo, valor) => { setFiltrosResultados((atual) => ({ ...atual, [campo]: valor })); setPagina(1); }} page={pagina} pageSize={tamanhoPagina} onPageChange={setPagina} onPageSizeChange={(size) => { setTamanhoPagina(size); setPagina(1); }} /></div>
      </div>}
    </>}

    {/* O form só é limpo ao abrir: limpar ao fechar trocaria título e campos durante a animação de saída. */}
    <Dialog open={criarAberto} onOpenChange={setCriarAberto}>
      <DrawerContent><DrawerHeader><DrawerTitle>{editar ? t("editTestCase") : t("newTestCase")}</DrawerTitle></DrawerHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); saveCase.mutate(); }}>
          <div className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
            <div className="grid gap-2"><Label htmlFor="case-tc-id">{t("tcId")}</Label><Input id="case-tc-id" value={tcId} onChange={(event) => setTcId(event.target.value)} maxLength={120} disabled={Boolean(editar)} required /></div>
            <div className="grid gap-2"><Label>{t("category")}</Label><Select value={category} onValueChange={(value) => setCategory(value as CategoriaCasoTeste)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categorias.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label>{t("difficulty")}</Label><Select value={difficulty} onValueChange={(value) => setDifficulty(value as DificuldadeCasoTeste)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{dificuldades.map((value) => <SelectItem key={value} value={value}>{t(difficultyLabels[value])}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label htmlFor="case-situation">{t("tcSituation")}</Label><Select value={situation} onValueChange={(value) => setSituation(value as SituacaoCasoTeste)}><SelectTrigger id="case-situation" aria-required="true"><SelectValue placeholder={t("tcSituationRequired")} /></SelectTrigger><SelectContent>{SITUACOES_CASO_TESTE.map((value) => <SelectItem key={value} value={value}>{t(ROTULO_SITUACAO[value])}</SelectItem>)}</SelectContent></Select></div>
            {editar && <div className="grid gap-2"><Label htmlFor="case-status">{t("status")}</Label><Select value={status} onValueChange={(value) => setStatus(value as StatusCasoTeste)}><SelectTrigger id="case-status"><SelectValue /></SelectTrigger><SelectContent>{STATUS_CASO_TESTE.map((value) => <SelectItem key={value} value={value}>{t(ROTULO_STATUS[value])}</SelectItem>)}</SelectContent></Select></div>}
            <div className="grid gap-2"><Label>{t("assignee")}</Label><Select value={responsavelId} onValueChange={setResponsavelId}><SelectTrigger><SelectValue placeholder={t("selectUser")} /></SelectTrigger><SelectContent>{membrosAtivos.map((member) => <SelectItem key={member.usuario_id} value={member.usuario_id}>{member.usuario_nome ?? member.usuario_id}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label>{t("backup")}</Label><Select value={backupId} onValueChange={setBackupId}><SelectTrigger><SelectValue placeholder={t("selectUser")} /></SelectTrigger><SelectContent>{membrosAtivos.filter((member) => member.usuario_id !== responsavelId).map((member) => <SelectItem key={member.usuario_id} value={member.usuario_id}>{member.usuario_nome ?? member.usuario_id}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border px-7 py-5">{camposFaltando && <p id="case-required-fields" className="mr-auto text-xs leading-5 text-muted-foreground">{t("caseRequiredFields")}</p>}<DrawerClose asChild><Button type="button" variant="outline">{t("cancel")}</Button></DrawerClose><Button type="submit" aria-describedby={camposFaltando ? "case-required-fields" : undefined} disabled={saveCase.isPending || camposFaltando}>{saveCase.isPending ? t("saving") : t("save")}</Button></div>
        </form>
      </DrawerContent>
    </Dialog>
    <FormFactorCriarRodadaDialog
      aberto={abrirCriacaoRodada}
      onAbertoChange={setAbrirCriacaoRodada}
      salvando={criarRodada.isPending}
      onCriar={(sdfId) => criarRodada.mutate({ sdf_id: sdfId }, {
        onSuccess: (rodada) => { setAbrirCriacaoRodada(false); toast.success(t("testRoundCreated", { defaultValue: "Test round created with {{count}} Test Cases.", count: rodada.total_test_cases })); },
        onError: (error) => toast.error(error instanceof Error ? error.message : t("roundCreateError", { defaultValue: "Could not create the test round." })),
      })}
    />
    <FormFactorManualDialog
      aberto={Boolean(linhaManual)}
      onAbertoChange={(aberto) => { if (!aberto) setLinhaManual(null); }}
      linha={linhaManual}
      modelos={resultados.data?.modelos ?? []}
      salvando={registrarResultadoRodada.isPending}
      onSalvar={(input) => linhaManual?.rodada_pendente_id && registrarResultadoRodada.mutate({ rodadaId: linhaManual.rodada_pendente_id, casoTesteId: linhaManual.caso_teste_id, input }, {
        onSuccess: () => { setLinhaManual(null); toast.success(t("manualResultSaved", { defaultValue: "Results recorded." })); },
        onError: (error) => toast.error(error instanceof Error ? error.message : t("manualResultSaveError", { defaultValue: "Could not record results." })),
      })}
    />
  </section>;
}
