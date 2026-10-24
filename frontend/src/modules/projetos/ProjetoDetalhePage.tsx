import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRightLeft, Check, ClipboardList, Pencil, Plus, UploadCloud } from "lucide-react";
import { Link, useOutletContext, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { timesApi } from "@/modules/times/api/times.api";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, Dialog } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { DEFAULT_TABLE_PAGE_SIZE, Table, TableBody, TableCell, TableEmptyState, TableEmptyStatePanel, TableHead, TableHeader, TableLayout, TablePagination, TableRow } from "@/shared/ui/table";
import { TableRowActions } from "@/shared/ui/table-row-actions";
import { TableColumnFilter } from "@/shared/ui/table-column-filter";
import { toast } from "@/shared/lib/toast";

import { casosTesteApi, formFactorApi, projetosApi, type CasoTeste, type CategoriaCasoTeste, type DificuldadeCasoTeste, type SituacaoCasoTeste, type StatusProjeto } from "./api/projetos.api";

const categorias: CategoriaCasoTeste[] = ["A", "B", "C"];
const dificuldades: DificuldadeCasoTeste[] = ["Low", "Medium", "High"];
const situacoes: SituacaoCasoTeste[] = ["To-Do", "InProgress", "InReview", "Pass", "Fail"];
const difficultyLabels: Record<DificuldadeCasoTeste, string> = { Low: "difficultyLow", Medium: "difficultyMedium", High: "difficultyHigh" };
const situationLabels: Record<SituacaoCasoTeste, string> = { "To-Do": "situationTodo", InProgress: "situationInProgress", InReview: "situationInReview", Pass: "situationPass", Fail: "situationFail" };
const situationBadgeClasses: Record<SituacaoCasoTeste, string> = {
  "To-Do": "bg-slate-50 text-slate-700",
  InProgress: "bg-blue-50 text-blue-800",
  InReview: "bg-amber-50 text-amber-800",
  Pass: "bg-green-50 text-green-800",
  Fail: "bg-red-50 text-red-800",
};

function SituationBadgeContent({ situation, label }: { situation: SituacaoCasoTeste; label: string }) {
  return <span className="inline-flex items-center gap-2.5">
    {situation === "Pass" ? <span className="flex size-6 items-center justify-center rounded-full bg-green-800 text-white"><Check aria-hidden="true" className="size-4 stroke-[3]" /></span> : <span aria-hidden="true" className={`size-2.5 rounded-full ${situation === "Fail" ? "bg-red-600" : situation === "InReview" ? "bg-amber-500" : situation === "InProgress" ? "bg-blue-600" : "bg-slate-400"}`} />}
    <span>{label}</span>
  </span>;
}
const statusProjeto: StatusProjeto[] = ["Created", "To Do", "InProgress", "Completed", "Canceled"];
const statusProjetoLabels: Record<StatusProjeto, string> = { Created: "projectCreated", "To Do": "toDo", InProgress: "inProgress", Completed: "completed", Canceled: "projectCanceled" };

export function ProjetoDetalhePage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const { projetoId = "" } = useParams();
  const client = useQueryClient();
  const [aba, setAba] = useState<"cases" | "form-factor">(perfil.perfil_codigo === "ADMIN_UNIDADE" || perfil.permissoes.includes("test_cases.consultar") ? "cases" : "form-factor");
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtrosCaso, setFiltrosCaso] = useState({ tcId: "", situation: "", assignee: "", difficulty: "", category: "", endDate: "", backup: "" });
  const [criarAberto, setCriarAberto] = useState(false);
  const [editar, setEditar] = useState<CasoTeste | null>(null);
  const [tcId, setTcId] = useState("");
  const [category, setCategory] = useState<CategoriaCasoTeste>("A");
  const [difficulty, setDifficulty] = useState<DificuldadeCasoTeste>("Low");
  const [situation, setSituation] = useState<SituacaoCasoTeste>("To-Do");
  const [responsavelId, setResponsavelId] = useState("");
  const [backupId, setBackupId] = useState("");
  const [semana, setSemana] = useState("");
  const [oneUi, setOneUi] = useState("");
  const [arquivoSdf, setArquivoSdf] = useState<File | null>(null);
  const inputSdf = useRef<HTMLInputElement>(null);

  const admin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  const podeConsultar = admin || perfil.permissoes.includes("projetos.consultar") || perfil.permissoes.includes("test_cases.consultar");
  const podeGerenciarProjeto = admin || perfil.permissoes.includes("projetos.gerenciar");
  const podeGerenciarCasos = admin || perfil.permissoes.includes("test_cases.gerenciar");
  const podeConsultarCasos = admin || perfil.permissoes.includes("test_cases.consultar");
  const podeConsultarFormFactor = admin || perfil.permissoes.includes("form_factor.consultar");
  const podeImportarSdf = admin || perfil.permissoes.includes("form_factor.importar");
  const projeto = useQuery({ queryKey: ["projetos", "detalhe", projetoId], queryFn: () => projetosApi.obter(projetoId), enabled: podeConsultar && Boolean(projetoId) });
  const casos = useQuery({ queryKey: ["projetos", projetoId, "test-cases", pagina, tamanhoPagina, filtrosCaso.assignee], queryFn: () => casosTesteApi.listar(projetoId, pagina, tamanhoPagina, { responsavelId: filtrosCaso.assignee || undefined }), enabled: Boolean(projeto.data && podeConsultarCasos && aba === "cases") });
  const membros = useQuery({ queryKey: ["projetos", projetoId, "membros"], queryFn: async () => timesApi.membros(projeto.data!.time_id), enabled: Boolean(projeto.data && podeConsultarCasos) });
  const resultados = useQuery({ queryKey: ["projetos", projetoId, "form-factor", pagina, tamanhoPagina, semana, oneUi], queryFn: () => formFactorApi.listar(projetoId, { page: pagina, pageSize: tamanhoPagina, semana: semana || undefined, oneUi: oneUi || undefined }), enabled: Boolean(projeto.data && podeConsultarFormFactor && aba === "form-factor") });

  const updateStatus = useMutation({
    mutationFn: (status: StatusProjeto) => projetosApi.atualizarStatus(projetoId, status),
    onSuccess: (updated) => { client.setQueryData(["projetos", "detalhe", projetoId], updated); client.invalidateQueries({ queryKey: ["projetos"] }); },
    onError: () => toast.error(t("projectStatusError")),
  });
  const saveCase = useMutation({
    mutationFn: () => editar
      ? casosTesteApi.atualizar(editar.id, { category, difficulty, situation, responsavel_id: responsavelId, backup_id: backupId || null })
      : casosTesteApi.criar(projetoId, { tc_id: tcId.trim(), category, difficulty, responsavel_id: responsavelId, backup_id: backupId }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["projetos", projetoId, "test-cases"] }); setCriarAberto(false); setEditar(null); toast.success(t("caseSaveSuccess", { defaultValue: "Test Case salvo." })); },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("caseSaveError", { defaultValue: "Não foi possível salvar o Test Case." })),
  });
  const updateMemberCase = useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: "category" | "difficulty" | "situation"; value: string }) => casosTesteApi.atualizar(id, { [field]: value } as Pick<CasoTeste, typeof field>),
    onSuccess: () => client.invalidateQueries({ queryKey: ["projetos", projetoId, "test-cases"] }),
    onError: (error) => toast.error(error instanceof Error ? error.message : t("caseUpdateError", { defaultValue: "Não foi possível atualizar o Test Case." })),
  });
  const transfer = useMutation({
    mutationFn: casosTesteApi.transferirParaBackup,
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["projetos", projetoId, "test-cases"] }); toast.success(t("caseTransferred", { defaultValue: "Test Case transferido para o backup." })); },
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

  const nomesMembros = useMemo(() => Object.fromEntries((membros.data ?? []).map((member) => [member.usuario_id, member.usuario_nome ?? member.usuario_id])), [membros.data]);
  const membrosAtivos = (membros.data ?? []).filter((member) => member.ativo);
  const responsavelAtual = perfil.id;
  const mostrarAcoes = podeGerenciarCasos || Boolean(casos.data?.items.some((item) => item.responsavel_id === responsavelAtual));
  const casosFiltrados = (casos.data?.items ?? []).filter((item) => {
    const endDate = item.situation === "Pass" ? item.updated_at ?? item.created_at : null;
    const dataFinal = endDate ? new Date(endDate).toLocaleDateString() : "";
    return item.tc_id.toLocaleLowerCase().includes(filtrosCaso.tcId.toLocaleLowerCase())
      && (!filtrosCaso.situation || item.situation === filtrosCaso.situation)
      && (!filtrosCaso.assignee || item.responsavel_id === filtrosCaso.assignee)
      && (!filtrosCaso.difficulty || item.difficulty === filtrosCaso.difficulty)
      && (!filtrosCaso.category || item.category === filtrosCaso.category)
      && dataFinal.toLocaleLowerCase().includes(filtrosCaso.endDate.toLocaleLowerCase())
      && (item.backup_id ? nomesMembros[item.backup_id] ?? item.backup_id : "—").toLocaleLowerCase().includes(filtrosCaso.backup.toLocaleLowerCase());
  });
  const alterarFiltroCaso = (campo: keyof typeof filtrosCaso, valor: string) => {
    setPagina(1);
    setFiltrosCaso((atual) => ({ ...atual, [campo]: valor }));
  };

  function limparCaso() {
    setTcId(""); setCategory("A"); setDifficulty("Low"); setSituation("To-Do"); setResponsavelId(""); setBackupId(""); setEditar(null);
  }

  function abrirEdicao(testCase: CasoTeste, changes: Partial<Pick<CasoTeste, "category" | "difficulty" | "situation">> = {}) {
    setEditar(testCase);
    setTcId(testCase.tc_id);
    setCategory(changes.category ?? testCase.category);
    setDifficulty(changes.difficulty ?? testCase.difficulty);
    setSituation(changes.situation ?? testCase.situation);
    setResponsavelId(testCase.responsavel_id);
    setBackupId(testCase.backup_id ?? "");
    setCriarAberto(true);
  }

  if (!podeConsultar || (!podeConsultarCasos && !podeConsultarFormFactor && !podeImportarSdf)) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;

  return <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[42px] border border-[#EEEEF1] bg-card px-7 py-8 sm:px-11 sm:py-10">
    <header className="mb-5 flex shrink-0 items-center gap-4">
      <Button asChild variant="outline" size="icon" aria-label={t("backToProjects")}><Link to="/projetos"><ArrowLeft aria-hidden="true" className="size-4" /></Link></Button>
      <div className="min-w-0 flex-1"><p className="text-sm text-muted-foreground">{t("myProjects")}</p><h1 className="truncate text-2xl font-medium text-primary">{projeto.data?.nome ?? t("loadingProjects")}</h1></div>
      {projeto.data && podeGerenciarProjeto && <Select value={projeto.data.status} onValueChange={(value) => updateStatus.mutate(value as StatusProjeto)}><SelectTrigger aria-label={t("projectStatusFor", { name: projeto.data.nome })} className="w-40"><SelectValue /></SelectTrigger><SelectContent>{statusProjeto.map((value) => <SelectItem key={value} value={value}>{t(statusProjetoLabels[value])}</SelectItem>)}</SelectContent></Select>}
      {podeGerenciarCasos && aba === "cases" && <Button onClick={() => { limparCaso(); setCriarAberto(true); }}><Plus aria-hidden="true" className="size-4" />{t("newTestCase", { defaultValue: "Novo Test Case" })}</Button>}
    </header>

    {projeto.isLoading ? <p role="status" className="py-8 text-sm text-muted-foreground">{t("loadingProjects")}</p> : projeto.isError || !projeto.data ? <p role="alert" className="py-8 text-sm text-muted-foreground">{t("projectNotFound", { defaultValue: "Projeto não encontrado ou sem acesso." })}</p> : <>
      <div className="mb-5 flex shrink-0 gap-6 border-b border-border" role="tablist" aria-label={t("projectTabs", { defaultValue: "Abas do projeto" })}>
        {podeConsultarCasos && <button type="button" role="tab" aria-selected={aba === "cases"} onClick={() => { setAba("cases"); setPagina(1); }} className={`border-b-2 px-1 py-3 text-sm ${aba === "cases" ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground"}`}>{t("testCases", { defaultValue: "Test Cases" })}</button>}
        {(podeConsultarFormFactor || podeImportarSdf) && <button type="button" role="tab" aria-selected={aba === "form-factor"} onClick={() => { setAba("form-factor"); setPagina(1); }} className={`border-b-2 px-1 py-3 text-sm ${aba === "form-factor" ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground"}`}>{t("formFactor", { defaultValue: "Form Factor" })}</button>}
      </div>

      {aba === "cases" && podeConsultarCasos ? <TableLayout>
        <Table containerClassName={casos.data?.items.length ? "tc-table-scroll min-h-0 flex-1 overflow-auto" : "shrink-0 overflow-visible"}>
          <TableHeader><TableRow>
            <TableHead><TableColumnFilter label={t("tcId")} value={filtrosCaso.tcId} onChange={(value) => alterarFiltroCaso("tcId", value)} /></TableHead>
            <TableHead><TableColumnFilter label={t("status")} value={filtrosCaso.situation} onChange={(value) => alterarFiltroCaso("situation", value)} options={[{ value: "", label: t("all") }, ...situacoes.map((value) => ({ value, label: t(situationLabels[value]) }))]} /></TableHead>
            <TableHead><TableColumnFilter label={t("assignee")} value={filtrosCaso.assignee} onChange={(value) => alterarFiltroCaso("assignee", value)} options={[{ value: "", label: t("all") }, ...(membros.data ?? []).filter((member) => member.ativo).map((member) => ({ value: member.usuario_id, label: member.usuario_nome ?? member.usuario_id }))]} /></TableHead>
            <TableHead><TableColumnFilter label={t("difficulty")} value={filtrosCaso.difficulty} onChange={(value) => alterarFiltroCaso("difficulty", value)} options={[{ value: "", label: t("all") }, ...dificuldades.map((value) => ({ value, label: t(difficultyLabels[value]) }))]} /></TableHead>
            <TableHead><TableColumnFilter label={t("category")} value={filtrosCaso.category} onChange={(value) => alterarFiltroCaso("category", value)} options={[{ value: "", label: t("all") }, ...categorias.map((value) => ({ value, label: value }))]} /></TableHead>
            <TableHead><TableColumnFilter label={t("endDate", { defaultValue: "Data final" })} value={filtrosCaso.endDate} onChange={(value) => alterarFiltroCaso("endDate", value)} placeholder={t("filterPlaceholder", { label: t("date") })} /></TableHead>
            <TableHead><TableColumnFilter label={t("backup")} value={filtrosCaso.backup} onChange={(value) => alterarFiltroCaso("backup", value)} /></TableHead>
            {mostrarAcoes && <TableHead className="text-right">{t("actions")}</TableHead>}
          </TableRow></TableHeader>
          {casosFiltrados.length ? <TableBody>{casosFiltrados.map((testCase) => {
            const canManage = podeGerenciarCasos;
            const canEditOwn = testCase.responsavel_id === responsavelAtual;
            const endDate = testCase.situation === "Pass" ? testCase.updated_at ?? testCase.created_at : null;
            return <TableRow key={testCase.id}>
              <TableCell className="font-medium">{testCase.tc_id}</TableCell>
              <TableCell>{canManage || canEditOwn ? <Select value={testCase.situation} onValueChange={(value) => updateMemberCase.mutate({ id: testCase.id, field: "situation", value })}><SelectTrigger aria-label={`${t("tcSituation")} ${testCase.tc_id}`} className={`h-auto w-fit gap-2 rounded-lg border-0 px-3 py-1.5 text-sm shadow-none ${situationBadgeClasses[testCase.situation]}`}><SituationBadgeContent situation={testCase.situation} label={t(situationLabels[testCase.situation])} /></SelectTrigger><SelectContent>{situacoes.map((value) => <SelectItem key={value} value={value}>{t(situationLabels[value])}</SelectItem>)}</SelectContent></Select> : <Badge variant="secondary" className={`rounded-lg px-3 py-1.5 text-sm ${situationBadgeClasses[testCase.situation]}`}><SituationBadgeContent situation={testCase.situation} label={t(situationLabels[testCase.situation])} /></Badge>}</TableCell>
              <TableCell className="text-muted-foreground">{nomesMembros[testCase.responsavel_id] ?? testCase.responsavel_id}</TableCell>
              <TableCell>{canEditOwn && !canManage ? <Select value={testCase.difficulty} onValueChange={(value) => updateMemberCase.mutate({ id: testCase.id, field: "difficulty", value })}><SelectTrigger aria-label={`${t("difficulty")} ${testCase.tc_id}`} className="h-8 w-28"><SelectValue /></SelectTrigger><SelectContent>{dificuldades.map((value) => <SelectItem key={value} value={value}>{t(difficultyLabels[value])}</SelectItem>)}</SelectContent></Select> : t(difficultyLabels[testCase.difficulty])}</TableCell>
              <TableCell>{canEditOwn && !canManage ? <Select value={testCase.category} onValueChange={(value) => updateMemberCase.mutate({ id: testCase.id, field: "category", value })}><SelectTrigger aria-label={`${t("category")} ${testCase.tc_id}`} className="h-8 w-20"><SelectValue /></SelectTrigger><SelectContent>{categorias.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select> : testCase.category}</TableCell>
              <TableCell className="text-muted-foreground">{endDate ? new Date(endDate).toLocaleDateString() : "—"}</TableCell>
              <TableCell className="text-muted-foreground">{testCase.backup_id ? nomesMembros[testCase.backup_id] ?? testCase.backup_id : "—"}</TableCell>
              {mostrarAcoes && <TableCell className="text-right">{(canManage || canEditOwn) && <TableRowActions label={testCase.tc_id} actions={[
                ...(canManage ? [{ label: t("edit"), icon: Pencil, onSelect: () => abrirEdicao(testCase) }] : []),
                ...(canEditOwn && testCase.backup_id ? [{ label: t("transferToBackup", { defaultValue: "Transferir ao backup" }), icon: ArrowRightLeft, disabled: transfer.isPending, onSelect: () => transfer.mutate(testCase.id) }] : []),
              ]} />}</TableCell>}
            </TableRow>;
          })}</TableBody> : null}
          {!casos.isLoading && !casos.isError && !casosFiltrados.length && <TableBody>
            <TableRow aria-hidden="true" className="border-0 hover:bg-transparent"><TableCell colSpan={mostrarAcoes ? 8 : 7} className="h-3 p-0" /></TableRow>
            <TableRow><TableCell colSpan={mostrarAcoes ? 8 : 7} className="p-0"><TableEmptyStatePanel role="status" className="px-5 py-8 sm:px-8">
              <div className="w-full max-w-md text-center"><div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"><ClipboardList aria-hidden="true" className="size-5" /></div><h2 className="text-base font-semibold text-foreground">{casos.data?.items.length ? t("noTestCasesResults", { defaultValue: "Nenhum Test Case corresponde aos filtros." }) : t("noTestCases", { defaultValue: "Nenhum Test Case cadastrado." })}</h2><p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">{casos.data?.items.length ? t("adjustFilters", { defaultValue: "Ajuste ou limpe os filtros para ver os resultados." }) : t("noTestCasesHint", { defaultValue: "Crie um caso de teste manualmente ou importe uma planilha na criação do projeto." })}</p></div>
            </TableEmptyStatePanel></TableCell></TableRow>
          </TableBody>}
        </Table>
        {casos.isLoading && <p role="status" className="p-5 text-sm text-muted-foreground">{t("loading", { defaultValue: "Carregando…" })}</p>}
        {casos.isError && <p role="alert" className="p-5 text-sm text-destructive">{t("caseLoadError", { defaultValue: "Não foi possível carregar os Test Cases." })}</p>}
        <TablePagination page={pagina} pageSize={tamanhoPagina} totalCount={casos.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(size) => { setTamanhoPagina(size); setPagina(1); }} />
      </TableLayout> : <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-3"><label className="grid gap-1 text-xs text-muted-foreground">{t("week", { defaultValue: "Semana" })}<Input type="week" value={semana} onChange={(event) => { setSemana(event.target.value); setPagina(1); }} className="h-9 w-44" /></label><label className="grid gap-1 text-xs text-muted-foreground">{t("oneUi", { defaultValue: "One UI" })}<Input value={oneUi} onChange={(event) => { setOneUi(event.target.value); setPagina(1); }} placeholder={projeto.data.one_ui} className="h-9 w-36" /></label></div>
          {podeImportarSdf && <div className="flex items-center gap-2"><input ref={inputSdf} className="sr-only" type="file" accept=".xls,.xlsx" onChange={(event) => setArquivoSdf(event.target.files?.[0] ?? null)} /><Button variant="outline" onClick={() => inputSdf.current?.click()}><UploadCloud aria-hidden="true" className="size-4" />{arquivoSdf?.name ?? t("importSdf", { defaultValue: "Importar relatório SDF" })}</Button>{arquivoSdf && <Button disabled={importReport.isPending} onClick={() => importReport.mutate()}>{importReport.isPending ? t("saving") : t("import")}</Button>}</div>}
        </div>
        <TableLayout><Table containerClassName={resultados.data?.items.length ? "min-h-0 flex-1 overflow-auto" : "shrink-0 overflow-visible"}><TableHeader><TableRow><TableHead>{t("tcId")}</TableHead><TableHead>{t("sdfId")}</TableHead><TableHead>{t("deviceModel")}</TableHead><TableHead>{t("result")}</TableHead><TableHead>{t("date")}</TableHead><TableHead>{t("oneUi")}</TableHead></TableRow></TableHeader>{resultados.data?.items.length ? <TableBody>{resultados.data.items.map((row, index) => <TableRow key={`${row.sdf_id}-${row.modelo_dispositivo_id}-${index}`}><TableCell className="font-medium">{row.tc_id}</TableCell><TableCell>{row.sdf_id}</TableCell><TableCell>{row.modelo_nome}</TableCell><TableCell>{row.resultado}</TableCell><TableCell>{new Date(row.data_reportada).toLocaleDateString()}</TableCell><TableCell>{row.one_ui}</TableCell></TableRow>)}</TableBody> : null}</Table>{!resultados.isLoading && !resultados.isError && !resultados.data?.items.length && <TableEmptyState><p role="status">{t("noFormFactorResults", { defaultValue: "Nenhum resultado Form Factor cadastrado." })}</p></TableEmptyState>}<TablePagination page={pagina} pageSize={tamanhoPagina} totalCount={resultados.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(size) => { setTamanhoPagina(size); setPagina(1); }} /></TableLayout>
      </div>}
    </>}

    <Dialog open={criarAberto} onOpenChange={(open) => { setCriarAberto(open); if (!open) limparCaso(); }}>
      <DrawerContent><DrawerHeader><DrawerTitle>{editar ? t("editTestCase") : t("newTestCase")}</DrawerTitle></DrawerHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); saveCase.mutate(); }}>
          <div className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
            <div className="grid gap-2"><Label htmlFor="case-tc-id">{t("tcId")}</Label><Input id="case-tc-id" value={tcId} onChange={(event) => setTcId(event.target.value)} maxLength={120} disabled={Boolean(editar)} required /></div>
            <div className="grid gap-2"><Label>{t("category")}</Label><Select value={category} onValueChange={(value) => setCategory(value as CategoriaCasoTeste)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categorias.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label>{t("difficulty")}</Label><Select value={difficulty} onValueChange={(value) => setDifficulty(value as DificuldadeCasoTeste)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{dificuldades.map((value) => <SelectItem key={value} value={value}>{t(difficultyLabels[value])}</SelectItem>)}</SelectContent></Select></div>
            {editar && <div className="grid gap-2"><Label>{t("tcSituation")}</Label><Select value={situation} onValueChange={(value) => setSituation(value as SituacaoCasoTeste)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{situacoes.map((value) => <SelectItem key={value} value={value}>{t(situationLabels[value])}</SelectItem>)}</SelectContent></Select></div>}
            <div className="grid gap-2"><Label>{t("assignee")}</Label><Select value={responsavelId} onValueChange={setResponsavelId}><SelectTrigger><SelectValue placeholder={t("selectUser")} /></SelectTrigger><SelectContent>{membrosAtivos.map((member) => <SelectItem key={member.usuario_id} value={member.usuario_id}>{member.usuario_nome ?? member.usuario_id}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label>{t("backup")}</Label><Select value={backupId} onValueChange={setBackupId}><SelectTrigger><SelectValue placeholder={t("selectUser")} /></SelectTrigger><SelectContent>{membrosAtivos.filter((member) => member.usuario_id !== responsavelId).map((member) => <SelectItem key={member.usuario_id} value={member.usuario_id}>{member.usuario_nome ?? member.usuario_id}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-7 py-5"><DrawerClose asChild><Button type="button" variant="outline">{t("cancel")}</Button></DrawerClose><Button type="submit" disabled={saveCase.isPending || !tcId.trim() || !responsavelId || !backupId}>{saveCase.isPending ? t("saving") : t("save")}</Button></div>
        </form>
      </DrawerContent>
    </Dialog>
  </section>;
}
