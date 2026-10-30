import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@heroui/react";
import { Pencil, Plus, Power, PowerOff, Smartphone } from "lucide-react";

import type { PerfilAtual } from "@/core/auth/api";
import { formatDate } from "@/core/i18n/format";
import { buscarTodasAsPaginas } from "@/shared/lib/exportar-planilha";
import { comOpcaoTodos } from "@/shared/lib/opcoes";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import { toast } from "@/shared/lib/toast";
import { AlertConfirm } from "@/shared/ui/alert-confirm";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { DataTableFilter } from "@/shared/ui/data-table-filter";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { estadoDaTabela } from "@/shared/ui/data-table-state";
import { PageCard, PageTitle } from "@/shared/ui/page-card";
import { RowActions, type RowAction } from "@/shared/ui/row-action-button";
import { rowActionIconProps } from "@/shared/ui/row-action-icon";
import { TONS_ETIQUETA, TagChip } from "@/shared/ui/tag-chip";

import { modelosDispositivoApi } from "../api/modelos-dispositivo.api";
import { ModeloDispositivoDrawer } from "../components/ModeloDispositivoDrawer";
import { useDefinirAtivoModeloDispositivo, useModelosDispositivoList } from "../hooks/useModelosDispositivo";
import type { ModeloDispositivo, ModeloDispositivoFiltros } from "../model/modelo-dispositivo";

const PERMISSAO_GERENCIAR_MODELOS = "modelos_dispositivo.gerenciar";

function podeGerenciarModelos(perfil: PerfilAtual) {
  return perfil.permissoes.includes(PERMISSAO_GERENCIAR_MODELOS);
}

const formatarData = (valor: string | null) => (valor ? formatDate(valor) : "—");

export function ModelosDispositivoPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const podeGerenciar = podeGerenciarModelos(perfil);
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtros, setFiltros] = useState<ModeloDispositivoFiltros>({});
  // undefined: drawer fechado; null: criando; modelo: editando.
  const [emEdicao, setEmEdicao] = useState<ModeloDispositivo | null | undefined>(undefined);
  const [paraInativar, setParaInativar] = useState<ModeloDispositivo | null>(null);
  const modelos = useModelosDispositivoList(pagina, tamanho, filtros, podeGerenciar);
  const definirAtivo = useDefinirAtivoModeloDispositivo();
  const totalPaginas = Math.max(1, Math.ceil((modelos.data?.total_count ?? 0) / tamanho));
  // Inativar o último item de uma página filtrada encolhe a lista: volta para a última página que existe.
  useEffect(() => { if (modelos.data && pagina > totalPaginas) setPagina(totalPaginas); }, [modelos.data, pagina, totalPaginas]);

  if (!podeGerenciar) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;

  const itens = modelos.isError ? [] : modelos.data?.items ?? [];
  const temFiltro = Boolean(filtros.busca) || filtros.ativo !== undefined;
  const filtrar = (novo: ModeloDispositivoFiltros) => { setPagina(1); setFiltros((atual) => ({ ...atual, ...novo })); };
  const alterarAtivo = (modelo: ModeloDispositivo, ativo: boolean) => definirAtivo.mutate({ id: modelo.id, ativo }, {
    onSuccess: () => { setParaInativar(null); toast.success(t(ativo ? "deviceModelActivated" : "deviceModelDeactivated", { name: modelo.nome })); },
    onError: () => toast.error(t("deviceModelSaveError")),
  });

  const acoesDoModelo = (modelo: ModeloDispositivo): RowAction[] => [
    { label: t("edit"), icon: <Pencil {...rowActionIconProps} />, onPress: () => setEmEdicao(modelo) },
    modelo.ativo
      ? { label: t("inactivate"), icon: <PowerOff {...rowActionIconProps} />, destructive: true, onPress: () => setParaInativar(modelo) }
      : { label: t("activate"), icon: <Power {...rowActionIconProps} />, disabled: definirAtivo.isPending, onPress: () => alterarAtivo(modelo, true) },
  ];
  const rotuloStatus = (modelo: ModeloDispositivo) => modelo.ativo ? t("active") : t("inactive");
  const colunas: DataTableColumn<ModeloDispositivo>[] = [
    { id: "nome", isRowHeader: true, header: <DataTableFilter label={t("deviceModelName")} value={filtros.busca ?? ""} placeholder={t("searchDeviceModel")} onChange={(value) => filtrar({ busca: value || undefined })} />, cell: (modelo) => modelo.nome, exportar: { titulo: t("deviceModelName"), valor: (modelo) => modelo.nome } },
    { id: "descricao", header: t("description"), cell: (modelo) => modelo.descricao ?? "—", exportar: { titulo: t("description"), valor: (modelo) => modelo.descricao ?? "—" } },
    { id: "status", header: <DataTableFilter label={t("status")} value={filtros.ativo === undefined ? "" : String(filtros.ativo)} onChange={(value) => filtrar({ ativo: value === "" ? undefined : value === "true" })} options={comOpcaoTodos(t("all"), [{ value: "true", label: t("active") }, { value: "false", label: t("inactive") }])} />, cell: (modelo) => <TagChip tom={modelo.ativo ? TONS_ETIQUETA.ativo : TONS_ETIQUETA.neutro}>{rotuloStatus(modelo)}</TagChip>, exportar: { titulo: t("status"), valor: rotuloStatus } },
    { id: "criadoEm", header: t("createdAt"), className: "tabular-nums", cell: (modelo) => formatarData(modelo.created_at), exportar: { titulo: t("createdAt"), valor: (modelo) => formatarData(modelo.created_at) } },
    { id: "atualizadoEm", header: t("updatedAt"), className: "tabular-nums", cell: (modelo) => formatarData(modelo.updated_at), exportar: { titulo: t("updatedAt"), valor: (modelo) => formatarData(modelo.updated_at) } },
    { id: "acoes", header: t("actions"), className: "w-px whitespace-nowrap", cell: (modelo) => <RowActions identificador={modelo.nome} actions={acoesDoModelo(modelo)} /> },
  ];
  const estado = estadoDaTabela({
    isLoading: modelos.isLoading,
    isError: modelos.isError,
    isEmpty: !itens.length,
    hasFilters: temFiltro,
    onClearFilters: () => { setPagina(1); setFiltros({}); },
    loadingLabel: t("loadingDeviceModels"),
    errorLabel: t("deviceModelsLoadError"),
    clearFiltersLabel: t("clearFilters"),
    empty: { icon: <Smartphone aria-hidden="true" className="size-5" />, title: t("noDeviceModelsYet"), hint: t("noDeviceModelsHint") },
    filtered: { title: t("noResults"), hint: t("noDeviceModelsResults") },
  });

  return <PageCard>
    <header className="mb-[30px] flex shrink-0 items-center justify-between gap-4">
      <PageTitle>{t("deviceModels")}</PageTitle>
      <Button variant="primary" onPress={() => setEmEdicao(null)}><Plus aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-4" />{t("addDeviceModel")}</Button>
    </header>
    <DataTable
      aria-label={t("deviceModels")}
      columns={colunas}
      items={itens}
      state={estado}
      pagination={<DataTablePagination page={pagina} pageSize={tamanho} totalCount={modelos.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(n) => { setTamanho(n); setPagina(1); }} />}
      exportacao={{ listagem: "modelos-dispositivo", todosOsItens: () => buscarTodasAsPaginas((page, pageSize) => modelosDispositivoApi.listar(page, pageSize, filtros)) }}
      rowDependencies={[t, definirAtivo.isPending]}
    />
    <ModeloDispositivoDrawer modelo={emEdicao} onFechar={() => setEmEdicao(undefined)} onSalvo={() => { setEmEdicao(undefined); toast.success(t("deviceModelSaved")); }} />
    <AlertConfirm
      open={Boolean(paraInativar)}
      onOpenChange={(open) => { if (!open && !definirAtivo.isPending) setParaInativar(null); }}
      title={t("inactivateDeviceModelTitle")}
      description={t("inactivateDeviceModelDescription", { name: paraInativar?.nome ?? "" })}
      confirmLabel={t("inactivate")}
      variant="destructive"
      isPending={definirAtivo.isPending}
      onConfirm={() => { if (paraInativar) alterarAtivo(paraInativar, false); }}
    />
  </PageCard>;
}
