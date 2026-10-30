import { useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button as HeroButton, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { MessageSquareText, Pencil, Plus, UploadCloud } from "lucide-react";
import { Navigate, useOutletContext, useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { formatDate } from "@/core/i18n/format";
import { timesApi } from "@/modules/times/api/times.api";
import { ApiError } from "@/shared/api/problem-details";
import { buscarTodasAsPaginas } from "@/shared/lib/exportar-planilha";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import { toast } from "@/shared/lib/toast";
import { formatarDiaIso } from "@/shared/lib/utils";
import { AlertConfirm } from "@/shared/ui/alert-confirm";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { DataTableFilter, DataTableMultiFilter } from "@/shared/ui/data-table-filter";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { TransferIcon } from "@/shared/ui/figma-icons";
import { InlineSelect, type InlineSelectOption } from "@/shared/ui/inline-select";
import { PageCard, PageTitle } from "@/shared/ui/page-card";
import { PageTabPanel, PageTabs } from "@/shared/ui/page-tabs";
import { RowActionButton, RowActions, type RowAction } from "@/shared/ui/row-action-button";
import { rowActionIconProps } from "@/shared/ui/row-action-icon";
import { TONS_ETIQUETA, TagChip } from "@/shared/ui/tag-chip";
import { WeekPickerHero } from "@/shared/ui/week-picker-hero";

import { CasoTesteDrawer } from "../components/casos-teste/CasoTesteDrawer";
import { DetalhesCasoTesteDrawer } from "../components/casos-teste/DetalhesCasoTesteDrawer";
import { TcIdBotao } from "../components/casos-teste/TcIdBotao";
import { ExcluirCasoTesteDialog } from "../components/casos-teste/ExcluirCasoTesteDialog";
import { JustificativaExclusaoDrawer } from "../components/casos-teste/JustificativaExclusaoDrawer";
import { estadoCasosTeste } from "../components/casos-teste/estado-casos-teste";
import { FormFactorTabela } from "../components/form-factor/FormFactorTabela";
import { FormFactorManualDialog } from "../components/form-factor/FormFactorManualDialog";
import { FormFactorCriarRodadaDialog } from "../components/form-factor/FormFactorCriarRodadaDialog";
import { FormFactorResultadosTabela } from "../components/form-factor/FormFactorResultadosTabela";
import { ProjetoSwitcher } from "../components/ProjetoSwitcher";
import { statusChipTons } from "../components/status/status-chip-estilos";
import { ProjetosEntradaPage } from "./ProjetosEntradaPage";
import { useCasosTeste, useCriarRodadaFormFactor, useFormFactor, useFormFactorResultados, useProjeto, useRegistrarResultadosRodadaFormFactor, useTransferirCasoTeste } from "../hooks/useProjetos";

import { casosTesteApi, formFactorApi, type CasoTeste, type LinhaFormFactor } from "../api/projetos.api";
import { DIFICULDADES_CASO_TESTE as dificuldades, OPCOES_CATEGORIA, NIVEIS_AUTOMACAO_CASO_TESTE as niveisAutomacao, ROTULO_AUTOMACAO, ROTULO_DIFICULDADE, ROTULO_SITUACAO, ROTULO_STATUS, SITUACOES_CASO_TESTE, STATUS_CASO_TESTE, opcoesRotuladas, perfilGerenciaCasos, type AtualizarCasoTesteInput, type CasoTesteResumo, type StatusCasoTeste } from "../model/projeto";

type CampoInline = "category" | "difficulty" | "automation_level" | "situation" | "status" | "responsavel_id" | "backup_id";
/** As células editam em texto; o Automation Level viaja como número (1, 2 ou 3). */
const valorDoCampo = (campo: CampoInline, valor: string) => campo === "automation_level" ? Number(valor) : valor;
type Aba = "cases" | "form-factor";
const ROTULO_ABA: Record<Aba, string> = { cases: "testCasesTab", "form-factor": "formFactor" };
// Valor do filtro de Backup para os casos sem backup.
const SEM_BACKUP = "__sem_backup__";
/** End Date do caso: a última atualização de um caso Done; os outros ainda não terminaram. */
const dataFinalDoCaso = (caso: CasoTeste) => caso.status === "Done" ? caso.updated_at ?? caso.created_at : null;
// Figma: data por extenso curta ("Mar 23, 2026").
function rotuloDataFinal(caso: CasoTeste) {
  const endDate = dataFinalDoCaso(caso);
  return endDate ? formatDate(endDate, { dateStyle: "medium" }) : "—";
}
// Colunas de valores fechados filtram por vários valores ao mesmo tempo; TC ID (texto) e End date (dia) filtram por um.
const FILTROS_CASO_VAZIOS = { tcId: "", status: [] as string[], situation: [] as string[], assignee: [] as string[], difficulty: [] as string[], category: [] as string[], automationLevel: [] as string[], endDate: "", backup: [] as string[] };

export function ProjetoDetalhePage() {
  const { projetoId = "" } = useParams();
  const [parametros] = useSearchParams();
  // A aba Kanban saiu da tela do projeto (spec 037, RN-11): um link antigo abre o Kanban no Board, com os filtros.
  if (parametros.get("aba") === "kanban") {
    const filtros = new URLSearchParams(parametros);
    filtros.delete("aba");
    return <Navigate replace to={{ pathname: `/board/${projetoId}`, search: filtros.toString() }} />;
  }
  // key: ao trocar de projeto, filtros, página e aba voltam ao estado inicial.
  return <ProjetoDetalhe key={projetoId} />;
}

function ProjetoDetalhe() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const { projetoId = "" } = useParams();
  const client = useQueryClient();
  // A aba fica na URL (?aba=form-factor), para um link abrir direto nela.
  const [parametros, setParametros] = useSearchParams();
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtrosCaso, setFiltrosCaso] = useState(FILTROS_CASO_VAZIOS);
  const [drawerCasoAberto, setDrawerCasoAberto] = useState(false);
  const [aberturasDrawer, setAberturasDrawer] = useState(0);
  const [editar, setEditar] = useState<CasoTeste | null>(null);
  const [casoDetalhado, setCasoDetalhado] = useState<CasoTesteResumo | null>(null);
  const [semana, setSemana] = useState("");
  const [assigneeFormFactor, setAssigneeFormFactor] = useState<string[]>([]);
  const [filtrosResumo, setFiltrosResumo] = useState({ tcId: "", sdfId: "", modeloDispositivoId: "", resultado: "" });
  const [visaoFormFactor, setVisaoFormFactor] = useState<"summary" | "results">("summary");
  const [filtrosResultados, setFiltrosResultados] = useState({ tcId: "", sdfId: "", origem: "", modeloDispositivoId: "", resultado: "" });
  const [responsaveisResultados, setResponsaveisResultados] = useState<string[]>([]);
  const [linhaManual, setLinhaManual] = useState<LinhaFormFactor | null>(null);
  const [abrirCriacaoRodada, setAbrirCriacaoRodada] = useState(false);
  const [semanaCasos, setSemanaCasos] = useState("");
  const [arquivoSdf, setArquivoSdf] = useState<File | null>(null);
  const inputSdf = useRef<HTMLInputElement>(null);

  const admin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  const dev = perfil.perfil_codigo === "USUARIO_PADRAO";
  const podeConsultar = admin || perfil.permissoes.includes("projetos.consultar") || perfil.permissoes.includes("test_cases.consultar");
  const podeGerenciarCasos = perfilGerenciaCasos(perfil);
  const podeConsultarCasos = admin || perfil.permissoes.includes("test_cases.consultar");
  const podeConsultarFormFactor = admin || perfil.permissoes.includes("form_factor.consultar");
  const perfilGestao = admin || ["GERENTE", "KP"].includes(perfil.perfil_codigo ?? "");
  const podeCriarRodada = perfilGestao && (admin || perfil.permissoes.includes("form_factor.registrar"));
  const podeImportarSdf = perfilGestao && (admin || perfil.permissoes.includes("form_factor.importar"));
  const podeRegistrarResultado = admin || (["GERENTE", "KP", "USUARIO_PADRAO"].includes(perfil.perfil_codigo ?? "") && perfil.permissoes.includes("form_factor.registrar"));
  const podeRegistrarLinha = (linha: LinhaFormFactor) => Boolean(linha.rodada_pendente_id) && (perfilGestao || linha.responsavel_id === perfil.id || linha.backup_id === perfil.id);
  const abasDisponiveis: Aba[] = [...(podeConsultarCasos ? ["cases"] as const : []), ...(podeConsultarFormFactor || podeImportarSdf ? ["form-factor"] as const : [])];
  const abaDaUrl = parametros.get("aba") as Aba | null;
  const aba: Aba = abaDaUrl && abasDisponiveis.includes(abaDaUrl) ? abaDaUrl : podeConsultarCasos ? "cases" : "form-factor";
  const projeto = useProjeto(projetoId, perfil, podeConsultar);
  const filtrosApiCasos = { responsavelIds: filtrosCaso.assignee.length ? filtrosCaso.assignee : undefined, ...(dev ? { associadosAMim: true } : {}), ...(semanaCasos ? { semana: semanaCasos } : {}) };
  const casos = useCasosTeste(projetoId, pagina, tamanhoPagina, filtrosApiCasos, perfil, Boolean(projeto.isSuccess && podeConsultarCasos && aba === "cases"));
  const associacao = useCasosTeste(projetoId, 1, 1, { associadosAMim: true }, perfil, dev && projeto.isSuccess && podeConsultarCasos);
  const membros = useQuery({ queryKey: ["projetos", projetoId, "membros", perfil.unidade_id, perfil.id], queryFn: async () => timesApi.membros(projeto.data!.time_id), enabled: projeto.isSuccess && (podeConsultarCasos || podeConsultarFormFactor) });
  const filtrosApiResumo = { semana: semana || undefined, responsavelIds: assigneeFormFactor.length ? assigneeFormFactor : undefined, tcId: filtrosResumo.tcId || undefined, sdfId: filtrosResumo.sdfId || undefined, modeloDispositivoId: filtrosResumo.modeloDispositivoId || undefined, resultado: filtrosResumo.resultado || undefined };
  const filtrosApiResultados = { semana: semana || undefined, tcId: filtrosResultados.tcId || undefined, sdfId: filtrosResultados.sdfId || undefined, responsavelIds: responsaveisResultados.length ? responsaveisResultados : undefined, origem: filtrosResultados.origem ? filtrosResultados.origem as "SDF" | "MANUAL" : undefined, modeloDispositivoId: filtrosResultados.modeloDispositivoId || undefined, resultado: filtrosResultados.resultado || undefined };
  const resultados = useFormFactor(projetoId, { page: pagina, pageSize: tamanhoPagina, ...filtrosApiResumo }, perfil, projeto.isSuccess && podeConsultarFormFactor && aba === "form-factor" && visaoFormFactor === "summary");
  const historico = useFormFactorResultados(projetoId, { page: pagina, pageSize: tamanhoPagina, ...filtrosApiResultados }, perfil, projeto.isSuccess && podeConsultarFormFactor && aba === "form-factor" && visaoFormFactor === "results");
  const criarRodada = useCriarRodadaFormFactor(projetoId);
  const registrarResultadoRodada = useRegistrarResultadosRodadaFormFactor(projetoId);

  const [casoParaExcluir, setCasoParaExcluir] = useState<CasoTeste | null>(null);
  const [casoComJustificativa, setCasoComJustificativa] = useState<CasoTeste | null>(null);
  const updateMemberCase = useMutation({
    // A exclusão leva a justificativa no mesmo PUT (spec 026).
    mutationFn: ({ id, field, value, justificativa }: { id: string; field: CampoInline; value: string; justificativa?: string }) =>
      casosTesteApi.atualizar(id, { [field]: valorDoCampo(field, value), ...(justificativa ? { justificativa_exclusao: justificativa } : {}) } as AtualizarCasoTesteInput),
    // A célula muda na hora; se a API recusar, o cache volta ao que era.
    onMutate: async ({ id, field, value, justificativa }) => {
      const queryKey = ["projetos", projetoId, "test-cases"];
      await client.cancelQueries({ queryKey });
      const anteriores = client.getQueriesData<Awaited<ReturnType<typeof casosTesteApi.listar>>>({ queryKey });
      client.setQueriesData<Awaited<ReturnType<typeof casosTesteApi.listar>>>({ queryKey }, (old) => old && { ...old, items: old.items.map((item) => item.id === id ? { ...item, [field]: valorDoCampo(field, value), ...(justificativa ? { justificativa_exclusao: justificativa } : {}) } : item) });
      return { anteriores };
    },
    onError: (error, _input, contexto) => {
      contexto?.anteriores.forEach(([queryKey, dados]) => client.setQueryData(queryKey, dados));
      toast.error(error instanceof Error ? error.message : t("caseUpdateError"));
    },
    onSuccess: (_caso, { field, value }) => { if (field === "status") toast.success(t("caseStatusUpdated", { status: t(ROTULO_STATUS[value as StatusCasoTeste]) })); },
    onSettled: () => client.invalidateQueries({ queryKey: ["projetos", projetoId, "test-cases"] }),
  });
  const transfer = useTransferirCasoTeste(projetoId);
  // A transferência troca os papéis (spec 011, RN-17): pede confirmação antes de enviar.
  const [casoParaTransferir, setCasoParaTransferir] = useState<CasoTeste | null>(null);
  const transferir = (id: string) => transfer.mutate(id, {
    onSuccess: () => { setCasoParaTransferir(null); toast.success(t("caseTransferred")); },
    onError: (error) => toast.error(error.message || t("caseTransferError")),
  });
  const importReport = useMutation({
    mutationFn: () => {
      if (!arquivoSdf) throw new Error(t("projectFileRequired"));
      return formFactorApi.importar(projetoId, arquivoSdf);
    },
    onSuccess: async (result) => { await client.invalidateQueries({ queryKey: ["projetos", projetoId, "form-factor"] }); setArquivoSdf(null); toast.success(t("sdfImportSuccess", { rows: result.quantidade_execucoes, results: result.quantidade_resultados })); },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("sdfImportError")),
  });

  const opcoes = useMemo(() => ({
    status: opcoesRotuladas(STATUS_CASO_TESTE, ROTULO_STATUS, t),
    situacao: opcoesRotuladas(SITUACOES_CASO_TESTE, ROTULO_SITUACAO, t),
    dificuldade: opcoesRotuladas(dificuldades, ROTULO_DIFICULDADE, t),
    categoria: OPCOES_CATEGORIA,
    automacao: opcoesRotuladas(niveisAutomacao, ROTULO_AUTOMACAO, t),
  }), [t]);
  const identificadoresMembros = useMemo(() => Object.fromEntries((membros.data ?? []).map((member) => [member.usuario_id, member.usuario_user_id ?? "—"])), [membros.data]);
  const { membrosAtivos, opcoesAssignee, opcoesMembros } = useMemo(() => {
    const ativos = (membros.data ?? []).filter((member) => member.ativo);
    const opcoesAssignee = ativos.map((member) => ({ value: member.usuario_id, label: member.usuario_user_id ?? "—", searchText: member.usuario_nome ?? "" }));
    return { membrosAtivos: ativos, opcoesAssignee, opcoesMembros: opcoesAssignee.map(({ value, label }) => ({ value, label })) };
  }, [membros.data]);
  const responsavelAtual = perfil.id;
  const mostrarAcoes = podeGerenciarCasos || Boolean(casos.data?.items.some((item) => item.responsavel_id === responsavelAtual));
  // A lista vazia do Assignee é verdadeira para Boolean: conta só quando tem alguém escolhido.
  const temFiltrosCaso = Boolean(semanaCasos || Object.values(filtrosCaso).some((valor) => Array.isArray(valor) ? valor.length > 0 : Boolean(valor)));
  const passaNosFiltrosCaso = (item: CasoTeste) => {
    const endDate = dataFinalDoCaso(item);
    const dataFinal = endDate ? formatarDiaIso(new Date(endDate)) : "";
    return item.tc_id.toLocaleLowerCase().includes(filtrosCaso.tcId.toLocaleLowerCase())
      && (!filtrosCaso.status.length || filtrosCaso.status.includes(item.status))
      && (!filtrosCaso.situation.length || filtrosCaso.situation.includes(item.situation))
      && (!filtrosCaso.assignee.length || filtrosCaso.assignee.includes(item.responsavel_id))
      && (!filtrosCaso.difficulty.length || filtrosCaso.difficulty.includes(item.difficulty))
      && (!filtrosCaso.category.length || filtrosCaso.category.includes(item.category))
      && (!filtrosCaso.automationLevel.length || filtrosCaso.automationLevel.includes(String(item.automation_level ?? "")))
      && (!filtrosCaso.endDate || dataFinal === filtrosCaso.endDate)
      && (!filtrosCaso.backup.length || filtrosCaso.backup.includes(item.backup_id ?? SEM_BACKUP));
  };
  const casosFiltrados = (casos.isError ? [] : casos.data?.items ?? []).filter(passaNosFiltrosCaso);
  // Parte dos filtros é local, sobre a página: para exportar tudo, busca todas as páginas e filtra depois.
  const buscarResumoParaExportar = () => buscarTodasAsPaginas((page, pageSize) => formFactorApi.listar(projetoId, { ...filtrosApiResumo, page, pageSize }));
  const buscarResultadosParaExportar = () => buscarTodasAsPaginas((page, pageSize) => formFactorApi.listarResultados(projetoId, { ...filtrosApiResultados, page, pageSize }));
  const buscarCasosParaExportar = async () => (await buscarTodasAsPaginas((page, pageSize) => casosTesteApi.listar(projetoId, page, pageSize, filtrosApiCasos))).filter(passaNosFiltrosCaso);
  const alterarFiltroCaso = <K extends keyof typeof filtrosCaso>(campo: K, valor: (typeof filtrosCaso)[K]) => {
    setPagina(1);
    setFiltrosCaso((atual) => ({ ...atual, [campo]: valor }));
  };
  const trocarAba = (proxima: Aba) => { setParametros({ aba: proxima }, { replace: true }); setPagina(1); };

  function abrirCaso(testCase: CasoTeste | null) {
    setEditar(testCase);
    setAberturasDrawer((total) => total + 1);
    setDrawerCasoAberto(true);
  }

  if (!podeConsultar || (!podeConsultarCasos && !podeConsultarFormFactor && !podeImportarSdf)) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;
  if (dev && !podeConsultarCasos) return <p role="alert">{t("permissionDenied")}</p>;
  if (projeto.isError) return <p role="alert" className="p-6 text-sm">{t("projectNotFound")}</p>;
  // Spec 012: dev sem casos no projeto vai para a entrada de Projects.
  if (dev && projeto.isSuccess && associacao.isSuccess && !associacao.isFetching && associacao.data.total_count === 0) return <ProjetosEntradaPage projetoSemCasosId={projetoId} />;

  const membrosExceto = (usuarioId: string | null) => opcoesMembros.filter((opcao) => opcao.value !== usuarioId);
  const podeEditarProprio = (caso: CasoTeste) => podeGerenciarCasos || caso.responsavel_id === responsavelAtual;
  /** Status que o usuário pode escolher (spec 023): a gestão e o responsável editam livre e o Backup só exclui. */
  const opcoesStatusDoCaso = (caso: CasoTeste) => {
    if (podeGerenciarCasos || caso.responsavel_id === responsavelAtual) return opcoes.status;
    const permitidos: StatusCasoTeste[] = caso.backup_id === responsavelAtual ? [...new Set([caso.status, "Cancelled" as const])] : [];
    return opcoesRotuladas(permitidos, ROTULO_STATUS, t);
  };
  /** Célula com edição na linha quando o usuário pode editar; senão, só o valor. */
  // Excluded tira o caso do fluxo e o DEV não consegue desfazer: pede confirmação antes de gravar.
  const alterarCampo = (caso: CasoTeste, campo: CampoInline, value: string) => campo === "status" && value === "Cancelled"
    ? setCasoParaExcluir(caso)
    : updateMemberCase.mutate({ id: caso.id, field: campo, value });
  const celulaEditavel = (caso: CasoTeste, campo: CampoInline, rotulo: string, valor: string, opcoes: InlineSelectOption[], exibicao: ReactNode, podeEditar: boolean) => podeEditar
    ? <InlineSelect aria-label={`${rotulo} ${caso.tc_id}`} value={valor} options={opcoes} onChange={(value) => alterarCampo(caso, campo, value)}>{exibicao}</InlineSelect>
    : exibicao;

  const rotuloStatus = (caso: CasoTeste) => t(ROTULO_STATUS[caso.status]);
  const rotuloSituacao = (caso: CasoTeste) => t(ROTULO_SITUACAO[caso.situation]);
  const rotuloDificuldade = (caso: CasoTeste) => t(ROTULO_DIFICULDADE[caso.difficulty]);
  const rotuloAutomacao = (caso: CasoTeste) => caso.automation_level ? t(ROTULO_AUTOMACAO[caso.automation_level]) : "—";
  const rotuloAssignee = (caso: CasoTeste) => identificadoresMembros[caso.responsavel_id] ?? "—";
  const rotuloBackup = (caso: CasoTeste) => caso.backup_id ? identificadoresMembros[caso.backup_id] ?? "—" : "—";
  const primeiraDaPagina = (pagina - 1) * tamanhoPagina;
  // O filtro é local: o mesmo caso muda de posição sem mudar de identidade, então o número depende da ordem.
  const ordemDosCasos = casosFiltrados.map((caso) => caso.id).join();
  const colunas: DataTableColumn<CasoTeste>[] = [
    { id: "numero", header: "", className: "w-12 text-right tabular-nums text-muted after:hidden", cell: (caso) => String(primeiraDaPagina + casosFiltrados.indexOf(caso) + 1).padStart(2, "0") },
    { id: "tcId", isRowHeader: true, header: <DataTableFilter label={t("tcId")} value={filtrosCaso.tcId} onChange={(value) => alterarFiltroCaso("tcId", value)} />,
      // Botão, não link: abre o painel de detalhes (spec 028) sem sair da página; o React Aria devolve o foco a ele ao fechar.
      cell: (caso) => <TcIdBotao caso={caso} onAbrir={setCasoDetalhado} />, exportar: { titulo: t("tcId"), valor: (caso) => caso.tc_id } },
    {
      id: "status",
      header: <DataTableMultiFilter label={t("status")} values={filtrosCaso.status} onChange={(values) => alterarFiltroCaso("status", values)} options={opcoes.status} />,
      exportar: { titulo: t("status"), valor: rotuloStatus },
      cell: (caso) => {
        const opcoesStatus = opcoesStatusDoCaso(caso);
        return celulaEditavel(caso, "status", t("status"), caso.status, opcoesStatus, <TagChip tom={statusChipTons[caso.status]}>{rotuloStatus(caso)}</TagChip>, opcoesStatus.length > 0);
      },
    },
    {
      id: "situation",
      header: <DataTableMultiFilter label={t("tcSituation")} values={filtrosCaso.situation} onChange={(values) => alterarFiltroCaso("situation", values)} options={opcoes.situacao} />,
      exportar: { titulo: t("tcSituation"), valor: rotuloSituacao },
      cell: (caso) => celulaEditavel(caso, "situation", t("tcSituation"), caso.situation, opcoes.situacao, <TagChip tom={TONS_ETIQUETA.neutro}>{rotuloSituacao(caso)}</TagChip>, podeEditarProprio(caso)),
    },
    {
      id: "assignee",
      header: <DataTableMultiFilter label={t("assignee")} values={filtrosCaso.assignee} onChange={(values) => alterarFiltroCaso("assignee", values)} options={opcoesAssignee} searchable />,
      exportar: { titulo: t("assignee"), valor: rotuloAssignee },
      cell: (caso) => celulaEditavel(caso, "responsavel_id", t("assignee"), caso.responsavel_id, membrosExceto(caso.backup_id), <span>{rotuloAssignee(caso)}</span>, podeGerenciarCasos),
    },
    {
      id: "difficulty",
      header: <DataTableMultiFilter label={t("difficulty")} values={filtrosCaso.difficulty} onChange={(values) => alterarFiltroCaso("difficulty", values)} options={opcoes.dificuldade} />,
      exportar: { titulo: t("difficulty"), valor: rotuloDificuldade },
      cell: (caso) => celulaEditavel(caso, "difficulty", t("difficulty"), caso.difficulty, opcoes.dificuldade, <span>{rotuloDificuldade(caso)}</span>, podeEditarProprio(caso)),
    },
    {
      id: "category",
      header: <DataTableMultiFilter label={t("category")} values={filtrosCaso.category} onChange={(values) => alterarFiltroCaso("category", values)} options={opcoes.categoria} />,
      exportar: { titulo: t("category"), valor: (caso) => caso.category },
      cell: (caso) => celulaEditavel(caso, "category", t("category"), caso.category, opcoes.categoria, <span>{caso.category}</span>, podeEditarProprio(caso)),
    },
    {
      id: "automationLevel",
      header: <DataTableMultiFilter label={t("automationLevel")} values={filtrosCaso.automationLevel} onChange={(values) => alterarFiltroCaso("automationLevel", values)} options={opcoes.automacao} />,
      exportar: { titulo: t("automationLevel"), valor: rotuloAutomacao },
      cell: (caso) => celulaEditavel(caso, "automation_level", t("automationLevel"), String(caso.automation_level ?? ""), opcoes.automacao, <span>{rotuloAutomacao(caso)}</span>, podeEditarProprio(caso)),
    },
    {
      id: "endDate",
      header: <DataTableFilter label={t("endDate")} value={filtrosCaso.endDate} onChange={(value) => alterarFiltroCaso("endDate", value)} type="date" />,
      exportar: { titulo: t("endDate"), valor: rotuloDataFinal },
      cell: (caso) => <span className="block text-center">{rotuloDataFinal(caso)}</span>,
    },
    {
      id: "backup",
      header: <DataTableMultiFilter label={t("backup")} values={filtrosCaso.backup} onChange={(values) => alterarFiltroCaso("backup", values)} options={[...opcoesAssignee, { value: SEM_BACKUP, label: t("noBackup") }]} searchable />,
      exportar: { titulo: t("backup"), valor: rotuloBackup },
      cell: (caso) => celulaEditavel(caso, "backup_id", t("backup"), caso.backup_id ?? "", membrosExceto(caso.responsavel_id), <span>{rotuloBackup(caso)}</span>, podeGerenciarCasos),
    },
    {
      // Spec 026: qualquer perfil que vê o TC lê a justificativa da exclusão.
      id: "notes",
      header: t("notes"),
      className: "w-px whitespace-nowrap",
      // Na tela, um botão abre a justificativa; na planilha vai o próprio texto.
      exportar: { titulo: t("notes"), valor: (caso) => caso.status === "Cancelled" && caso.justificativa_exclusao ? caso.justificativa_exclusao : "—" },
      cell: (caso) => caso.status === "Cancelled" && caso.justificativa_exclusao
        ? <RowActionButton identificador={caso.tc_id} action={{ label: t("viewJustification"), icon: <MessageSquareText {...rowActionIconProps} />, onPress: () => setCasoComJustificativa(caso) }} />
        : <span className="block text-center">—</span>,
    },
    ...(mostrarAcoes ? [{
      id: "acoes",
      header: t("actions"),
      className: "w-px whitespace-nowrap",
      cell: (caso: CasoTeste) => {
        const acoes: RowAction[] = [
          ...(podeGerenciarCasos ? [{ label: t("edit"), icon: <Pencil {...rowActionIconProps} />, onPress: () => abrirCaso(caso) }] : []),
          ...(caso.responsavel_id === responsavelAtual && caso.backup_id ? [{ label: t("transferToBackup"), icon: <TransferIcon />, disabled: transfer.isPending, onPress: () => setCasoParaTransferir(caso) }] : []),
        ];
        return acoes.length ? <RowActions identificador={caso.tc_id} actions={acoes} /> : null;
      },
    }] : []),
  ];
  const estadoCasos = estadoCasosTeste(t, {
    isLoading: casos.isLoading,
    isError: casos.isError,
    isEmpty: !casosFiltrados.length,
    hasFilters: temFiltrosCaso,
    onClearFilters: () => { setSemanaCasos(""); setFiltrosCaso(FILTROS_CASO_VAZIOS); setPagina(1); },
    errorLabel: t("caseLoadError"),
  });

  return <PageCard>
    <header className="mb-[25px] flex shrink-0 flex-wrap items-start gap-4">
      <div className="min-w-0 flex-1">{projeto.data ? <ProjetoSwitcher projetoId={projetoId} nome={projeto.data.nome} /> : <PageTitle>{t("loadingProjects")}</PageTitle>}</div>
      {projeto.data && <WeekPickerHero label={t("week")} value={aba === "cases" ? semanaCasos : semana} onChange={(valor) => { if (aba === "cases") setSemanaCasos(valor); else setSemana(valor); setPagina(1); }} className="ml-auto" />}
    </header>
    {/* Figma: o seletor de visão do Form Factor fica entre o título e as abas, com Results primeiro. */}
    {projeto.data && aba === "form-factor" && (podeConsultarFormFactor || podeImportarSdf) && <div className="mb-5 flex shrink-0 flex-wrap items-center justify-between gap-3">
      <ToggleButtonGroup
        aria-label={t("formFactorViews")}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[visaoFormFactor]}
        onSelectionChange={(chaves) => { const [chave] = chaves; if (chave) { setVisaoFormFactor(chave as "summary" | "results"); setPagina(1); } }}
        className="w-fit gap-0 rounded-xl bg-panel p-1"
      >
        {(["results", "summary"] as const).map((visao) => (
          <ToggleButton key={visao} id={visao} className="h-8 min-w-24 rounded-lg border-0 bg-transparent px-5 text-[13px] font-medium text-body shadow-none data-[selected=true]:bg-surface data-[selected=true]:text-accent-text data-[selected=true]:shadow-sm">
            {t(visao === "results" ? "formFactorResults" : "formFactorSummary")}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <p className="text-[14px] text-muted">{t(visaoFormFactor === "summary" ? "formFactorSummaryHint" : "formFactorResultsHint")}</p>
    </div>}

    {projeto.isLoading ? <p role="status" className="py-8 text-[14px] text-muted">{t("loadingProjects")}</p> : projeto.isError || !projeto.data ? <p role="alert" className="py-8 text-[14px] text-muted">{t("projectNotFound")}</p> : (
      <PageTabs
        aria-label={t("projectTabs")}
        tabs={abasDisponiveis.map((id) => ({ id, label: t(ROTULO_ABA[id]) }))}
        selectedKey={aba}
        onSelectionChange={(chave) => trocarAba(chave as Aba)}
        actions={aba === "cases" ? podeGerenciarCasos && <HeroButton variant="primary" size="sm" onPress={() => abrirCaso(null)}><Plus aria-hidden="true" className="size-4" />{t("newTestCase")}</HeroButton> : <>{podeCriarRodada && <HeroButton variant="primary" size="sm" onPress={() => setAbrirCriacaoRodada(true)}><Plus aria-hidden="true" className="size-4" />{t("createTestRound")}</HeroButton>}{podeImportarSdf && <><input ref={inputSdf} className="sr-only" type="file" accept=".xls,.xlsx" tabIndex={-1} aria-hidden="true" onChange={(event) => { setArquivoSdf(event.target.files?.[0] ?? null); event.target.value = ""; }} /><HeroButton size="sm" variant="outline" className="h-auto min-h-8 whitespace-normal text-left leading-tight" onPress={() => inputSdf.current?.click()}><UploadCloud aria-hidden="true" className="size-4 shrink-0" />{arquivoSdf?.name ?? t("importSdf")}</HeroButton>{arquivoSdf && <HeroButton size="sm" variant="primary" isDisabled={importReport.isPending} onPress={() => importReport.mutate()}>{importReport.isPending ? t("saving") : t("import")}</HeroButton>}</>}</>}
      >
        {podeConsultarCasos && <PageTabPanel id="cases" className="flex min-h-0 flex-1 flex-col p-0">
          <DataTable
            aria-label={t("testCasesTab")}
            columns={colunas}
            items={casosFiltrados}
            state={estadoCasos}
            pagination={<DataTablePagination page={pagina} pageSize={tamanhoPagina} totalCount={casos.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(size) => { setTamanhoPagina(size); setPagina(1); }} />}
            exportacao={{ listagem: "test-cases", todosOsItens: buscarCasosParaExportar }}
            rowDependencies={[t, opcoes, identificadoresMembros, opcoesMembros, podeGerenciarCasos, responsavelAtual, mostrarAcoes, transfer.isPending, primeiraDaPagina, ordemDosCasos]}
          />
        </PageTabPanel>}
        {(podeConsultarFormFactor || podeImportarSdf) && <PageTabPanel id="form-factor" className="flex min-h-0 flex-1 flex-col gap-4 p-0">
          {visaoFormFactor === "summary"
            ? <div className="flex min-h-0 flex-1 flex-col">
                <FormFactorTabela dados={resultados.data} carregando={resultados.isLoading} erro={resultados.isError} identificadoresMembros={identificadoresMembros} opcoesAssignee={opcoesAssignee} assignee={assigneeFormFactor} onAssigneeChange={(valor) => { setAssigneeFormFactor(valor); setPagina(1); }} tcId={filtrosResumo.tcId} sdfId={filtrosResumo.sdfId} onFiltroTexto={(campo, valor) => { setFiltrosResumo((atual) => ({ ...atual, [campo]: valor })); setPagina(1); }} modeloDispositivoId={filtrosResumo.modeloDispositivoId} resultadoFiltro={filtrosResumo.resultado} onFiltroResultado={(modeloId, valor) => { setFiltrosResumo({ ...filtrosResumo, modeloDispositivoId: valor ? modeloId : "", resultado: valor }); setPagina(1); }} podeRegistrar={podeRegistrarResultado ? podeRegistrarLinha : undefined} onRegistrar={setLinhaManual} onAbrirDetalhes={setCasoDetalhado} buscarTodos={buscarResumoParaExportar} temFiltros={Boolean(semana || assigneeFormFactor.length || filtrosResumo.tcId || filtrosResumo.sdfId || filtrosResumo.resultado)} onLimparFiltros={() => { setSemana(""); setAssigneeFormFactor([]); setFiltrosResumo({ tcId: "", sdfId: "", modeloDispositivoId: "", resultado: "" }); setPagina(1); }} page={pagina} pageSize={tamanhoPagina} onPageChange={setPagina} onPageSizeChange={(size) => { setTamanhoPagina(size); setPagina(1); }} />
              </div>
            : <div className="flex min-h-0 flex-1 flex-col">
                <FormFactorResultadosTabela onAbrirDetalhes={setCasoDetalhado} buscarTodos={buscarResultadosParaExportar} dados={historico.data} carregando={historico.isLoading} erro={historico.isError} identificadoresMembros={identificadoresMembros} opcoesAssignee={opcoesAssignee} filtros={filtrosResultados} responsaveis={responsaveisResultados} onResponsaveisChange={(valores) => { setResponsaveisResultados(valores); setPagina(1); }} onFiltroChange={(campo, valor) => { setFiltrosResultados((atual) => ({ ...atual, [campo]: valor })); setPagina(1); }} onFiltroResultado={(modeloId, valor) => { setFiltrosResultados((atual) => ({ ...atual, modeloDispositivoId: valor ? modeloId : "", resultado: valor })); setPagina(1); }} onLimparFiltros={() => { setFiltrosResultados({ tcId: "", sdfId: "", origem: "", modeloDispositivoId: "", resultado: "" }); setResponsaveisResultados([]); setPagina(1); }} page={pagina} pageSize={tamanhoPagina} onPageChange={setPagina} onPageSizeChange={(size) => { setTamanhoPagina(size); setPagina(1); }} />
              </div>}
        </PageTabPanel>}
      </PageTabs>
    )}

    <ExcluirCasoTesteDialog
      caso={casoParaExcluir}
      podeGerenciar={podeGerenciarCasos}
      isPending={updateMemberCase.isPending}
      onFechar={() => setCasoParaExcluir(null)}
      onConfirmar={(justificativa) => { if (casoParaExcluir) updateMemberCase.mutate({ id: casoParaExcluir.id, field: "status", value: "Cancelled", justificativa }, { onSuccess: () => setCasoParaExcluir(null) }); }}
    />
    <AlertConfirm
      open={Boolean(casoParaTransferir)}
      onOpenChange={(open) => { if (!open && !transfer.isPending) setCasoParaTransferir(null); }}
      title={t("transferCaseTitle")}
      description={t("transferCaseDescription", { tc: casoParaTransferir?.tc_id ?? "", name: casoParaTransferir?.backup_id ? identificadoresMembros[casoParaTransferir.backup_id] ?? "—" : "—" })}
      confirmLabel={t("transferToBackup")}
      isPending={transfer.isPending}
      onConfirm={() => { if (casoParaTransferir) transferir(casoParaTransferir.id); }}
    />
    <JustificativaExclusaoDrawer caso={casoComJustificativa} onFechar={() => setCasoComJustificativa(null)} />
    <DetalhesCasoTesteDrawer caso={casoDetalhado} perfil={perfil} onFechar={() => setCasoDetalhado(null)} />
    <CasoTesteDrawer key={aberturasDrawer} isOpen={drawerCasoAberto} onOpenChange={setDrawerCasoAberto} projetoId={projetoId} editar={editar} membrosAtivos={membrosAtivos} />
    <FormFactorCriarRodadaDialog
      aberto={abrirCriacaoRodada}
      onAbertoChange={setAbrirCriacaoRodada}
      salvando={criarRodada.isPending}
      onCriar={(sdfId) => criarRodada.mutate({ sdf_id: sdfId }, {
        onSuccess: () => { setAbrirCriacaoRodada(false); toast.success(t("testRoundCreated")); },
        // Erros no toast, com o modal aberto para corrigir; o SDF ID repetido usa a mensagem traduzida.
        onError: (error) => toast.error(error instanceof ApiError && error.problem.errors?.some((erro) => erro.campo === "sdf_id")
          ? t("sdfIdAlreadyUsed")
          : error instanceof Error ? error.message : t("roundCreateError")),
      })}
    />
    <FormFactorManualDialog
      aberto={Boolean(linhaManual)}
      onAbertoChange={(aberto) => { if (!aberto) setLinhaManual(null); }}
      linha={linhaManual}
      modelos={resultados.data?.modelos ?? []}
      salvando={registrarResultadoRodada.isPending}
      onSalvar={(input) => linhaManual?.rodada_pendente_id && registrarResultadoRodada.mutate({ rodadaId: linhaManual.rodada_pendente_id, casoTesteId: linhaManual.caso_teste_id, input }, {
        onSuccess: () => { setLinhaManual(null); toast.success(t("manualResultSaved")); },
        onError: (error) => toast.error(error instanceof Error ? error.message : t("manualResultSaveError")),
      })}
    />
  </PageCard>;
}
