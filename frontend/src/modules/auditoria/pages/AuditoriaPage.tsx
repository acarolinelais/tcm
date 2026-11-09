import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";
import { Eye } from "lucide-react";

import type { PerfilAtual } from "@/core/auth/api";
import { formatDate } from "@/core/i18n/format";
import { buscarTodasAsPaginas } from "@/shared/lib/exportar-planilha";
import { comOpcaoTodos } from "@/shared/lib/opcoes";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import { toast } from "@/shared/lib/toast";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { DataTableFilter, DataTableMultiFilter } from "@/shared/ui/data-table-filter";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { estadoDaTabela } from "@/shared/ui/data-table-state";
import { PageCard, PageDescription, PageTitle } from "@/shared/ui/page-card";
import { RowActions } from "@/shared/ui/row-action-button";
import { rowActionIconProps } from "@/shared/ui/row-action-icon";
import { TONS_ETIQUETA, TagChip } from "@/shared/ui/tag-chip";
import { listarPerfis } from "@/modules/perfis/api/perfis.api";
import { projetosApi } from "@/modules/projetos/api/projetos.api";
import { usuarioApi } from "@/modules/usuarios/api/usuario.api";

import { auditoriaApi } from "../api/auditoria.api";
import { ComparacaoAlteracao } from "../components/ComparacaoAlteracao";
import { DetalheAuditoriaDrawer } from "../components/DetalheAuditoriaDrawer";
import { useAuditoria } from "../hooks/useAuditoria";
import {
  ACOES_AUDITORIA,
  ORIGENS_AUDITORIA,
  ROTULO_ACAO,
  ROTULO_ORIGEM,
  TOM_ACAO,
  periodoInvalido,
  resumoAlteracoes,
  rotuloOrigem,
  tomOrigem,
  type FiltrosAuditoria,
  type RegistroAuditoria,
} from "../model/auditoria";

const dataHora = (registro: RegistroAuditoria) => formatDate(registro.alterado_em, { dateStyle: "short", timeStyle: "short" });

export function AuditoriaPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const admin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtros, setFiltros] = useState<FiltrosAuditoria>({});
  const [detalhe, setDetalhe] = useState<RegistroAuditoria | null>(null);
  const registros = useAuditoria(pagina, tamanho, filtros, admin);
  // Opções dos filtros: todas as pessoas, perfis e projetos da unidade.
  const usuarios = useQuery({ queryKey: ["usuarios", "opcoes-auditoria"], queryFn: () => buscarTodasAsPaginas((page, pageSize) => usuarioApi.listar(page, pageSize)), enabled: admin });
  const perfis = useQuery({ queryKey: ["perfis"], queryFn: listarPerfis, enabled: admin });
  const projetos = useQuery({ queryKey: ["projetos", "opcoes-auditoria"], queryFn: () => buscarTodasAsPaginas((page, pageSize) => projetosApi.listar(page, pageSize)), enabled: admin });
  if (!admin) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;

  const itens = registros.isError ? [] : registros.data?.items ?? [];
  const temFiltro = Object.values(filtros).some(Boolean);
  function alterarFiltro(novos: Partial<FiltrosAuditoria>) {
    const proximos = { ...filtros, ...novos };
    // CA-10: um período invertido não é aplicado.
    if (periodoInvalido(proximos)) return toast.error(t("auditInvalidPeriod"));
    setPagina(1);
    setFiltros(proximos);
  }
  // Valor vazio desliga o filtro.
  const filtro = (campo: Exclude<keyof FiltrosAuditoria, "usuario_id">) => (valor: string) => alterarFiltro({ [campo]: valor || undefined });
  const opcoesAcao = ACOES_AUDITORIA.map((acao) => ({ value: acao, label: t(ROTULO_ACAO[acao]) }));
  const opcoesOrigem = ORIGENS_AUDITORIA.map((origem) => ({ value: origem, label: t(ROTULO_ORIGEM[origem]) }));

  const colunas: DataTableColumn<RegistroAuditoria>[] = [
    {
      id: "alterado_em",
      header: <div className="flex gap-4">
        <DataTableFilter label={t("auditPeriodFrom")} accessibleLabel={`${t("auditDateTime")} ${t("auditPeriodFrom")}`} type="date" value={filtros.data_inicio ?? ""} onChange={filtro("data_inicio")} />
        <DataTableFilter label={t("auditPeriodTo")} accessibleLabel={`${t("auditDateTime")} ${t("auditPeriodTo")}`} type="date" value={filtros.data_fim ?? ""} onChange={filtro("data_fim")} />
      </div>,
      cell: dataHora,
      className: "whitespace-nowrap tabular-nums",
      exportar: { titulo: t("auditDateTime"), valor: dataHora },
    },
    {
      id: "usuario",
      header: <DataTableMultiFilter label={t("user")} values={filtros.usuario_id ?? []} onChange={(ids) => alterarFiltro({ usuario_id: ids.length ? ids : undefined })} options={(usuarios.data ?? []).map((usuario) => ({ value: usuario.id, label: usuario.nome, searchText: usuario.email }))} searchable />,
      cell: (registro) => registro.usuario_nome ?? "—",
      exportar: { titulo: t("user"), valor: (registro) => registro.usuario_nome ?? "—" },
    },
    {
      id: "perfil",
      header: <DataTableFilter label={t("profile")} value={filtros.perfil ?? ""} onChange={filtro("perfil")} options={comOpcaoTodos(t("all"), (perfis.data ?? []).map((item) => ({ value: item.nome, label: item.nome })))} />,
      cell: (registro) => registro.usuario_perfil ?? "—",
      exportar: { titulo: t("profile"), valor: (registro) => registro.usuario_perfil ?? "—" },
    },
    {
      id: "acao",
      header: <DataTableFilter label={t("auditAction")} value={filtros.acao ?? ""} onChange={filtro("acao")} options={comOpcaoTodos(t("all"), opcoesAcao)} />,
      cell: (registro) => <TagChip tom={TOM_ACAO[registro.acao]}>{t(ROTULO_ACAO[registro.acao])}</TagChip>,
      exportar: { titulo: t("auditAction"), valor: (registro) => t(ROTULO_ACAO[registro.acao]) },
    },
    {
      id: "tc_id",
      isRowHeader: true,
      header: <DataTableFilter label={t("tcId")} value={filtros.tc_id ?? ""} onChange={filtro("tc_id")} placeholder={t("auditSearchTcId")} />,
      cell: (registro) => registro.tc_id,
      exportar: { titulo: t("tcId"), valor: (registro) => registro.tc_id },
    },
    {
      id: "projeto",
      header: <DataTableFilter label={t("project")} value={filtros.projeto_id ?? ""} onChange={filtro("projeto_id")} options={comOpcaoTodos(t("all"), (projetos.data ?? []).map((projeto) => ({ value: projeto.id, label: projeto.nome })))} searchable />,
      cell: (registro) => registro.projeto_nome,
      exportar: { titulo: t("project"), valor: (registro) => registro.projeto_nome },
    },
    {
      id: "alteracoes",
      header: t("auditChanges"),
      // A primeira mudança em cores e "+N" para as demais (RN-03); o texto completo fica no title e na planilha.
      cell: (registro) => registro.alteracoes.length ? <span className="flex max-w-[420px] items-center gap-1.5" title={resumoAlteracoes(registro, t)}>
        <ComparacaoAlteracao alteracao={registro.alteracoes[0]} compacto />
        {registro.alteracoes.length > 1 ? <TagChip tom={TONS_ETIQUETA.neutro} className="shrink-0">{t("auditMore", { count: registro.alteracoes.length - 1 })}</TagChip> : null}
      </span> : "—",
      exportar: { titulo: t("auditChanges"), valor: (registro) => resumoAlteracoes(registro, t) },
    },
    {
      id: "origem",
      header: <DataTableFilter label={t("origin")} value={filtros.origem ?? ""} onChange={filtro("origem")} options={comOpcaoTodos(t("all"), opcoesOrigem)} />,
      cell: (registro) => <TagChip tom={tomOrigem(registro.origem)}>{rotuloOrigem(registro.origem, t)}</TagChip>,
      exportar: { titulo: t("origin"), valor: (registro) => rotuloOrigem(registro.origem, t) },
    },
    {
      id: "tela",
      header: <DataTableFilter label={t("auditScreen")} value={filtros.tela ?? ""} onChange={filtro("tela")} placeholder={t("auditSearchScreen")} />,
      cell: (registro) => registro.tela ?? "—",
      exportar: { titulo: t("auditScreen"), valor: (registro) => registro.tela ?? "—" },
    },
    {
      id: "acoes",
      header: t("actions"),
      className: "w-px whitespace-nowrap",
      cell: (registro) => <RowActions identificador={registro.tc_id} actions={[{ label: t("viewAuditDetails"), icon: <Eye {...rowActionIconProps} />, onPress: () => setDetalhe(registro) }]} />,
    },
  ];

  const estado = estadoDaTabela({
    isLoading: registros.isLoading,
    isError: registros.isError,
    isEmpty: !itens.length,
    hasFilters: temFiltro,
    onClearFilters: () => { setPagina(1); setFiltros({}); },
    loadingLabel: t("auditLoading"),
    errorLabel: t("auditLoadError"),
    clearFiltersLabel: t("clearFilters"),
    empty: { title: t("noAuditRecords"), hint: t("noAuditRecordsHint") },
    filtered: { title: t("noAuditResults"), hint: t("noAuditResultsHint") },
  });

  return <PageCard>
    <header className="mb-5 flex shrink-0 items-start justify-between gap-4">
      <div className="min-w-0"><PageTitle>{t("audit")}</PageTitle><PageDescription>{t("auditDescription")}</PageDescription></div>
    </header>
    <DataTable
      aria-label={t("audit")}
      columns={colunas}
      items={itens}
      getKey={(registro) => String(registro.id)}
      state={estado}
      pagination={<DataTablePagination page={pagina} pageSize={tamanho} totalCount={registros.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(n) => { setTamanho(n); setPagina(1); }} />}
      exportacao={{ listagem: "auditoria", todosOsItens: () => buscarTodasAsPaginas((page, pageSize) => auditoriaApi.listar(page, pageSize, filtros)) }}
      rowDependencies={[t]}
    />
    <DetalheAuditoriaDrawer registro={detalhe} onFechar={() => setDetalhe(null)} />
  </PageCard>;
}
