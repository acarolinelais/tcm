import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOutletContext } from "react-router";
import { Button as HeroButton } from "@heroui/react";
import { Building2, Pencil, Plus, UserRoundCheck, UserRoundX, UsersRound } from "lucide-react";

import type { PerfilAtual } from "@/core/auth/api";
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
import { listarPerfis } from "@/modules/perfis/api/perfis.api";
import { usuarioApi } from "@/modules/usuarios/api/usuario.api";
import { setoresApi, type Setor } from "../api/setores.api";
import { EditarSetorDrawer } from "../components/EditarSetorDrawer";
import { NovoSetorDrawer } from "../components/NovoSetorDrawer";
import { useTranslation } from "react-i18next";

export function SetoresPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const client = useQueryClient();
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtros, setFiltros] = useState<{ busca?: string; ativo?: boolean }>({});
  const [setorAtual, setSetorAtual] = useState<Setor | null>(null);
  const [novo, setNovo] = useState(false);
  const [setorParaInativar, setSetorParaInativar] = useState<Setor | null>(null);
  const setores = useQuery({ queryKey: ["setores", pagina, tamanho, filtros], queryFn: () => setoresApi.listar(pagina, tamanho, filtros.ativo, filtros.busca) });
  const setoresVisiveis = setores.isError ? [] : setores.data?.items ?? [];
  const gerentesPorSetor = useQueries({ queries: setoresVisiveis.map((setor) => ({ queryKey: ["setor-gerentes", setor.id], queryFn: () => setoresApi.gerentes(setor.id) })) });
  const perfis = useQuery({ queryKey: ["perfis"], queryFn: listarPerfis });
  const gerenteProfileId = perfis.data?.find((item) => item.codigo === "GERENTE")?.id;
  const usuarios = useQuery({ queryKey: ["usuarios", "gerentes", gerenteProfileId], queryFn: () => usuarioApi.listar(1, 100, { perfil_id: gerenteProfileId }), enabled: Boolean(gerenteProfileId) });
  const nomes = useMemo(() => new Map((usuarios.data?.items ?? []).map((item) => [item.id, item.nome])), [usuarios.data]);
  const alterar = useMutation({ mutationFn: (input: { id: string; ativo: boolean }) => setoresApi.atualizar(input.id, { ativo: input.ativo }), onSuccess: async (setor, input) => { await client.invalidateQueries({ queryKey: ["setores"] }); toast.success(input.ativo === false ? t("sectorDeactivated", { name: setor.nome }) : t("sectorUpdateSuccess")); }, onError: () => toast.error(t("sectorUpdateError")) });
  if (perfil.perfil_codigo !== "ADMIN_UNIDADE") return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;
  const temFiltro = Boolean(filtros.busca) || filtros.ativo !== undefined;
  const alterarFiltro = (novos: Partial<typeof filtros>) => { setPagina(1); setFiltros((atual) => ({ ...atual, ...novos })); };
  const gerentesDoSetor = (setor: Setor) => (gerentesPorSetor[setoresVisiveis.indexOf(setor)]?.data ?? [])
    .filter((vinculo) => vinculo.ativo).map((vinculo) => nomes.get(vinculo.usuario_id) ?? vinculo.usuario_id).join(", ") || "—";
  const acoesDoSetor = (setor: Setor): RowAction[] => [
    { label: t("editSector"), icon: <Pencil {...rowActionIconProps} />, onPress: () => setSetorAtual(setor) },
    { label: t("manageManagers"), icon: <UsersRound {...rowActionIconProps} />, onPress: () => setSetorAtual(setor) },
    {
      label: setor.ativo ? t("inactivate") : t("activate"),
      icon: setor.ativo ? <UserRoundX {...rowActionIconProps} /> : <UserRoundCheck {...rowActionIconProps} />,
      destructive: setor.ativo,
      onPress: () => setor.ativo ? setSetorParaInativar(setor) : alterar.mutate({ id: setor.id, ativo: true }),
    },
  ];
  const colunas: DataTableColumn<Setor>[] = [
    { id: "nome", isRowHeader: true, header: <DataTableFilter label={t("sector")} value={filtros.busca ?? ""} onChange={(value) => alterarFiltro({ busca: value || undefined })} placeholder={t("searchSector")} />, cell: (setor) => setor.nome },
    { id: "gerentes", header: t("managers"), cell: gerentesDoSetor },
    { id: "status", header: <DataTableFilter label={t("status")} value={filtros.ativo === undefined ? "" : String(filtros.ativo)} onChange={(value) => alterarFiltro({ ativo: value === "" ? undefined : value === "true" })} options={comOpcaoTodos(t("all"), [{ value: "true", label: t("active") }, { value: "false", label: t("inactive") }])} />, cell: (setor) => <TagChip tom={setor.ativo ? TONS_ETIQUETA.ativo : TONS_ETIQUETA.neutro}>{setor.ativo ? t("active") : t("inactive")}</TagChip> },
    { id: "acoes", header: t("actions"), className: "w-px whitespace-nowrap", cell: (setor) => <RowActions identificador={setor.nome} actions={acoesDoSetor(setor)} /> },
  ];
  const estado = estadoDaTabela({
    isLoading: setores.isLoading,
    isError: setores.isError,
    isEmpty: !setoresVisiveis.length,
    hasFilters: temFiltro,
    onClearFilters: () => { setPagina(1); setFiltros({}); },
    loadingLabel: t("loadingSectors"),
    errorLabel: t("sectorsLoadError"),
    clearFiltersLabel: t("clearFilters"),
    empty: { icon: <Building2 aria-hidden="true" className="size-5" />, title: t("noSector"), hint: t("noSectorHint") },
    filtered: { title: t("noResults"), hint: t("noSectorResults") },
  });

  return <PageCard>
    <header className="mb-[30px] flex shrink-0 items-center justify-between gap-4">
      <PageTitle>{t("sectors")}</PageTitle>
      <HeroButton variant="primary" onPress={() => setNovo(true)}><Plus aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-4" />{t("newSector")}</HeroButton>
    </header>
    <DataTable
      aria-label={t("sectors")}
      columns={colunas}
      items={setoresVisiveis}
      state={estado}
      pagination={<DataTablePagination page={pagina} pageSize={tamanho} totalCount={setores.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(n) => { setTamanho(n); setPagina(1); }} />}
      // Os gerentes chegam por consultas separadas, depois das linhas.
      rowDependencies={[t, nomes, gerentesPorSetor.map((consulta) => consulta.dataUpdatedAt).join()]}
    />
    <NovoSetorDrawer isOpen={novo} onOpenChange={setNovo} gerentes={usuarios.data?.items ?? []} />
    <EditarSetorDrawer setor={setorAtual} onFechar={() => setSetorAtual(null)} gerentes={usuarios.data?.items ?? []} nomes={nomes} />
    <AlertConfirm open={Boolean(setorParaInativar)} onOpenChange={(open) => { if (!open) setSetorParaInativar(null); }} title={`${t("inactivate")} ${t("sector").toLowerCase()}`} description={`${t("inactivate")} ${setorParaInativar?.nome ?? t("sector").toLowerCase()}? ${t("sectorUpdateError")}`} confirmLabel={`${t("inactivate")} ${t("sector").toLowerCase()}`} variant="destructive" isPending={alterar.isPending} onConfirm={() => { if (setorParaInativar) alterar.mutate({ id: setorParaInativar.id, ativo: false }, { onSuccess: () => setSetorParaInativar(null) }); }} />
  </PageCard>;
}
