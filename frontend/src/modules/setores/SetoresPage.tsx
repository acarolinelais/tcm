import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOutletContext } from "react-router";
import { Building2, Pencil, SearchX, UserRoundCheck, UserRoundX, UsersRound } from "lucide-react";

import type { PerfilAtual } from "@/core/auth/api";
import { Button } from "@/shared/ui/button";
import { Dialog, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { SELECT_EMPTY_VALUE, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { DEFAULT_TABLE_PAGE_SIZE, Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeader, TableLayout, TablePagination, TableRow } from "@/shared/ui/table";
import { TableColumnFilter } from "@/shared/ui/table-column-filter";
import { toast } from "@/shared/lib/toast";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Badge } from "@/shared/ui/badge";
import { TableRowActions } from "@/shared/ui/table-row-actions";
import { listarPerfis } from "@/modules/perfis/api/perfis.api";
import { usuarioApi } from "@/modules/usuarios/api/usuario.api";
import { setoresApi, type Setor } from "./api/setores.api";
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
  const setoresVisiveis = setores.data?.items ?? [];
  const gerentesPorSetor = useQueries({ queries: setoresVisiveis.map((setor) => ({ queryKey: ["setor-gerentes", setor.id], queryFn: () => setoresApi.gerentes(setor.id) })) });
  const perfis = useQuery({ queryKey: ["perfis"], queryFn: listarPerfis });
  const gerenteProfileId = perfis.data?.find((item) => item.codigo === "GERENTE")?.id;
  const usuarios = useQuery({ queryKey: ["usuarios", "gerentes", gerenteProfileId], queryFn: () => usuarioApi.listar(1, 100, { perfil_id: gerenteProfileId }), enabled: Boolean(gerenteProfileId) });
  const associados = useQuery({ queryKey: ["setor-gerentes", setorAtual?.id], queryFn: () => setoresApi.gerentes(setorAtual!.id), enabled: Boolean(setorAtual) });
  const nomes = useMemo(() => new Map((usuarios.data?.items ?? []).map((item) => [item.id, item.nome])), [usuarios.data]);
  const salvar = useMutation({ mutationFn: () => setoresApi.criar(nome.trim(), gerente || undefined), onSuccess: async () => { setNovo(false); setNome(""); setGerente(""); await client.invalidateQueries({ queryKey: ["setores"] }); toast.success(t("sectorCreateSuccess")); }, onError: () => toast.error(t("sectorCreateError")) });
  const alterar = useMutation({ mutationFn: (input: { id: string; nome?: string; ativo?: boolean }) => setoresApi.atualizar(input.id, { nome: input.nome, ativo: input.ativo }), onSuccess: async (_setor, input) => { await client.invalidateQueries({ queryKey: ["setores"] }); if (input.nome) setSetorAtual((atual) => atual?.id === input.id ? { ...atual, nome: input.nome! } : atual); toast.success(t("sectorUpdateSuccess")); }, onError: () => toast.error(t("sectorUpdateError")) });
  const vincular = useMutation({ mutationFn: () => setoresApi.associar(setorAtual!.id, gerente), onSuccess: async () => { setGerente(""); await client.invalidateQueries({ queryKey: ["setor-gerentes", setorAtual?.id] }); toast.success(t("associateSuccess")); }, onError: (error) => { const detail = error instanceof ApiError ? error.problem.detail?.toLowerCase() : undefined; toast.error(detail?.includes("já associado") || detail?.includes("already associated") ? t("managerAlreadyAssociated") : t("associationError")); } });
  const desvincular = useMutation({ mutationFn: (id: string) => setoresApi.desassociar(setorAtual!.id, id), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["setor-gerentes", setorAtual?.id] }); toast.success(t("associationRemoveSuccess")); }, onError: () => toast.error(t("associationError")) });
  if (perfil.perfil_codigo !== "ADMIN_UNIDADE") return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;
  return <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[42px] border border-[#EEEEF1] bg-card px-7 py-8 sm:px-11 sm:py-10">
    <header className="mb-7 flex shrink-0 items-center justify-between"><h1 className="text-2xl font-medium text-primary">{t("sectors")}</h1><Button onClick={() => { setNome(""); setGerente(""); setErroNome(""); setNovo(true); }}>{t("newSector")}</Button></header>
    <TableLayout>
    <Table containerClassName={`min-h-0 ${setores.data?.items.length ? "flex-1 overflow-auto" : "shrink-0 overflow-visible"}`}><TableHeader><TableRow><TableHead><TableColumnFilter label={t("sector")} value={filtros.busca ?? ""} onChange={(value) => { setPagina(1); setFiltros((atual) => ({ ...atual, busca: value || undefined })); }} placeholder={t("searchSector")} /></TableHead><TableHead>{t("managers")}</TableHead><TableHead><TableColumnFilter label={t("status")} value={filtros.ativo === undefined ? "" : String(filtros.ativo)} onChange={(value) => { setPagina(1); setFiltros((atual) => ({ ...atual, ativo: value === "" ? undefined : value === "true" })); }} options={[{ value: "", label: t("all") }, { value: "true", label: t("active") }, { value: "false", label: t("inactive") }]} /></TableHead><TableHead className="text-right">{t("actions")}</TableHead></TableRow></TableHeader>{Boolean(setores.data?.items.length) && <TableBody>
      {setoresVisiveis.map((setor, index) => <TableRow key={setor.id}>
        <TableCell className="font-medium text-foreground">{setor.nome}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{(gerentesPorSetor[index]?.data ?? []).filter((vinculo) => vinculo.ativo).map((vinculo) => nomes.get(vinculo.usuario_id) ?? vinculo.usuario_id).join(", ") || "—"}</TableCell>
        <TableCell><Badge variant="secondary" className={setor.ativo ? "rounded-md bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700" : "rounded-md bg-secondary px-2.5 py-1 text-xs text-muted-foreground"}>{setor.ativo ? t("active") : t("inactive")}</Badge></TableCell>
        <TableCell className="text-right"><TableRowActions label={setor.nome} actions={[
          { label: t("editSector"), icon: Pencil, onSelect: () => { setSetorAtual(setor); setNome(setor.nome); } },
          { label: t("manageManagers"), icon: UsersRound, onSelect: () => { setSetorAtual(setor); setNome(setor.nome); } },
          { label: setor.ativo ? t("inactivate") : t("activate"), icon: setor.ativo ? UserRoundX : UserRoundCheck, destructive: setor.ativo, onSelect: () => setor.ativo ? setSetorParaInativar(setor) : alterar.mutate({ id: setor.id, ativo: true }) },
        ]} /></TableCell>
      </TableRow>)}
    </TableBody>}</Table>{!setores.data?.items.length && <TableEmptyState>
      {setores.isLoading ? <p role="status">{t("loadingSectors")}</p> : (() => {
        const temFiltro = Boolean(filtros.busca) || filtros.ativo !== undefined;
        return <div role="status" className="w-full max-w-md px-4 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            {temFiltro ? <SearchX aria-hidden="true" className="h-5 w-5" /> : <Building2 aria-hidden="true" className="h-5 w-5" />}
          </div>
          <h2 className="text-base font-semibold text-foreground">{temFiltro ? t("noResults") : t("noSector")}</h2>
          <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-muted-foreground">
            {temFiltro ? t("noSectorResults") : t("noSectorHint")}
          </p>
          {temFiltro && <Button variant="outline" size="sm" className="mt-5" onClick={() => { setPagina(1); setFiltros({}); }}>{t("clearFilters")}</Button>}
        </div>;
      })()}
    </TableEmptyState>}
    <TablePagination page={pagina} pageSize={tamanho} totalCount={setores.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(n) => { setTamanho(n); setPagina(1); }} />
    </TableLayout>
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
        </form> : setorAtual && <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); if (!nome.trim()) { setErroNome(t("requiredField")); return; } setErroNome(""); alterar.mutate({ id: setorAtual.id, nome: nome.trim() }); }}>
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
    <ConfirmDialog
      open={Boolean(gerenteParaRemover)}
      onOpenChange={(open) => { if (!open && !desvincular.isPending) setGerenteParaRemover(null); }}
      title={t("removeManagerTitle")}
      description={t("removeManagerDescription", { name: gerenteParaRemover ? nomes.get(gerenteParaRemover) ?? gerenteParaRemover : "", sector: setorAtual?.nome ?? "" })}
      confirmLabel={t("remove")}
      variant="destructive"
      isPending={desvincular.isPending}
      onConfirm={() => { if (gerenteParaRemover) desvincular.mutate(gerenteParaRemover, { onSuccess: () => setGerenteParaRemover(null) }); }}
    />
    <ConfirmDialog open={Boolean(setorParaInativar)} onOpenChange={(open) => { if (!open) setSetorParaInativar(null); }} title={`${t("inactivate")} ${t("sector").toLowerCase()}`} description={`${t("inactivate")} ${setorParaInativar?.nome ?? t("sector").toLowerCase()}? ${t("sectorUpdateError")}`} confirmLabel={`${t("inactivate")} ${t("sector").toLowerCase()}`} variant="destructive" isPending={alterar.isPending} onConfirm={() => { if (setorParaInativar) alterar.mutate({ id: setorParaInativar.id, ativo: false }, { onSuccess: () => setSetorParaInativar(null) }); }} />
  </section>;
}
