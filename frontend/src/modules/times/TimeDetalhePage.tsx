import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Link, useOutletContext, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { Button } from "@/shared/ui/button";
import { Dialog, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { SELECT_EMPTY_VALUE, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { DEFAULT_TABLE_PAGE_SIZE, Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeader, TableLayout, TablePagination, TableRow } from "@/shared/ui/table";
import { TableColumnFilter } from "@/shared/ui/table-column-filter";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { toast } from "@/shared/lib/toast";
import { setoresApi } from "@/modules/setores/api/setores.api";
import { timesApi } from "./api/times.api";

export function TimeDetalhePage({ modoAdmin = false }: { modoAdmin?: boolean }) {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const { timeId = "" } = useParams();
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtros, setFiltros] = useState<{ nome?: string; perfil?: string }>({});
  const [membroParaRemover, setMembroParaRemover] = useState<string | null>(null);
  const [editarTimeAberto, setEditarTimeAberto] = useState(false);
  const [nomeTime, setNomeTime] = useState("");
  const [adicionarMembroAberto, setAdicionarMembroAberto] = useState(false);
  const [novoMembroId, setNovoMembroId] = useState("");
  const client = useQueryClient();
  const admin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  const podeConsultar = admin || perfil.permissoes.includes("times.consultar");
  const times = useQuery({ queryKey: ["times", "detalhe", timeId], queryFn: () => timesApi.listar(1, 100), enabled: podeConsultar });
  const time = times.data?.items.find((item) => item.id === timeId);
  const escopoPermitido = Boolean(time && (admin || perfil.setores_gerenciados.includes(time.setor_id) || (perfil.perfil_codigo === "KP" && perfil.times.some((item) => item.id === time.id))));
  const podeGerenciarMembros = Boolean(time && (admin ||
    (perfil.permissoes.includes("times.gerenciar") && perfil.setores_gerenciados.includes(time.setor_id)) ||
    (perfil.perfil_codigo === "KP" && perfil.permissoes.includes("times.gerenciar") && perfil.times.some((item) => item.id === time.id))));
  const membros = useQuery({ queryKey: ["time-membros", timeId], queryFn: () => timesApi.membros(timeId), enabled: escopoPermitido });
  const usuariosDisponiveis = useQuery({ queryKey: ["times", "usuarios-disponiveis"], queryFn: timesApi.usuariosDisponiveis, enabled: podeGerenciarMembros });
  const setores = useQuery({ queryKey: ["setores", "times"], queryFn: () => setoresApi.listar(1, 100), enabled: escopoPermitido });
  const remover = useMutation({ mutationFn: (usuarioId: string) => timesApi.remover(timeId, usuarioId), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["time-membros", timeId] }); setMembroParaRemover(null); toast.success(t("memberRemoved")); }, onError: () => toast.error(t("memberRemoveError")) });
  const adicionar = useMutation({ mutationFn: () => timesApi.adicionar(timeId, novoMembroId), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["time-membros", timeId] }); setAdicionarMembroAberto(false); setNovoMembroId(""); toast.success(t("memberAdded")); }, onError: () => toast.error(t("memberAddError")) });
  const atualizarTime = useMutation({ mutationFn: () => timesApi.atualizar(timeId, { nome: nomeTime.trim() }), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["times"] }); setEditarTimeAberto(false); toast.success(t("teamUpdateSuccess")); }, onError: () => toast.error(t("teamUpdateError")) });

  if ((modoAdmin && !admin) || !podeConsultar) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;

  const caminhoVolta = modoAdmin ? "/admin/times" : "/times";
  const setorNome = time?.setor_nome ?? setores.data?.items.find((setor) => setor.id === time?.setor_id)?.nome ?? "—";
  const membrosAtivos = (membros.data ?? []).filter((membro) => membro.ativo);
  const perfilLabel = (membro: (typeof membrosAtivos)[number]) => membro.usuario_perfil_codigo
    ? t(`catalog.profile.${membro.usuario_perfil_codigo}`, { defaultValue: membro.usuario_perfil ?? "—" })
    : membro.usuario_perfil ?? "—";
  const perfisFiltro = [...new Set(membrosAtivos.map(perfilLabel))].sort((a, b) => a.localeCompare(b));
  const membrosFiltrados = membrosAtivos.filter((membro) => {
    const nome = (membro.usuario_nome ?? membro.usuario_id).toLocaleLowerCase();
    return (!filtros.nome || nome.includes(filtros.nome.toLocaleLowerCase())) && (!filtros.perfil || perfilLabel(membro) === filtros.perfil);
  });
  const membrosPaginados = membrosFiltrados.slice((pagina - 1) * tamanho, pagina * tamanho);
  const temFiltro = Boolean(filtros.nome || filtros.perfil);

  return <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[42px] border border-[#EEEEF1] bg-card px-7 py-8 sm:px-11 sm:py-10">
    <header className="mb-5 flex shrink-0 items-center gap-4">
      <Button asChild variant="outline" size="icon" aria-label={t("backToTeams")} className="size-10 rounded-xl">
        <Link to={caminhoVolta}><ArrowLeft aria-hidden="true" className="size-4" /></Link>
      </Button>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{t("teamDetails")}</p>
        <h1 className="truncate text-2xl font-medium text-[#3478F6]">{time?.nome ?? t("team")}</h1>
      </div>
      {podeGerenciarMembros && time && <div className="ml-auto flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="icon" aria-label={t("addMemberToTeam")} title={t("addMemberToTeam")} className="size-10" onClick={() => { setNovoMembroId(""); setAdicionarMembroAberto(true); }}>
          <Plus aria-hidden="true" className="size-4" />
        </Button>
        <Button variant="outline" onClick={() => { setNomeTime(time.nome); setEditarTimeAberto(true); }}>{t("editTeam")}</Button>
      </div>}
    </header>

    {times.isLoading ? <p role="status" className="py-8 text-sm text-muted-foreground">{t("loadingTeams")}</p> : !time || !escopoPermitido ? <p role="alert" className="py-8 text-sm text-muted-foreground">{t("teamNotFound")}</p> : <>
      <div className="mb-6 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border pb-4 text-sm text-muted-foreground">
        <span>{t("sector")}: <span className="font-medium text-foreground">{setorNome}</span></span>
        <span aria-hidden="true">·</span>
        <span>{t("status")}: <span className={time.ativo ? "font-medium text-emerald-700" : "font-medium text-muted-foreground"}>{time.ativo ? t("active") : t("inactive")}</span></span>
        <span aria-hidden="true">·</span>
        <span>{t("teamMembersCount", { count: membrosAtivos.length })}</span>
      </div>

      <TableLayout>
        <Table containerClassName={`min-h-0 ${membrosPaginados.length ? "flex-1 overflow-auto" : "shrink-0 overflow-visible"}`}>
          <TableHeader><TableRow>
            <TableHead><TableColumnFilter label={t("user")} value={filtros.nome ?? ""} onChange={(value) => { setPagina(1); setFiltros((atual) => ({ ...atual, nome: value || undefined })); }} placeholder={t("usersSearchName")} /></TableHead>
            <TableHead><TableColumnFilter label={t("profile")} value={filtros.perfil ?? ""} onChange={(value) => { setPagina(1); setFiltros((atual) => ({ ...atual, perfil: value || undefined })); }} options={[{ value: "", label: t("all") }, ...perfisFiltro.map((nome) => ({ value: nome, label: nome }))]} /></TableHead>
            {podeGerenciarMembros && <TableHead className="text-right">{t("actions")}</TableHead>}
          </TableRow></TableHeader>
          {membrosPaginados.length > 0 && <TableBody>{membrosPaginados.map((membro) => <TableRow key={membro.id}>
            <TableCell className="font-medium text-foreground">{membro.usuario_nome ?? membro.usuario_id}</TableCell>
            <TableCell className="text-muted-foreground">{perfilLabel(membro)}</TableCell>
            {podeGerenciarMembros && <TableCell className="text-right">
              <Button variant="ghost" size="icon" aria-label={`${t("removeTeamMemberTitle")} ${membro.usuario_nome ?? membro.usuario_id}`} title={t("remove")} className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setMembroParaRemover(membro.usuario_id)}>
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            </TableCell>}
          </TableRow>)}</TableBody>}
        </Table>
        {!membros.isLoading && membrosFiltrados.length === 0 && <TableEmptyState><div className="text-center"><p role="status">{temFiltro ? t("noTeamResults") : t("noTeamMembers")}</p>{temFiltro && <Button variant="outline" size="sm" className="mt-4" onClick={() => { setPagina(1); setFiltros({}); }}>{t("clearFilters")}</Button>}</div></TableEmptyState>}
        <TablePagination page={pagina} pageSize={tamanho} totalCount={membrosFiltrados.length} onPageChange={setPagina} onPageSizeChange={(valor) => { setTamanho(valor); setPagina(1); }} />
      </TableLayout>
    </>}
    <Dialog open={editarTimeAberto} onOpenChange={setEditarTimeAberto}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t("editTeam")}</DrawerTitle>
          <p className="mt-1.5 text-sm leading-5 text-muted-foreground">{t("editTeamDescription")}</p>
        </DrawerHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); atualizarTime.mutate(); }}>
          <div className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="team-name">{t("teamName")}</Label>
              <Input id="team-name" value={nomeTime} onChange={(event) => setNomeTime(event.target.value)} maxLength={150} required />
              <p className="text-xs leading-5 text-muted-foreground">{t("teamNameHint")}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-7 py-5">
            <DrawerClose asChild><Button type="button" variant="outline">{t("cancel")}</Button></DrawerClose>
            <Button type="submit" disabled={!nomeTime.trim() || atualizarTime.isPending}>{atualizarTime.isPending ? t("pleaseWait") : t("save")}</Button>
          </div>
        </form>
      </DrawerContent>
    </Dialog>
    <Dialog open={adicionarMembroAberto} onOpenChange={(open) => { setAdicionarMembroAberto(open); if (!open) setNovoMembroId(""); }}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t("addMemberToTeam")}</DrawerTitle>
          <p className="mt-1.5 text-sm leading-5 text-muted-foreground">{t("addMemberHint")}</p>
        </DrawerHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); adicionar.mutate(); }}>
          <div className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-team-member">{t("selectUser")}</Label>
              <Select value={novoMembroId} onValueChange={(value) => setNovoMembroId(value === SELECT_EMPTY_VALUE ? "" : value)}>
                <SelectTrigger id="new-team-member"><SelectValue placeholder={t("selectUser")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_EMPTY_VALUE}>{t("selectUser")}</SelectItem>
                  {(usuariosDisponiveis.data ?? []).filter((usuario) => usuario.ativo && !(membros.data ?? []).some((membro) => membro.usuario_id === usuario.id && membro.ativo)).map((usuario) => <SelectItem key={usuario.id} value={usuario.id}>{usuario.nome} · {usuario.email}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs leading-5 text-muted-foreground">{t("selectUserHint")}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-7 py-5">
            <DrawerClose asChild><Button type="button" variant="outline">{t("cancel")}</Button></DrawerClose>
            <Button type="submit" disabled={!novoMembroId || adicionar.isPending}>{adicionar.isPending ? t("pleaseWait") : t("add")}</Button>
          </div>
        </form>
      </DrawerContent>
    </Dialog>
    <ConfirmDialog open={Boolean(membroParaRemover)} onOpenChange={(open) => { if (!open && !remover.isPending) setMembroParaRemover(null); }} title={t("removeTeamMemberTitle")} description={t("removeTeamMemberDescription", { name: membroParaRemover ? membrosAtivos.find((membro) => membro.usuario_id === membroParaRemover)?.usuario_nome ?? membroParaRemover : "", team: time?.nome ?? "" })} confirmLabel={t("remove")} variant="destructive" isPending={remover.isPending} onConfirm={() => { if (membroParaRemover) remover.mutate(membroParaRemover); }} />
  </section>;
}
