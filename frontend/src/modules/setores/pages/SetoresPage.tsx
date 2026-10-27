import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOutletContext } from "react-router";
import { Button as HeroButton } from "@heroui/react";
import { Building2, Pencil, Plus, UserRoundCheck, UserRoundX, UsersRound } from "lucide-react";

import type { PerfilAtual } from "@/core/auth/api";
import { Button } from "@/shared/ui/button";
import { Dialog, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { SELECT_EMPTY_VALUE, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
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
import { useTranslation } from "react-i18next";
import { ApiError } from "@/shared/api/problem-details";

export function SetoresPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const client = useQueryClient();
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtros, setFiltros] = useState<{ busca?: string; ativo?: boolean }>({});
  const [setorAtual, setSetorAtual] = useState<Setor | null>(null);
  const [novo, setNovo] = useState(false);
  const [nome, setNome] = useState("");
  const [erroNome, setErroNome] = useState("");
  const [gerente, setGerente] = useState("");
  const [gerenteParaRemover, setGerenteParaRemover] = useState<string | null>(null);
  const [setorParaInativar, setSetorParaInativar] = useState<Setor | null>(null);
  const setores = useQuery({ queryKey: ["setores", pagina, tamanho, filtros], queryFn: () => setoresApi.listar(pagina, tamanho, filtros.ativo, filtros.busca) });
  const setoresVisiveis = setores.isError ? [] : setores.data?.items ?? [];
  const gerentesPorSetor = useQueries({ queries: setoresVisiveis.map((setor) => ({ queryKey: ["setor-gerentes", setor.id], queryFn: () => setoresApi.gerentes(setor.id) })) });
  const perfis = useQuery({ queryKey: ["perfis"], queryFn: listarPerfis });
  const gerenteProfileId = perfis.data?.find((item) => item.codigo === "GERENTE")?.id;
  const usuarios = useQuery({ queryKey: ["usuarios", "gerentes", gerenteProfileId], queryFn: () => usuarioApi.listar(1, 100, { perfil_id: gerenteProfileId }), enabled: Boolean(gerenteProfileId) });
  const associados = useQuery({ queryKey: ["setor-gerentes", setorAtual?.id], queryFn: () => setoresApi.gerentes(setorAtual!.id), enabled: Boolean(setorAtual) });
  const nomes = useMemo(() => new Map((usuarios.data?.items ?? []).map((item) => [item.id, item.nome])), [usuarios.data]);
  const salvar = useMutation({ mutationFn: () => setoresApi.criar(nome.trim(), gerente || undefined), onSuccess: async () => { setNovo(false); setNome(""); setGerente(""); await client.invalidateQueries({ queryKey: ["setores"] }); toast.success(t("sectorCreateSuccess")); }, onError: () => toast.error(t("sectorCreateError")) });
  const alterar = useMutation({ mutationFn: (input: { id: string; nome?: string; ativo?: boolean }) => setoresApi.atualizar(input.id, { nome: input.nome, ativo: input.ativo }), onSuccess: async (setor, input) => { await client.invalidateQueries({ queryKey: ["setores"] }); if (input.nome) setSetorAtual((atual) => atual?.id === input.id ? { ...atual, nome: input.nome! } : atual); toast.success(input.ativo === false ? t("sectorDeactivated", { name: setor.nome }) : t("sectorUpdateSuccess")); }, onError: () => toast.error(t("sectorUpdateError")) });
  const vincular = useMutation({ mutationFn: () => setoresApi.associar(setorAtual!.id, gerente), onSuccess: async () => { setGerente(""); await client.invalidateQueries({ queryKey: ["setor-gerentes", setorAtual?.id] }); toast.success(t("associateSuccess")); }, onError: (error) => { const detail = error instanceof ApiError ? error.problem.detail?.toLowerCase() : undefined; toast.error(detail?.includes("já associado") || detail?.includes("already associated") ? t("managerAlreadyAssociated") : t("associationError")); } });
  const desvincular = useMutation({ mutationFn: (id: string) => setoresApi.desassociar(setorAtual!.id, id), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["setor-gerentes", setorAtual?.id] }); toast.success(t("associationRemoveSuccess")); }, onError: () => toast.error(t("associationError")) });
  if (perfil.perfil_codigo !== "ADMIN_UNIDADE") return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;
  const temFiltro = Boolean(filtros.busca) || filtros.ativo !== undefined;
  const alterarFiltro = (novos: Partial<typeof filtros>) => { setPagina(1); setFiltros((atual) => ({ ...atual, ...novos })); };
  const gerentesDoSetor = (setor: Setor) => (gerentesPorSetor[setoresVisiveis.indexOf(setor)]?.data ?? [])
    .filter((vinculo) => vinculo.ativo).map((vinculo) => nomes.get(vinculo.usuario_id) ?? vinculo.usuario_id).join(", ") || "—";
  const abrirSetor = (setor: Setor) => { setSetorAtual(setor); setNome(setor.nome); };
  const acoesDoSetor = (setor: Setor): RowAction[] => [
    { label: t("editSector"), icon: <Pencil {...rowActionIconProps} />, onPress: () => abrirSetor(setor) },
    { label: t("manageManagers"), icon: <UsersRound {...rowActionIconProps} />, onPress: () => abrirSetor(setor) },
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
      <HeroButton variant="primary" onPress={() => { setNome(""); setGerente(""); setErroNome(""); setNovo(true); }}><Plus aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-4" />{t("newSector")}</HeroButton>
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
    <Dialog open={novo || Boolean(setorAtual)} onOpenChange={(open) => { if (!open) { setNovo(false); setSetorAtual(null); setNome(""); setErroNome(""); } }}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{novo ? t("newSector") : setorAtual ? `${t("sector")}: ${setorAtual.nome}` : t("managers")}</DrawerTitle>
        </DrawerHeader>
        {novo ? <form noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); if (!nome.trim()) { setErroNome(t("requiredField")); return; } setErroNome(""); salvar.mutate(); }}>
          <div className="flex-1 space-y-6 overflow-y-auto px-7 py-6">
            <div className="flex flex-col">
              <Label htmlFor="sector-name">{t("sectorName")}</Label>
              <Input id="sector-name" className="mt-2.5" aria-invalid={Boolean(erroNome)} aria-describedby={erroNome ? "sector-name-error" : undefined} value={nome} onChange={(e) => { setNome(e.target.value); setErroNome(""); }} maxLength={150} required />
              {erroNome && <p id="sector-name-error" role="alert" className="mt-1.5 text-sm text-destructive">{erroNome}</p>}
            </div>
            <div className="flex flex-col">
              <Label htmlFor="new-sector-manager">{t("selectManager")}</Label>
              <Select value={gerente} onValueChange={(value) => setGerente(value === SELECT_EMPTY_VALUE ? "" : value)}>
                <SelectTrigger id="new-sector-manager" aria-describedby="new-sector-manager-hint" className="mt-2.5 h-11 rounded-xl px-3.5">
                  <SelectValue placeholder={t("selectManager")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_EMPTY_VALUE}>{t("noOwner")}</SelectItem>
                  {(usuarios.data?.items ?? []).filter((usuario) => usuario.ativo).map((usuario) => <SelectItem key={usuario.id} value={usuario.id}>{usuario.nome} · {usuario.email}</SelectItem>)}
                </SelectContent>
              </Select>
              <p id="new-sector-manager-hint" className="mt-1.5 text-xs leading-5 text-muted-foreground">{t("managerSelectHint")}</p>
            </div>
          </div>
          <div className="flex justify-end border-t border-border px-7 py-5"><div className="flex gap-2"><DrawerClose asChild><Button type="button" variant="outline">{t("cancel")}</Button></DrawerClose><Button disabled={salvar.isPending}>{t("createSector")}</Button></div></div>
        </form> : setorAtual && <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); if (!nome.trim()) { setErroNome(t("requiredField")); return; } setErroNome(""); alterar.mutate({ id: setorAtual.id, nome: nome.trim() }, { onSuccess: () => { setSetorAtual(null); setNome(""); setGerente(""); } }); }}>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-7 py-6">
          <div className="flex flex-col">
            <Label htmlFor="sector-edit-name">{t("sectorName")}</Label>
            <Input id="sector-edit-name" className="mt-2.5" aria-invalid={Boolean(erroNome)} aria-describedby={erroNome ? "sector-edit-error" : undefined} value={nome} onChange={(e) => { setNome(e.target.value); setErroNome(""); }} maxLength={150} required />
            {erroNome && <p id="sector-edit-error" role="alert" className="mt-1.5 text-sm text-destructive">{erroNome}</p>}
          </div>
          <div className="flex flex-col">
            <Label htmlFor="sector-manager">{t("selectManager")}</Label>
            <div className="mt-2.5 flex gap-2">
              <Select value={gerente} onValueChange={(value) => setGerente(value === SELECT_EMPTY_VALUE ? "" : value)}>
                <SelectTrigger id="sector-manager" aria-describedby="sector-manager-hint" className="min-w-0 flex-1">
                  <SelectValue placeholder={t("selectManager")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_EMPTY_VALUE}>{t("selectManager")}</SelectItem>
                  {(usuarios.data?.items ?? []).filter((usuario) => !(associados.data ?? []).some((vinculo) => vinculo.usuario_id === usuario.id && vinculo.ativo)).map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.nome} · {item.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" disabled={!gerente || vincular.isPending} onClick={() => vincular.mutate()}>{t("associate")}</Button>
            </div>
            <p id="sector-manager-hint" className="mt-1.5 text-xs leading-5 text-muted-foreground">{t("managerSelectHint")}</p>
          </div>
          <div className="space-y-2">{(associados.data ?? []).map((item) => <div key={item.usuario_id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm"><span>{nomes.get(item.usuario_id) ?? item.usuario_id} {item.ativo ? "" : `· ${t("inactive").toLowerCase()}`}</span>{item.ativo && <Button type="button" variant="ghost" size="sm" onClick={() => setGerenteParaRemover(item.usuario_id)}>{t("remove")}</Button>}</div>)}</div>
          </div>
          <div className="flex shrink-0 justify-end border-t border-border bg-white px-7 py-5">
            <div className="flex gap-2">
              <DrawerClose asChild><Button type="button" variant="outline">{t("cancel")}</Button></DrawerClose>
              <Button type="submit" disabled={alterar.isPending}>{alterar.isPending ? t("saving") : t("save")}</Button>
            </div>
          </div>
        </form>}
      </DrawerContent>
    </Dialog>
    <AlertConfirm
      open={Boolean(gerenteParaRemover)}
      onOpenChange={(open) => { if (!open && !desvincular.isPending) setGerenteParaRemover(null); }}
      title={t("removeManagerTitle")}
      description={t("removeManagerDescription", { name: gerenteParaRemover ? nomes.get(gerenteParaRemover) ?? gerenteParaRemover : "", sector: setorAtual?.nome ?? "" })}
      confirmLabel={t("remove")}
      variant="destructive"
      isPending={desvincular.isPending}
      onConfirm={() => { if (gerenteParaRemover) desvincular.mutate(gerenteParaRemover, { onSuccess: () => setGerenteParaRemover(null) }); }}
    />
    <AlertConfirm open={Boolean(setorParaInativar)} onOpenChange={(open) => { if (!open) setSetorParaInativar(null); }} title={`${t("inactivate")} ${t("sector").toLowerCase()}`} description={`${t("inactivate")} ${setorParaInativar?.nome ?? t("sector").toLowerCase()}? ${t("sectorUpdateError")}`} confirmLabel={`${t("inactivate")} ${t("sector").toLowerCase()}`} variant="destructive" isPending={alterar.isPending} onConfirm={() => { if (setorParaInativar) alterar.mutate({ id: setorParaInativar.id, ativo: false }, { onSuccess: () => setSetorParaInativar(null) }); }} />
  </PageCard>;
}
