import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOutletContext } from "react-router";
import { SearchX, UserRoundCheck, UserRoundX, UsersRound } from "lucide-react";

import type { PerfilAtual } from "@/core/auth/api";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { DEFAULT_TABLE_PAGE_SIZE, Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeader, TableLayout, TablePagination, TableRow } from "@/shared/ui/table";
import { toast } from "@/shared/lib/toast";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Badge } from "@/shared/ui/badge";
import { TableColumnFilter } from "@/shared/ui/table-column-filter";
import { TableRowActions } from "@/shared/ui/table-row-actions";
import { setoresApi } from "@/modules/setores/api/setores.api";
import { timesApi, type Time } from "./api/times.api";

export function TimesPage({ modoAdmin = false }: { modoAdmin?: boolean }) {
  const perfil = useOutletContext<PerfilAtual>();
  const admin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  const podeVer = admin || perfil.permissoes.includes("times.consultar");
  const ehGerenteComEscopo = perfil.perfil_codigo === "GERENTE" && perfil.permissoes.includes("times.gerenciar") && perfil.setores_gerenciados.length > 0;
  const podeGerenciar = admin || ehGerenteComEscopo;
  const client = useQueryClient();
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtros, setFiltros] = useState<{ setor_id?: string; ativo?: boolean; busca?: string }>({});
  const [criarAberto, setCriarAberto] = useState(false);
  const [timeAtual, setTimeAtual] = useState<Time | null>(null);
  const [timeParaInativar, setTimeParaInativar] = useState<Time | null>(null);
  const [nome, setNome] = useState("");
  const [setorId, setSetorId] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [papel, setPapel] = useState<"dev" | "kp">("dev");
  const setores = useQuery({ queryKey: ["setores", "times"], queryFn: () => setoresApi.listar(1, 100), enabled: podeVer });
  const setoresAtivos = (setores.data?.items ?? []).filter((setor) => setor.ativo);
  const setorUnicoGerenciado = !admin && ehGerenteComEscopo && setoresAtivos.length === 1 ? setoresAtivos[0] : undefined;
  const setorSelecionadoParaCriar = setorUnicoGerenciado?.id ?? setorId;
  const times = useQuery({ queryKey: ["times", pagina, tamanho, filtros], queryFn: () => timesApi.listar(pagina, tamanho, filtros), enabled: podeVer });
  const membros = useQuery({ queryKey: ["time-membros", timeAtual?.id], queryFn: () => timesApi.membros(timeAtual!.id), enabled: Boolean(timeAtual) });
  const usuarios = useQuery({ queryKey: ["times", "usuarios-disponiveis"], queryFn: timesApi.usuariosDisponiveis, enabled: podeGerenciar });
  const criar = useMutation({ mutationFn: () => timesApi.criar({ nome: nome.trim(), setor_id: setorSelecionadoParaCriar }), onSuccess: async () => { setCriarAberto(false); setNome(""); setSetorId(""); await client.invalidateQueries({ queryKey: ["times"] }); toast.success("Time criado com sucesso."); }, onError: () => toast.error("Não foi possível criar o time.") });
  const definirAtivo = useMutation({ mutationFn: (input: { id: string; ativo: boolean }) => timesApi.definirAtivo(input.id, input.ativo), onSuccess: async (time) => { await client.invalidateQueries({ queryKey: ["times"] }); setTimeParaInativar(null); toast.success(`Time ${time.nome} ${time.ativo ? "ativado" : "inativado"} com sucesso.`); }, onError: () => toast.error("Não foi possível atualizar o status do time.") });
  const adicionar = useMutation({ mutationFn: () => timesApi.adicionar(timeAtual!.id, usuarioId.trim(), papel), onSuccess: async () => { setUsuarioId(""); await client.invalidateQueries({ queryKey: ["time-membros", timeAtual?.id] }); toast.success("Membro adicionado ao time."); }, onError: () => toast.error("Não foi possível adicionar o membro.") });
  const mudarPapel = useMutation({ mutationFn: (input: { usuarioId: string; papel: "dev" | "kp" }) => timesApi.alterarPapel(timeAtual!.id, input.usuarioId, input.papel), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["time-membros", timeAtual?.id] }); toast.success("Papel atualizado."); }, onError: () => toast.error("Não foi possível atualizar o papel.") });
  const remover = useMutation({ mutationFn: (id: string) => timesApi.remover(timeAtual!.id, id), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["time-membros", timeAtual?.id] }); toast.success("Membro removido do time."); }, onError: () => toast.error("Não foi possível remover o membro.") });
  if (modoAdmin && !admin) return <p role="alert" className="p-6 text-sm">Apenas o administrador da unidade pode acessar esta página.</p>;
  if (!podeVer) return <p role="alert" className="p-6 text-sm">Você não tem permissão para consultar times.</p>;
  const setorNome = (id: string) => setores.data?.items.find((setor) => setor.id === id)?.nome ?? id;
  const usuarioNome = (id: string) => usuarios.data?.find((usuario) => usuario.id === id)?.nome ?? id;
  function abrirCriacaoTime() {
    setNome("");
    setSetorId("");
    setCriarAberto(true);
  }
  return <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[42px] border border-[#EEEEF1] bg-card px-7 py-8 sm:px-11 sm:py-10">
    <header className="mb-7 flex shrink-0 items-center justify-between"><h1 className="text-2xl font-medium text-[#3478F6]">Times</h1>{podeGerenciar && <Button onClick={abrirCriacaoTime}>Novo time</Button>}</header>
    <TableLayout>
    <Table containerClassName={`min-h-0 ${times.data?.items.length ? "flex-1 overflow-auto" : "shrink-0 overflow-visible"}`}><TableHeader><TableRow>
      <TableHead><TableColumnFilter label="Time" value={filtros.busca ?? ""} onChange={(value) => { setPagina(1); setFiltros((atual) => ({ ...atual, busca: value || undefined })); }} placeholder="Buscar por time" /></TableHead>
      <TableHead><TableColumnFilter label="Setor" value={filtros.setor_id ?? ""} onChange={(value) => { setPagina(1); setFiltros((atual) => ({ ...atual, setor_id: value || undefined })); }} options={[{ value: "", label: "Todos" }, ...(setores.data?.items ?? []).map((setor) => ({ value: setor.id, label: setor.nome }))]} /></TableHead>
      <TableHead><TableColumnFilter label="Status" value={filtros.ativo === undefined ? "" : String(filtros.ativo)} onChange={(value) => { setPagina(1); setFiltros((atual) => ({ ...atual, ativo: value === "" ? undefined : value === "true" })); }} options={[{ value: "", label: "Todos" }, { value: "true", label: "Ativo" }, { value: "false", label: "Inativo" }]} /></TableHead>{podeGerenciar && <TableHead className="text-right">Ações</TableHead>}
    </TableRow></TableHeader>{Boolean(times.data?.items.length) && <TableBody>
      {(times.data?.items ?? []).map((time) => <TableRow key={time.id}>
        <TableCell className="text-base font-medium text-foreground">{time.nome}</TableCell>
        <TableCell className="text-base text-muted-foreground">{setorNome(time.setor_id)}</TableCell>
        <TableCell><Badge variant="secondary" className={time.ativo ? "rounded-md bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700" : "rounded-md bg-secondary px-2.5 py-1 text-xs text-muted-foreground"}>{time.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
        {podeGerenciar && <TableCell className="text-right"><TableRowActions label={time.nome} actions={[
          ...((admin || (ehGerenteComEscopo && perfil.setores_gerenciados.includes(time.setor_id))) && time.ativo ? [{ label: "Gerenciar membros", icon: UsersRound, onSelect: () => setTimeAtual(time) }] : []),
          ...(admin ? [{ label: time.ativo ? "Inativar" : "Ativar", icon: time.ativo ? UserRoundX : UserRoundCheck, destructive: time.ativo, onSelect: () => time.ativo ? setTimeParaInativar(time) : definirAtivo.mutate({ id: time.id, ativo: true }) }] : []),
        ]} /></TableCell>}
      </TableRow>)}
    </TableBody>}</Table>{!times.data?.items.length && <TableEmptyState>
      {times.isLoading ? <p role="status">Carregando times...</p> : <div role="status" className="w-full max-w-md px-4 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          {Object.values(filtros).some((value) => value !== undefined && value !== "") ? <SearchX aria-hidden="true" className="h-5 w-5" /> : <UsersRound aria-hidden="true" className="h-5 w-5" />}
        </div>
        <h2 className="text-base font-semibold text-foreground">{Object.values(filtros).some((value) => value !== undefined && value !== "") ? "Nenhum resultado encontrado" : "Nenhum time cadastrado"}</h2>
        <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-muted-foreground">
          {Object.values(filtros).some((value) => value !== undefined && value !== "") ? "Não encontramos times que correspondam aos filtros selecionados." : "Crie um time para organizar os membros e as atividades do setor."}
        </p>
        {Object.values(filtros).some((value) => value !== undefined && value !== "") ? <Button variant="outline" size="sm" className="mt-5" onClick={() => { setPagina(1); setFiltros({}); }}>Limpar filtros</Button> : podeGerenciar && <Button size="sm" className="mt-5" onClick={() => setCriarAberto(true)}>Cadastrar time</Button>}
      </div>}
    </TableEmptyState>}
    <TablePagination page={pagina} pageSize={tamanho} totalCount={times.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(n) => { setTamanho(n); setPagina(1); }} />
    </TableLayout>
    <Dialog open={criarAberto} onOpenChange={(open) => { setCriarAberto(open); if (!open) { setNome(""); setSetorId(""); } }}><DialogContent><DialogHeader><DialogTitle>Novo time</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); criar.mutate(); }}><label className="block space-y-1 text-sm">Nome<Input value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={120} /></label><label className="block space-y-1 text-sm">Setor
      {!admin && ehGerenteComEscopo && setores.isLoading ? <Input aria-label="Setor do time" value="Carregando setores..." readOnly disabled /> : setorUnicoGerenciado ? <Input aria-label="Setor do time" value={setorUnicoGerenciado.nome} readOnly /> : <select required aria-label="Setor do time" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={setorId} onChange={(e) => setSetorId(e.target.value)}><option value="">Selecionar setor</option>{setoresAtivos.map((setor) => <option key={setor.id} value={setor.id}>{setor.nome}</option>)}</select>}
    </label><Button disabled={criar.isPending || !setorSelecionadoParaCriar || setores.isLoading}>Criar time</Button></form></DialogContent></Dialog>
    <Dialog open={Boolean(timeAtual)} onOpenChange={(open) => { if (!open) setTimeAtual(null); }}><DialogContent><DialogHeader><DialogTitle>{timeAtual ? `Membros · ${timeAtual.nome}` : "Membros"}</DialogTitle></DialogHeader><div className="space-y-4">
      <form className="grid grid-cols-[1fr_auto_auto] gap-2" onSubmit={(event) => { event.preventDefault(); adicionar.mutate(); }}><select aria-label="Selecionar usuário" className="h-10 min-w-0 rounded-md border bg-background px-2 text-sm" value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}><option value="">Selecionar usuário</option>{(usuarios.data ?? []).filter((usuario) => usuario.ativo && !(membros.data ?? []).some((membro) => membro.usuario_id === usuario.id)).map((usuario) => <option key={usuario.id} value={usuario.id}>{usuario.nome} · {usuario.email}</option>)}</select><select aria-label="Papel no time" className="h-10 rounded-md border bg-background px-2 text-sm" value={papel} onChange={(e) => setPapel(e.target.value as "dev" | "kp")}><option value="dev">DEV</option><option value="kp">KP</option></select><Button disabled={!usuarioId || adicionar.isPending}>Adicionar</Button></form>
      <div className="max-h-56 space-y-2 overflow-auto">{(membros.data ?? []).map((membro) => { const nome = usuarioNome(membro.usuario_id); return <div key={membro.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><span className="min-w-0 flex-1 truncate" title={nome}>{nome}</span><select aria-label={`Papel de ${nome}`} className="h-8 rounded-md border bg-background px-2" value={membro.papel} onChange={(e) => mudarPapel.mutate({ usuarioId: membro.usuario_id, papel: e.target.value as "dev" | "kp" })}><option value="dev">DEV</option><option value="kp">KP</option></select><Button variant="ghost" size="sm" onClick={() => remover.mutate(membro.usuario_id)}>Remover</Button></div>; })}</div>
    </div></DialogContent></Dialog>
    <ConfirmDialog open={Boolean(timeParaInativar)} onOpenChange={(open) => { if (!open) setTimeParaInativar(null); }} title="Inativar time" description={`Deseja inativar ${timeParaInativar?.nome ?? "este time"}? O histórico e os membros serão preservados.`} confirmLabel="Inativar time" variant="destructive" isPending={definirAtivo.isPending} onConfirm={() => { if (timeParaInativar) definirAtivo.mutate({ id: timeParaInativar.id, ativo: false }); }} />
  </section>;
}
