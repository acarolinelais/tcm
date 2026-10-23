import { useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useOutletContext } from "react-router";
import { Eye, SearchX, UserRoundCheck, UserRoundX, UsersRound } from "lucide-react";

import type { PerfilAtual } from "@/core/auth/api";
import { Button } from "@/shared/ui/button";
import { Dialog, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { SELECT_EMPTY_VALUE, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { DEFAULT_TABLE_PAGE_SIZE, Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeader, TableLayout, TablePagination, TableRow } from "@/shared/ui/table";
import { toast } from "@/shared/lib/toast";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Badge } from "@/shared/ui/badge";
import { TableColumnFilter } from "@/shared/ui/table-column-filter";
import { TableRowActions } from "@/shared/ui/table-row-actions";
import { setoresApi } from "@/modules/setores/api/setores.api";
import { timesApi, type Time } from "./api/times.api";
import { useTranslation } from "react-i18next";

export function TimesPage({ modoAdmin = false }: { modoAdmin?: boolean }) {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const navigate = useNavigate();
  const admin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  const podeVer = admin || perfil.permissoes.includes("times.consultar");
  const ehGerenteComEscopo = perfil.perfil_codigo === "GERENTE" && perfil.permissoes.includes("times.gerenciar") && perfil.setores_gerenciados.length > 0;
  const podeGerenciar = admin || ehGerenteComEscopo;
  const podeVisualizarDetalhe = podeGerenciar || (perfil.perfil_codigo === "KP" && perfil.times.length > 0);
  const client = useQueryClient();
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtros, setFiltros] = useState<{ setor_id?: string; ativo?: boolean; busca?: string }>({});
  const [criarAberto, setCriarAberto] = useState(false);
  const [timeAtual, setTimeAtual] = useState<Time | null>(null);
  const [timeParaInativar, setTimeParaInativar] = useState<Time | null>(null);
  const [nome, setNome] = useState("");
  const [setorId, setSetorId] = useState("");
  const [errosCriacao, setErrosCriacao] = useState<{ nome?: string; setor?: string }>({});
  const [usuarioId, setUsuarioId] = useState("");
  const [membroParaRemover, setMembroParaRemover] = useState<string | null>(null);
  const setores = useQuery({ queryKey: ["setores", "times"], queryFn: () => setoresApi.listar(1, 100), enabled: podeVer });
  const setoresAtivos = (setores.data?.items ?? []).filter((setor) => setor.ativo);
  const setorUnicoGerenciado = !admin && ehGerenteComEscopo && setoresAtivos.length === 1 ? setoresAtivos[0] : undefined;
  const setorSelecionadoParaCriar = setorUnicoGerenciado?.id ?? setorId;
  const times = useQuery({ queryKey: ["times", pagina, tamanho, filtros], queryFn: () => timesApi.listar(pagina, tamanho, filtros), enabled: podeVer });
  const timesVisiveis = times.data?.items ?? [];
  const membrosPorTime = useQueries({ queries: podeGerenciar ? timesVisiveis.map((time) => ({ queryKey: ["time-membros", time.id], queryFn: () => timesApi.membros(time.id) })) : [] });
  const membros = useQuery({ queryKey: ["time-membros", timeAtual?.id], queryFn: () => timesApi.membros(timeAtual!.id), enabled: Boolean(timeAtual) });
  const usuarios = useQuery({ queryKey: ["times", "usuarios-disponiveis"], queryFn: timesApi.usuariosDisponiveis, enabled: podeGerenciar });
  const criar = useMutation({ mutationFn: () => timesApi.criar({ nome: nome.trim(), setor_id: setorSelecionadoParaCriar }), onSuccess: async () => { setCriarAberto(false); setNome(""); setSetorId(""); await client.invalidateQueries({ queryKey: ["times"] }); toast.success(t("teamCreateSuccess")); }, onError: () => toast.error(t("teamCreateError")) });
  const definirAtivo = useMutation({ mutationFn: (input: { id: string; ativo: boolean }) => timesApi.definirAtivo(input.id, input.ativo), onSuccess: async (time) => { await client.invalidateQueries({ queryKey: ["times"] }); setTimeParaInativar(null); toast.success(`${t("team")} ${time.nome} ${time.ativo ? t("activate").toLowerCase() : t("inactivate").toLowerCase()}.`); }, onError: () => toast.error(t("teamStatusError")) });
  const adicionar = useMutation({ mutationFn: () => timesApi.adicionar(timeAtual!.id, usuarioId.trim()), onSuccess: async () => { setUsuarioId(""); await client.invalidateQueries({ queryKey: ["time-membros", timeAtual?.id] }); toast.success(t("memberAdded")); }, onError: () => toast.error(t("memberAddError")) });
  const remover = useMutation({ mutationFn: (id: string) => timesApi.remover(timeAtual!.id, id), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["time-membros", timeAtual?.id] }); toast.success(t("memberRemoved")); }, onError: () => toast.error(t("memberRemoveError")) });
  if (modoAdmin && !admin) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;
  if (!podeVer) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;
  const setorNome = (id: string) => setores.data?.items.find((setor) => setor.id === id)?.nome ?? id;
  const usuarioNome = (id: string) => usuarios.data?.find((usuario) => usuario.id === id)?.nome ?? id;
  function abrirCriacaoTime() {
    setNome("");
    setSetorId("");
    setCriarAberto(true);
  }
  return <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[42px] border border-[#EEEEF1] bg-card px-7 py-8 sm:px-11 sm:py-10">
    <header className="mb-7 flex shrink-0 items-center justify-between"><h1 className="text-2xl font-medium text-[#3478F6]">{t("teams")}</h1>{podeGerenciar && <Button onClick={abrirCriacaoTime}>{t("newTeam")}</Button>}</header>
    <TableLayout>
    <Table containerClassName={`min-h-0 ${times.data?.items.length ? "flex-1 overflow-auto" : "shrink-0 overflow-visible"}`}><TableHeader><TableRow>
      <TableHead><TableColumnFilter label={t("teams")} value={filtros.busca ?? ""} onChange={(value) => { setPagina(1); setFiltros((atual) => ({ ...atual, busca: value || undefined })); }} placeholder={t("searchTeam")} /></TableHead>
      <TableHead><TableColumnFilter label={t("sector")} value={filtros.setor_id ?? ""} onChange={(value) => { setPagina(1); setFiltros((atual) => ({ ...atual, setor_id: value || undefined })); }} options={[{ value: "", label: t("all") }, ...(setores.data?.items ?? []).map((setor) => ({ value: setor.id, label: setor.nome }))]} /></TableHead>
      <TableHead><TableColumnFilter label={t("status")} value={filtros.ativo === undefined ? "" : String(filtros.ativo)} onChange={(value) => { setPagina(1); setFiltros((atual) => ({ ...atual, ativo: value === "" ? undefined : value === "true" })); }} options={[{ value: "", label: t("all") }, { value: "true", label: t("active") }, { value: "false", label: t("inactive") }]} /></TableHead>{podeGerenciar && <TableHead>{t("members")}</TableHead>}{podeVisualizarDetalhe && <TableHead className="text-right">{t("actions")}</TableHead>}
    </TableRow></TableHeader>{Boolean(times.data?.items.length) && <TableBody>
      {timesVisiveis.map((time, index) => <TableRow key={time.id}>
        <TableCell className="text-base font-medium text-foreground">{time.nome}</TableCell>
        <TableCell className="text-base text-muted-foreground">{setorNome(time.setor_id)}</TableCell>
        <TableCell><Badge variant="secondary" className={time.ativo ? "rounded-md bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700" : "rounded-md bg-secondary px-2.5 py-1 text-xs text-muted-foreground"}>{time.ativo ? t("active") : t("inactive")}</Badge></TableCell>
        {podeGerenciar && <TableCell>
          {(() => {
            const integrantes = (membrosPorTime[index]?.data ?? []).filter((membro) => membro.ativo).map((membro) => usuarioNome(membro.usuario_id));
            const nomesIntegrantes = integrantes.length ? integrantes : [t("teamMembersEmpty")];
            return <span className="group relative inline-flex">
              <button type="button" aria-label={t("teamMembersCount", { count: integrantes.length })} className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <UsersRound aria-hidden="true" className="size-4" /><span>{integrantes.length}</span>
              </button>
              <span role="tooltip" className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-2 w-max max-w-64 -translate-x-1/2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                {nomesIntegrantes.map((nome, nomeIndex) => <span key={`${nome}-${nomeIndex}`} className="block truncate">{nome}</span>)}
              </span>
            </span>;
          })()}
        </TableCell>}
        {podeVisualizarDetalhe && <TableCell className="text-right"><TableRowActions label={time.nome} actions={[
          { label: t("viewTeam"), icon: Eye, onSelect: () => navigate(`${modoAdmin ? "/admin/times" : "/times"}/${time.id}`) },
          ...((admin || (ehGerenteComEscopo && perfil.setores_gerenciados.includes(time.setor_id))) && time.ativo ? [{ label: t("manageMembers"), icon: UsersRound, onSelect: () => setTimeAtual(time) }] : []),
          ...(admin ? [{ label: time.ativo ? t("inactivate") : t("activate"), icon: time.ativo ? UserRoundX : UserRoundCheck, destructive: time.ativo, onSelect: () => time.ativo ? setTimeParaInativar(time) : definirAtivo.mutate({ id: time.id, ativo: true }) }] : []),
        ]} /></TableCell>}
      </TableRow>)}
    </TableBody>}</Table>{!times.data?.items.length && <TableEmptyState>
      {times.isLoading ? <p role="status">{t("loadingTeams")}</p> : <div role="status" className="w-full max-w-md px-4 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          {Object.values(filtros).some((value) => value !== undefined && value !== "") ? <SearchX aria-hidden="true" className="h-5 w-5" /> : <UsersRound aria-hidden="true" className="h-5 w-5" />}
        </div>
        <h2 className="text-base font-semibold text-foreground">{Object.values(filtros).some((value) => value !== undefined && value !== "") ? t("noResults") : t("noTeam")}</h2>
        <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-muted-foreground">
          {Object.values(filtros).some((value) => value !== undefined && value !== "") ? t("noTeamResults") : t("noTeamHint")}
        </p>
        {Object.values(filtros).some((value) => value !== undefined && value !== "") ? <Button variant="outline" size="sm" className="mt-5" onClick={() => { setPagina(1); setFiltros({}); }}>{t("clearFilters")}</Button> : podeGerenciar && <Button size="sm" className="mt-5" onClick={() => setCriarAberto(true)}>{t("createFirstTeam")}</Button>}
      </div>}
    </TableEmptyState>}
    <TablePagination page={pagina} pageSize={tamanho} totalCount={times.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(n) => { setTamanho(n); setPagina(1); }} />
    </TableLayout>
    <Dialog open={criarAberto} onOpenChange={(open) => { setCriarAberto(open); if (!open) { setNome(""); setSetorId(""); setErrosCriacao({}); } }}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t("newTeam")}</DrawerTitle>
          <p className="mt-1.5 text-sm leading-5 text-muted-foreground">{t("newTeamDescription")}</p>
        </DrawerHeader>
        <form noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); const errors: typeof errosCriacao = {}; if (!nome.trim()) errors.nome = t("requiredField"); if (!setorSelecionadoParaCriar) errors.setor = t("requiredField"); setErrosCriacao(errors); if (Object.keys(errors).length) return; criar.mutate(); }}>
          <div className="flex-1 space-y-6 px-7 py-6">
            <div className="flex flex-col">
              <Label htmlFor="team-name">{t("teamName")}</Label>
              <Input id="team-name" className="mt-2.5" aria-invalid={Boolean(errosCriacao.nome)} aria-describedby={errosCriacao.nome ? "team-name-hint team-name-error" : "team-name-hint"} value={nome} onChange={(e) => { setNome(e.target.value); setErrosCriacao((errors) => ({ ...errors, nome: undefined })); }} required maxLength={120} />
              <p id="team-name-hint" className="mt-1.5 text-xs leading-5 text-muted-foreground">{t("teamNameHint")}</p>
              {errosCriacao.nome && <p id="team-name-error" role="alert" className="mt-1.5 text-sm text-destructive">{errosCriacao.nome}</p>}
            </div>
            <div className="flex flex-col">
              <Label htmlFor="team-sector">{t("sector")}</Label>
              {!admin && ehGerenteComEscopo && setores.isLoading ? <Input id="team-sector" className="mt-2.5" value={t("loadingSectors")} readOnly disabled aria-describedby="team-sector-hint" /> : setorUnicoGerenciado ? <Input id="team-sector" className="mt-2.5" value={setorUnicoGerenciado.nome} readOnly aria-describedby="team-sector-hint" /> : <Select value={setorId} onValueChange={(value) => { setSetorId(value === SELECT_EMPTY_VALUE ? "" : value); setErrosCriacao((errors) => ({ ...errors, setor: undefined })); }}>
                <SelectTrigger id="team-sector" aria-invalid={Boolean(errosCriacao.setor)} aria-describedby={errosCriacao.setor ? "team-sector-hint team-sector-error" : "team-sector-hint"} className="mt-2.5 h-11 rounded-xl px-3.5">
                  <SelectValue placeholder={t("selectSector")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_EMPTY_VALUE}>{t("selectSector")}</SelectItem>
                  {setoresAtivos.map((setor) => <SelectItem key={setor.id} value={setor.id}>{setor.nome}</SelectItem>)}
                </SelectContent>
              </Select>}
              <p id="team-sector-hint" className="mt-1.5 text-xs leading-5 text-muted-foreground">{t("teamSectorHint")}</p>
              {errosCriacao.setor && <p id="team-sector-error" role="alert" className="mt-1.5 text-sm text-destructive">{errosCriacao.setor}</p>}
            </div>
          </div>
          <div className="flex justify-end border-t border-border px-7 py-5"><div className="flex gap-2"><DrawerClose asChild><Button type="button" variant="outline">{t("cancel")}</Button></DrawerClose><Button disabled={criar.isPending || setores.isLoading}>{t("createTeam")}</Button></div></div>
        </form>
      </DrawerContent>
    </Dialog>
    <Dialog open={Boolean(timeAtual)} onOpenChange={(open) => { if (!open) setTimeAtual(null); }}>
      <DrawerContent>
        <DrawerHeader className="border-b border-border pb-5">
          <DrawerTitle>{timeAtual ? t("memberTitle", { name: timeAtual.nome }) : t("members")}</DrawerTitle>
          <p className="mt-1.5 text-sm leading-5 text-muted-foreground">{t("manageTeamMembersDescription")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("teamMembersCount", { count: (membros.data ?? []).filter((membro) => membro.ativo).length })}</p>
        </DrawerHeader>
        <div className="flex-1 space-y-7 overflow-y-auto px-7 py-6">
          <form className="space-y-4 rounded-2xl border border-border bg-[#FBFBFC] p-4" onSubmit={(event) => { event.preventDefault(); adicionar.mutate(); }}>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t("addMemberToTeam")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("addMemberHint")}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="flex min-w-0 flex-col">
                <Label htmlFor="team-member-user" className="text-xs text-muted-foreground">{t("selectUser")}</Label>
                <Select value={usuarioId} onValueChange={(value) => setUsuarioId(value === SELECT_EMPTY_VALUE ? "" : value)}>
                  <SelectTrigger id="team-member-user" aria-describedby="team-member-user-hint" className="mt-2.5 rounded-lg bg-white">
                    <SelectValue placeholder={t("selectUser")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_EMPTY_VALUE}>{t("selectUser")}</SelectItem>
                    {(usuarios.data ?? []).filter((usuario) => usuario.ativo && !(membros.data ?? []).some((membro) => membro.usuario_id === usuario.id && membro.ativo)).map((usuario) => <SelectItem key={usuario.id} value={usuario.id}>{usuario.nome} · {usuario.email}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p id="team-member-user-hint" className="mt-1.5 text-xs leading-5 text-muted-foreground">{t("selectUserHint")}</p>
              </div>
              <Button disabled={!usuarioId || adicionar.isPending} className="h-10">{adicionar.isPending ? t("pleaseWait") : t("add")}</Button>
            </div>
          </form>

          <section className="space-y-3" aria-label={t("members")}>
            <h3 className="text-sm font-semibold text-foreground">{t("members")}</h3>
            {membros.isLoading ? <p role="status" className="py-5 text-center text-sm text-muted-foreground">{t("loading")}</p> : (membros.data ?? []).filter((membro) => membro.ativo).length === 0 ? <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{t("noTeamMembers")}</p> : <div className="space-y-2">
              {(membros.data ?? []).filter((membro) => membro.ativo).map((membro) => {
                const nome = membro.usuario_nome ?? usuarioNome(membro.usuario_id);
                const perfilNome = membro.usuario_perfil_codigo
                  ? t(`catalog.profile.${membro.usuario_perfil_codigo}`, { defaultValue: membro.usuario_perfil ?? "—" })
                  : membro.usuario_perfil ?? "—";
                return <div key={membro.id} className="flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-3">
                  <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EAF0FF] text-sm font-semibold text-primary">{nome.slice(0, 1).toLocaleUpperCase()}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground" title={nome}>{nome}</p><p className="mt-0.5 text-xs text-muted-foreground">{perfilNome}</p></div>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setMembroParaRemover(membro.usuario_id)}>{t("remove")}</Button>
                </div>;
              })}
            </div>}
          </section>
        </div>
      </DrawerContent>
    </Dialog>
    <ConfirmDialog
      open={Boolean(membroParaRemover)}
      onOpenChange={(open) => { if (!open && !remover.isPending) setMembroParaRemover(null); }}
      title={t("removeTeamMemberTitle")}
      description={t("removeTeamMemberDescription", { name: membroParaRemover ? usuarioNome(membroParaRemover) : "", team: timeAtual?.nome ?? "" })}
      confirmLabel={t("remove")}
      variant="destructive"
      isPending={remover.isPending}
      onConfirm={() => { if (membroParaRemover) remover.mutate(membroParaRemover, { onSuccess: () => setMembroParaRemover(null) }); }}
    />
    <ConfirmDialog open={Boolean(timeParaInativar)} onOpenChange={(open) => { if (!open) setTimeParaInativar(null); }} title={`${t("inactivate")} ${t("team").toLowerCase()}`} description={`${t("inactivate")} ${timeParaInativar?.nome ?? t("team").toLowerCase()}? ${t("teamDeactivateHint")}`} confirmLabel={`${t("inactivate")} ${t("team").toLowerCase()}`} variant="destructive" isPending={definirAtivo.isPending} onConfirm={() => { if (timeParaInativar) definirAtivo.mutate({ id: timeParaInativar.id, ativo: false }); }} />
  </section>;
}
