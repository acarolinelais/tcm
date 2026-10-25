import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, Check, ClipboardList, Clock, Eye, Pencil, Play, Plus, SearchX, UploadCloud, X, type LucideIcon } from "lucide-react";
import { useOutletContext, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { formatDate } from "@/core/i18n/format";
import { timesApi } from "@/modules/times/api/times.api";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, Dialog } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { DEFAULT_TABLE_PAGE_SIZE, Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeader, TableLayout, TablePagination, TableRow } from "@/shared/ui/table";
import { TableRowActions } from "@/shared/ui/table-row-actions";
import { WeekPicker } from "@/shared/ui/week-picker";

import { ProjetoSwitcher } from "./components/ProjetoSwitcher";
import { ProjetosEntradaPage } from "./ProjetosEntradaPage";
import { useCasosTeste } from "./hooks/useProjetos";
import { TableColumnFilter } from "@/shared/ui/table-column-filter";
import { toast } from "@/shared/lib/toast";
import { formatarDiaIso } from "@/shared/lib/utils";

import { casosTesteApi, formFactorApi, projetosApi, type CasoTeste, type CategoriaCasoTeste, type DificuldadeCasoTeste, type SituacaoCasoTeste } from "./api/projetos.api";
import { CATEGORIAS_CASO_TESTE as categorias, DIFICULDADES_CASO_TESTE as dificuldades, ROTULO_SITUACAO, ROTULO_STATUS, SITUACOES_CASO_TESTE, STATUS_CASO_TESTE, type StatusCasoTeste } from "./model/projeto";

const difficultyLabels: Record<DificuldadeCasoTeste, string> = { Low: "difficultyLow", Medium: "difficultyMedium", High: "difficultyHigh" };
const statusBadges: Record<StatusCasoTeste, { badge: string; icon: string; Icon: LucideIcon }> = {
  "To-Do": { badge: "bg-slate-100 text-slate-700", icon: "bg-slate-500", Icon: Clock },
  InProgress: { badge: "bg-blue-50 text-blue-800", icon: "bg-blue-700", Icon: Play },
  InReview: { badge: "bg-amber-50 text-amber-800", icon: "bg-amber-600", Icon: Eye },
  Pass: { badge: "bg-green-50 text-green-800", icon: "bg-green-800", Icon: Check },
  Fail: { badge: "bg-red-50 text-red-800", icon: "bg-red-700", Icon: X },
};
const statusBadgeBase = "h-7 w-fit gap-1.5 rounded-md border-0 px-2 py-0 text-sm font-medium shadow-none";

function StatusBadgeContent({ status, label }: { status: StatusCasoTeste; label: string }) {
  const { icon, Icon } = statusBadges[status];
  return <span className="inline-flex items-center gap-1.5">
    <span aria-hidden="true" className={`flex size-4 shrink-0 items-center justify-center rounded-full text-white ${icon}`}><Icon className="size-2.5 stroke-[3]" /></span>
    <span>{label}</span>
  </span>;
}

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
  const [semanaCasos, setSemanaCasos] = useState("");
  const [arquivoSdf, setArquivoSdf] = useState<File | null>(null);
  const inputSdf = useRef<HTMLInputElement>(null);
  const abasRef = useRef<HTMLDivElement>(null);
  const [indicador, setIndicador] = useState<{ left: number; width: number } | null>(null);

  const admin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  const dev = perfil.perfil_codigo === "USUARIO_PADRAO";
  const podeConsultar = admin || perfil.permissoes.includes("projetos.consultar") || perfil.permissoes.includes("test_cases.consultar");
  const podeGerenciarCasos = admin || (["GERENTE", "KP"].includes(perfil.perfil_codigo ?? "") && perfil.permissoes.includes("test_cases.gerenciar"));
  const podeConsultarCasos = admin || perfil.permissoes.includes("test_cases.consultar");
  const podeConsultarFormFactor = admin || perfil.permissoes.includes("form_factor.consultar");
  const podeImportarSdf = admin || perfil.permissoes.includes("form_factor.importar");
  const projeto = useQuery({ queryKey: ["projetos", "detalhe", projetoId, perfil.unidade_id, perfil.id], queryFn: () => projetosApi.obter(projetoId), enabled: podeConsultar && Boolean(projetoId) });
  const casos = useCasosTeste(projetoId, pagina, tamanhoPagina, { responsavelId: filtrosCaso.assignee || undefined, ...(dev ? { associadosAMim: true } : {}), ...(semanaCasos ? { semana: semanaCasos } : {}) }, perfil, Boolean(projeto.isSuccess && podeConsultarCasos && aba === "cases"));
  const associacao = useCasosTeste(projetoId, 1, 1, { associadosAMim: true }, perfil, dev && projeto.isSuccess && podeConsultarCasos);
  const membros = useQuery({ queryKey: ["projetos", projetoId, "membros", perfil.unidade_id, perfil.id], queryFn: async () => timesApi.membros(projeto.data!.time_id), enabled: projeto.isSuccess && podeConsultarCasos });
  const resultados = useQuery({ queryKey: ["projetos", projetoId, "form-factor", pagina, tamanhoPagina, semana, perfil.unidade_id, perfil.id], queryFn: () => formFactorApi.listar(projetoId, { page: pagina, pageSize: tamanhoPagina, semana: semana || undefined }), enabled: projeto.isSuccess && podeConsultarFormFactor && aba === "form-factor" });

  const saveCase = useMutation({
    mutationFn: () => editar
      ? casosTesteApi.atualizar(editar.id, camposAlterados(editar, { category, difficulty, situation: situation || editar.situation, status, responsavel_id: responsavelId, backup_id: backupId || null }))
      : casosTesteApi.criar(projetoId, { tc_id: tcId.trim(), category, difficulty, situation: situation as SituacaoCasoTeste, responsavel_id: responsavelId, backup_id: backupId }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["projetos"] }); setCriarAberto(false); toast.success(t("caseSaveSuccess", { defaultValue: "Test Case salvo." })); },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("caseSaveError", { defaultValue: "Não foi possível salvar o Test Case." })),
  });
  const updateMemberCase = useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: "category" | "difficulty" | "situation" | "status"; value: string }) => casosTesteApi.atualizar(id, { [field]: value } as Pick<CasoTeste, typeof field>),
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
  const membrosAtivos = (membros.data ?? []).filter((member) => member.ativo);
  const responsavelAtual = perfil.id;
  const camposFaltando = !tcId.trim() || !situation || !responsavelId || !backupId;
  useLayoutEffect(() => {
    const ativa = abasRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    setIndicador(ativa ? { left: ativa.offsetLeft, width: ativa.offsetWidth } : null);
  }, [aba, projeto.data, i18n.resolvedLanguage]);
  const mostrarAcoes = podeGerenciarCasos || Boolean(casos.data?.items.some((item) => item.responsavel_id === responsavelAtual));
  const temFiltrosCaso = Boolean(semanaCasos || Object.values(filtrosCaso).some(Boolean));
  const casosFiltrados = (casos.isError ? [] : casos.data?.items ?? []).filter((item) => {
    const endDate = item.status === "Pass" ? item.updated_at ?? item.created_at : null;
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

  return <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[42px] border border-[#EEEEF1] bg-card px-7 py-8 sm:px-11 sm:py-10">
    <header className="mb-4 flex shrink-0 flex-wrap items-start gap-4">
      <div className="min-w-0 flex-1">{projeto.data ? <ProjetoSwitcher projetoId={projetoId} nome={projeto.data.nome} /> : <h1 className="truncate text-2xl font-medium text-primary">{t("loadingProjects")}</h1>}</div>
      {projeto.data && <div className="ml-auto grid shrink-0 gap-1 text-xs text-muted-foreground"><span aria-hidden="true">{t("week")}</span><WeekPicker label={t("week")} value={aba === "cases" ? semanaCasos : semana} onChange={(valor) => { if (aba === "cases") setSemanaCasos(valor); else setSemana(valor); setPagina(1); }} className="h-9 w-44" /></div>}
    </header>

    {projeto.isLoading ? <p role="status" className="py-8 text-sm text-muted-foreground">{t("loadingProjects")}</p> : projeto.isError || !projeto.data ? <p role="alert" className="py-8 text-sm text-muted-foreground">{t("projectNotFound", { defaultValue: "Projeto não encontrado ou sem acesso." })}</p> : <>
      {/* A ação da aba mora na barra de abas: o cabeçalho não muda de layout ao trocar de aba. */}
      <div className="mb-5 flex shrink-0 items-end justify-between gap-4 border-b border-border">
      <div ref={abasRef} className="relative flex gap-4" role="tablist" aria-label={t("projectTabs", { defaultValue: "Abas do projeto" })}>
        {podeConsultarCasos && <button type="button" role="tab" aria-selected={aba === "cases"} onClick={() => { setAba("cases"); setPagina(1); }} className={`px-0.5 pb-2 text-lg transition-colors ${aba === "cases" ? "text-primary" : "text-foreground hover:text-primary"}`}>{t("testCasesTab")}</button>}
        {(podeConsultarFormFactor || podeImportarSdf) && <button type="button" role="tab" aria-selected={aba === "form-factor"} onClick={() => { setAba("form-factor"); setPagina(1); }} className={`px-0.5 pb-2 text-lg transition-colors ${aba === "form-factor" ? "text-primary" : "text-foreground hover:text-primary"}`}>{t("formFactor", { defaultValue: "Form Factor" })}</button>}
        {/* Uma barra só, que desliza até a aba ativa. */}
        {indicador && <span aria-hidden="true" className="absolute -bottom-px left-0 h-0.5 rounded-full bg-primary transition-[translate,width] duration-200 ease-out motion-reduce:transition-none" style={{ width: indicador.width, translate: `${indicador.left}px 0` }} />}
      </div>
      {podeGerenciarCasos && aba === "cases" && <Button size="sm" className="mb-2" onClick={() => { limparCaso(); setCriarAberto(true); }}><Plus aria-hidden="true" className="size-4" />{t("newTestCase", { defaultValue: "Novo Test Case" })}</Button>}
      {podeImportarSdf && aba === "form-factor" && <div className="mb-2 flex flex-wrap items-center justify-end gap-2"><input ref={inputSdf} className="sr-only" type="file" accept=".xls,.xlsx" onChange={(event) => setArquivoSdf(event.target.files?.[0] ?? null)} /><Button size="sm" variant="outline" onClick={() => inputSdf.current?.click()}><UploadCloud aria-hidden="true" className="size-4" />{arquivoSdf?.name ?? t("importSdf", { defaultValue: "Importar relatório SDF" })}</Button>{arquivoSdf && <Button size="sm" disabled={importReport.isPending} onClick={() => importReport.mutate()}>{importReport.isPending ? t("saving") : t("import")}</Button>}</div>}
      </div>

      {aba === "cases" && podeConsultarCasos ? <TableLayout>
        <Table containerClassName={casos.data?.items.length ? "thin-scroll min-h-0 flex-1 overflow-auto" : "shrink-0 overflow-visible"}>
          <TableHeader><TableRow>
            <TableHead><TableColumnFilter label={t("tcId")} value={filtrosCaso.tcId} onChange={(value) => alterarFiltroCaso("tcId", value)} /></TableHead>
            <TableHead><TableColumnFilter label={t("status")} value={filtrosCaso.status} onChange={(value) => alterarFiltroCaso("status", value)} options={[{ value: "", label: t("all") }, ...STATUS_CASO_TESTE.map((value) => ({ value, label: t(ROTULO_STATUS[value]) }))]} /></TableHead>
            <TableHead><TableColumnFilter label={t("tcSituation")} value={filtrosCaso.situation} onChange={(value) => alterarFiltroCaso("situation", value)} options={[{ value: "", label: t("all") }, ...SITUACOES_CASO_TESTE.map((value) => ({ value, label: t(ROTULO_SITUACAO[value]) }))]} /></TableHead>
            <TableHead><TableColumnFilter label={t("assignee")} value={filtrosCaso.assignee} onChange={(value) => alterarFiltroCaso("assignee", value)} options={[{ value: "", label: t("all") }, ...(membros.data ?? []).filter((member) => member.ativo).map((member) => ({ value: member.usuario_id, label: member.usuario_user_id ?? "—" }))]} /></TableHead>
            <TableHead><TableColumnFilter label={t("difficulty")} value={filtrosCaso.difficulty} onChange={(value) => alterarFiltroCaso("difficulty", value)} options={[{ value: "", label: t("all") }, ...dificuldades.map((value) => ({ value, label: t(difficultyLabels[value]) }))]} /></TableHead>
            <TableHead><TableColumnFilter label={t("category")} value={filtrosCaso.category} onChange={(value) => alterarFiltroCaso("category", value)} options={[{ value: "", label: t("all") }, ...categorias.map((value) => ({ value, label: value }))]} /></TableHead>
            <TableHead><TableColumnFilter label={t("endDate", { defaultValue: "Data final" })} value={filtrosCaso.endDate} onChange={(value) => alterarFiltroCaso("endDate", value)} type="date" /></TableHead>
            <TableHead><TableColumnFilter label={t("backup")} value={filtrosCaso.backup} onChange={(value) => alterarFiltroCaso("backup", value)} /></TableHead>
            {mostrarAcoes && <TableHead className="text-right">{t("actions")}</TableHead>}
          </TableRow></TableHeader>
          {casosFiltrados.length ? <TableBody>{casosFiltrados.map((testCase) => {
            const canManage = podeGerenciarCasos;
            const canEditOwn = testCase.responsavel_id === responsavelAtual;
            const endDate = testCase.status === "Pass" ? testCase.updated_at ?? testCase.created_at : null;
            return <TableRow key={testCase.id}>
              <TableCell className="font-medium">{testCase.tc_id}</TableCell>
              <TableCell>{canManage || canEditOwn ? <Select value={testCase.status} onValueChange={(value) => updateMemberCase.mutate({ id: testCase.id, field: "status", value })}><SelectTrigger aria-label={`${t("status")} ${testCase.tc_id}`} className={`${statusBadgeBase} ${statusBadges[testCase.status].badge}`}><StatusBadgeContent status={testCase.status} label={t(ROTULO_STATUS[testCase.status])} /></SelectTrigger><SelectContent>{STATUS_CASO_TESTE.map((value) => <SelectItem key={value} value={value}>{t(ROTULO_STATUS[value])}</SelectItem>)}</SelectContent></Select> : <Badge variant="secondary" className={`${statusBadgeBase} ${statusBadges[testCase.status].badge}`}><StatusBadgeContent status={testCase.status} label={t(ROTULO_STATUS[testCase.status])} /></Badge>}</TableCell>
              <TableCell>{canManage ? <Select value={testCase.situation} onValueChange={(value) => updateMemberCase.mutate({ id: testCase.id, field: "situation", value })}><SelectTrigger aria-label={`${t("tcSituation")} ${testCase.tc_id}`} className="h-8 w-40"><SelectValue /></SelectTrigger><SelectContent>{SITUACOES_CASO_TESTE.map((value) => <SelectItem key={value} value={value}>{t(ROTULO_SITUACAO[value])}</SelectItem>)}</SelectContent></Select> : <span className="text-muted-foreground">{t(ROTULO_SITUACAO[testCase.situation])}</span>}</TableCell>
              <TableCell className="text-muted-foreground">{identificadoresMembros[testCase.responsavel_id] ?? "—"}</TableCell>
              <TableCell>{canEditOwn && !canManage ? <Select value={testCase.difficulty} onValueChange={(value) => updateMemberCase.mutate({ id: testCase.id, field: "difficulty", value })}><SelectTrigger aria-label={`${t("difficulty")} ${testCase.tc_id}`} className="h-8 w-28"><SelectValue /></SelectTrigger><SelectContent>{dificuldades.map((value) => <SelectItem key={value} value={value}>{t(difficultyLabels[value])}</SelectItem>)}</SelectContent></Select> : t(difficultyLabels[testCase.difficulty])}</TableCell>
              <TableCell>{canEditOwn && !canManage ? <Select value={testCase.category} onValueChange={(value) => updateMemberCase.mutate({ id: testCase.id, field: "category", value })}><SelectTrigger aria-label={`${t("category")} ${testCase.tc_id}`} className="h-8 w-20"><SelectValue /></SelectTrigger><SelectContent>{categorias.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select> : testCase.category}</TableCell>
              <TableCell className="text-muted-foreground">{endDate ? formatDate(endDate) : "—"}</TableCell>
              <TableCell className="text-muted-foreground">{testCase.backup_id ? identificadoresMembros[testCase.backup_id] ?? "—" : "—"}</TableCell>
              {mostrarAcoes && <TableCell className="text-right">{(canManage || canEditOwn) && <TableRowActions label={testCase.tc_id} actions={[
                ...(canManage ? [{ label: t("edit"), icon: Pencil, onSelect: () => abrirEdicao(testCase) }] : []),
                ...(canEditOwn && testCase.backup_id ? [{ label: t("transferToBackup", { defaultValue: "Transferir ao backup" }), icon: ArrowRightLeft, disabled: transfer.isPending, onSelect: () => transfer.mutate(testCase.id) }] : []),
              ]} />}</TableCell>}
            </TableRow>;
          })}</TableBody> : null}
        </Table>
        {!casos.isLoading && !casos.isError && !casosFiltrados.length && <TableEmptyState>
          <div role="status" className="w-full max-w-md text-center">
            <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">{temFiltrosCaso ? <SearchX aria-hidden="true" className="size-5" /> : <ClipboardList aria-hidden="true" className="size-5" />}</div>
            <h2 className="text-base font-semibold text-foreground">{t(temFiltrosCaso ? "noTestCasesResults" : "noTestCases")}</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">{t(temFiltrosCaso ? "adjustFilters" : "noTestCasesHint")}</p>
            {temFiltrosCaso && <Button variant="outline" className="mt-4" onClick={() => { setSemanaCasos(""); setFiltrosCaso({ tcId: "", status: "", situation: "", assignee: "", difficulty: "", category: "", endDate: "", backup: "" }); setPagina(1); }}>{t("clearFilters")}</Button>}
          </div>
        </TableEmptyState>}
        {casos.isLoading && <p role="status" className="p-5 text-sm text-muted-foreground">{t("loading", { defaultValue: "Carregando…" })}</p>}
        {casos.isError && <p role="alert" className="p-5 text-sm text-destructive">{t("caseLoadError", { defaultValue: "Não foi possível carregar os Test Cases." })}</p>}
        <TablePagination page={pagina} pageSize={tamanhoPagina} totalCount={casos.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(size) => { setTamanhoPagina(size); setPagina(1); }} />
      </TableLayout> : <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
        <TableLayout><Table containerClassName={resultados.data?.items.length ? "min-h-0 flex-1 overflow-auto" : "shrink-0 overflow-visible"}><TableHeader><TableRow><TableHead>{t("tcId")}</TableHead><TableHead>{t("sdfId")}</TableHead><TableHead>{t("deviceModel")}</TableHead><TableHead>{t("result")}</TableHead><TableHead>{t("date")}</TableHead><TableHead>{t("oneUi")}</TableHead></TableRow></TableHeader>{resultados.data?.items.length ? <TableBody>{resultados.data.items.map((row, index) => <TableRow key={`${row.sdf_id}-${row.modelo_dispositivo_id}-${index}`}><TableCell className="font-medium">{row.tc_id}</TableCell><TableCell>{row.sdf_id}</TableCell><TableCell>{row.modelo_nome}</TableCell><TableCell>{row.resultado}</TableCell><TableCell>{formatDate(row.data_reportada)}</TableCell><TableCell>{row.one_ui}</TableCell></TableRow>)}</TableBody> : null}</Table>{!resultados.isLoading && !resultados.isError && !resultados.data?.items.length && <TableEmptyState><p role="status">{t("noFormFactorResults", { defaultValue: "Nenhum resultado Form Factor cadastrado." })}</p></TableEmptyState>}<TablePagination page={pagina} pageSize={tamanhoPagina} totalCount={resultados.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(size) => { setTamanhoPagina(size); setPagina(1); }} /></TableLayout>
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
  </section>;
}
