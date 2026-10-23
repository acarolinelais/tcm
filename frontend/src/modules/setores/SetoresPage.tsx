import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOutletContext } from "react-router";
import { Building2, Pencil, SearchX, UserRoundCheck, UserRoundX, UsersRound } from "lucide-react";

import type { PerfilAtual } from "@/core/auth/api";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
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
  const [gerente, setGerente] = useState("");
  const [setorParaInativar, setSetorParaInativar] = useState<Setor | null>(null);
  const setores = useQuery({ queryKey: ["setores", pagina, tamanho, filtros], queryFn: () => setoresApi.listar(pagina, tamanho, filtros.ativo, filtros.busca) });
  const perfis = useQuery({ queryKey: ["perfis"], queryFn: listarPerfis });
  const gerenteProfileId = perfis.data?.find((item) => item.codigo === "GERENTE")?.id;
  const usuarios = useQuery({ queryKey: ["usuarios", "gerentes", gerenteProfileId], queryFn: () => usuarioApi.listar(1, 100, { perfil_id: gerenteProfileId }), enabled: Boolean(gerenteProfileId) });
  const associados = useQuery({ queryKey: ["setor-gerentes", setorAtual?.id], queryFn: () => setoresApi.gerentes(setorAtual!.id), enabled: Boolean(setorAtual) });
  const nomes = useMemo(() => new Map((usuarios.data?.items ?? []).map((item) => [item.id, item.nome])), [usuarios.data]);
  const salvar = useMutation({ mutationFn: () => setoresApi.criar(nome.trim()), onSuccess: async () => { setNovo(false); setNome(""); await client.invalidateQueries({ queryKey: ["setores"] }); toast.success(t("sectorCreateSuccess")); }, onError: () => toast.error(t("sectorCreateError")) });
  const alterar = useMutation({ mutationFn: (input: { id: string; nome?: string; ativo?: boolean }) => setoresApi.atualizar(input.id, { nome: input.nome, ativo: input.ativo }), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["setores"] }); toast.success(t("sectorUpdateSuccess")); }, onError: () => toast.error(t("sectorUpdateError")) });
  const vincular = useMutation({ mutationFn: () => setoresApi.associar(setorAtual!.id, gerente), onSuccess: async () => { setGerente(""); await client.invalidateQueries({ queryKey: ["setor-gerentes", setorAtual?.id] }); toast.success(t("associateSuccess")); }, onError: () => toast.error(t("associationError")) });
  const desvincular = useMutation({ mutationFn: (id: string) => setoresApi.desassociar(setorAtual!.id, id), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["setor-gerentes", setorAtual?.id] }); toast.success(t("associationRemoveSuccess")); }, onError: () => toast.error(t("associationError")) });
  if (perfil.perfil_codigo !== "ADMIN_UNIDADE") return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;
  return <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[42px] border border-[#EEEEF1] bg-card px-7 py-8 sm:px-11 sm:py-10">
    <header className="mb-7 flex shrink-0 items-center justify-between"><h1 className="text-2xl font-medium text-[#3478F6]">{t("sectors")}</h1><Button onClick={() => setNovo(true)}>{t("newSector")}</Button></header>
    <TableLayout>
    <Table containerClassName={`min-h-0 ${setores.data?.items.length ? "flex-1 overflow-auto" : "shrink-0 overflow-visible"}`}><TableHeader><TableRow><TableHead><TableColumnFilter label={t("sector")} value={filtros.busca ?? ""} onChange={(value) => { setPagina(1); setFiltros((atual) => ({ ...atual, busca: value || undefined })); }} placeholder={t("searchSector")} /></TableHead><TableHead><TableColumnFilter label={t("status")} value={filtros.ativo === undefined ? "" : String(filtros.ativo)} onChange={(value) => { setPagina(1); setFiltros((atual) => ({ ...atual, ativo: value === "" ? undefined : value === "true" })); }} options={[{ value: "", label: t("all") }, { value: "true", label: t("active") }, { value: "false", label: t("inactive") }]} /></TableHead><TableHead>{t("managers")}</TableHead><TableHead className="text-right">{t("actions")}</TableHead></TableRow></TableHeader>{Boolean(setores.data?.items.length) && <TableBody>
      {(setores.data?.items ?? []).map((setor) => <TableRow key={setor.id}>
        <TableCell className="text-base font-medium text-foreground">{setor.nome}</TableCell>
        <TableCell><Badge variant="secondary" className={setor.ativo ? "rounded-md bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700" : "rounded-md bg-secondary px-2.5 py-1 text-xs text-muted-foreground"}>{setor.ativo ? t("active") : t("inactive")}</Badge></TableCell>
        <TableCell><Button variant="ghost" size="sm" className="gap-2 px-2 text-sm text-muted-foreground" onClick={() => { setSetorAtual(setor); setNome(setor.nome); }}><UsersRound aria-hidden="true" className="size-4" />{t("manageManagers")}</Button></TableCell>
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
          {temFiltro ? <Button variant="outline" size="sm" className="mt-5" onClick={() => { setPagina(1); setFiltros({}); }}>{t("clearFilters")}</Button> : <Button size="sm" className="mt-5" onClick={() => setNovo(true)}>{t("createFirstSector")}</Button>}
        </div>;
      })()}
    </TableEmptyState>}
    <TablePagination page={pagina} pageSize={tamanho} totalCount={setores.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(n) => { setTamanho(n); setPagina(1); }} />
    </TableLayout>
    <Dialog open={novo || Boolean(setorAtual)} onOpenChange={(open) => { if (!open) { setNovo(false); setSetorAtual(null); setNome(""); } }}><DialogContent><DialogHeader><DialogTitle>{novo ? t("newSector") : setorAtual ? `${t("sector")}: ${setorAtual.nome}` : t("managers")}</DialogTitle></DialogHeader>
      {novo ? <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); salvar.mutate(); }}><label className="block space-y-1 text-sm">{t("sectorName")}<Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={150} required /></label><Button disabled={salvar.isPending}>{t("createSector")}</Button></form> : setorAtual && <div className="space-y-4">
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); alterar.mutate({ id: setorAtual.id, nome }); }}><Input aria-label={t("sectorName")} value={nome || setorAtual.nome} onChange={(e) => setNome(e.target.value)} /><Button variant="outline">{t("saveName")}</Button></form>
        <div className="flex gap-2"><select aria-label={t("selectManager")} className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" value={gerente} onChange={(e) => setGerente(e.target.value)}><option value="">{t("selectManager")}</option>{(usuarios.data?.items ?? []).map((item) => <option key={item.id} value={item.id}>{item.nome} · {item.email}</option>)}</select><Button disabled={!gerente || vincular.isPending} onClick={() => vincular.mutate()}>{t("associate")}</Button></div>
        <div className="max-h-48 space-y-2 overflow-auto">{(associados.data ?? []).map((item) => <div key={item.usuario_id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>{nomes.get(item.usuario_id) ?? item.usuario_id} {item.ativo ? "" : `· ${t("inactive").toLowerCase()}`}</span>{item.ativo && <Button variant="ghost" size="sm" onClick={() => desvincular.mutate(item.usuario_id)}>{t("remove")}</Button>}</div>)}</div>
      </div>}
    </DialogContent></Dialog>
    <ConfirmDialog open={Boolean(setorParaInativar)} onOpenChange={(open) => { if (!open) setSetorParaInativar(null); }} title={`${t("inactivate")} ${t("sector").toLowerCase()}`} description={`${t("inactivate")} ${setorParaInativar?.nome ?? t("sector").toLowerCase()}? ${t("sectorUpdateError")}`} confirmLabel={`${t("inactivate")} ${t("sector").toLowerCase()}`} variant="destructive" isPending={alterar.isPending} onConfirm={() => { if (setorParaInativar) alterar.mutate({ id: setorParaInativar.id, ativo: false }, { onSuccess: () => setSetorParaInativar(null) }); }} />
  </section>;
}
