import { useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Tooltip } from "@heroui/react";
import { useNavigate, useOutletContext } from "react-router";
import { Plus, Trash2, UserRoundCheck, UserRoundX, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { CACHE_EXPORTACAO_MS, buscarTodasAsPaginas } from "@/shared/lib/exportar-planilha";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import { rotuloPerfil } from "@/shared/lib/perfil";
import { toast } from "@/shared/lib/toast";
import { AlertConfirm } from "@/shared/ui/alert-confirm";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { estadoDaTabela } from "@/shared/ui/data-table-state";
import { DataTableFilter } from "@/shared/ui/data-table-filter";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { EyeIcon } from "@/shared/ui/figma-icons";
import { SelectField } from "@/shared/ui/form-field";
import { PageCard, PageTitle } from "@/shared/ui/page-card";
import { RowActions, type RowAction } from "@/shared/ui/row-action-button";
import { rowActionIconProps } from "@/shared/ui/row-action-icon";
import { SideDrawer } from "@/shared/ui/side-drawer";
import { TONS_ETIQUETA, TagChip } from "@/shared/ui/tag-chip";
import { setoresApi } from "@/modules/setores/api/setores.api";
import { timesApi, type Time, type TimeMembro } from "../api/times.api";
import { NovoTimeDrawer } from "../components/NovoTimeDrawer";

export function TimesPage({ modoAdmin = false }: { modoAdmin?: boolean }) {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const navigate = useNavigate();
  const admin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  const podeVer = admin || perfil.permissoes.includes("times.consultar");
  const ehGerenteComEscopo = perfil.perfil_codigo === "GERENTE" && perfil.permissoes.includes("times.gerenciar") && perfil.setores_gerenciados.length > 0;
  const podeGerenciar = admin || ehGerenteComEscopo;
  const podeGerenciarMembros = podeGerenciar || (perfil.perfil_codigo === "KP" && perfil.permissoes.includes("times.gerenciar"));
  // Gerente também abre o detalhe dos times em que participa (ADR 0036), só para leitura.
  const podeVisualizarDetalhe = podeGerenciar || (["GERENTE", "KP", "USUARIO_PADRAO"].includes(perfil.perfil_codigo ?? "") && perfil.times.length > 0);
  const client = useQueryClient();
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtros, setFiltros] = useState<{ setor_id?: string; ativo?: boolean; busca?: string }>({});
  const [criarAberto, setCriarAberto] = useState(false);
  const [timeAtual, setTimeAtual] = useState<Time | null>(null);
  const [timeParaInativar, setTimeParaInativar] = useState<Time | null>(null);
  const [usuarioId, setUsuarioId] = useState("");
  const [membroParaRemover, setMembroParaRemover] = useState<string | null>(null);
  // A API só lista setores para admin, gerente e KP; o nome do setor do time já vem em `setor_nome`.
  const podeConsultarSetores = admin || (["GERENTE", "KP"].includes(perfil.perfil_codigo ?? "") && perfil.permissoes.includes("setores.consultar"));
  const setores = useQuery({ queryKey: ["setores", "times"], queryFn: () => setoresApi.listar(1, 100), enabled: podeVer && podeConsultarSetores });
  const setoresAtivos = (setores.data?.items ?? []).filter((setor) => setor.ativo);
  const setorUnicoGerenciado = !admin && ehGerenteComEscopo && setoresAtivos.length === 1 ? setoresAtivos[0] : undefined;
  const times = useQuery({ queryKey: ["times", pagina, tamanho, filtros], queryFn: () => timesApi.listar(pagina, tamanho, filtros), enabled: podeVer });
  const timesVisiveis = times.data?.items ?? [];
  const membrosPorTime = useQueries({ queries: podeGerenciarMembros ? timesVisiveis.map((time) => ({ queryKey: ["time-membros", time.id], queryFn: () => timesApi.membros(time.id) })) : [] });
  const membros = useQuery({ queryKey: ["time-membros", timeAtual?.id], queryFn: () => timesApi.membros(timeAtual!.id), enabled: Boolean(timeAtual) });
  const usuarios = useQuery({ queryKey: ["times", "usuarios-disponiveis"], queryFn: timesApi.usuariosDisponiveis, enabled: podeGerenciarMembros });
  const definirAtivo = useMutation({ mutationFn: (input: { id: string; ativo: boolean }) => timesApi.definirAtivo(input.id, input.ativo), onSuccess: async (time) => { await client.invalidateQueries({ queryKey: ["times"] }); setTimeParaInativar(null); toast.success(`${t("team")} ${time.nome} ${time.ativo ? t("activate").toLowerCase() : t("inactivate").toLowerCase()}.`); }, onError: () => toast.error(t("teamStatusError")) });
  const adicionar = useMutation({ mutationFn: () => timesApi.adicionar(timeAtual!.id, usuarioId.trim()), onSuccess: async () => { setUsuarioId(""); await client.invalidateQueries({ queryKey: ["time-membros", timeAtual?.id] }); toast.success(t("memberAdded")); }, onError: () => toast.error(t("memberAddError")) });
  const remover = useMutation({ mutationFn: (id: string) => timesApi.remover(timeAtual!.id, id), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["time-membros", timeAtual?.id] }); toast.success(t("memberRemoved")); }, onError: () => toast.error(t("memberRemoveError")) });
  if (modoAdmin && !admin) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;
  if (!podeVer) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;
  // Mapas montados uma vez por render: a coluna de membros consulta nome de usuário para cada integrante.
  const nomesSetores = new Map((setores.data?.items ?? []).map((setor) => [setor.id, setor.nome]));
  const nomesUsuarios = new Map((usuarios.data ?? []).map((usuario) => [usuario.id, usuario.nome]));
  const usuarioNome = (id: string) => nomesUsuarios.get(id) ?? id;
  // Times da página: o resultado do `useQueries`. Os demais (só em "Todos os itens"): o cache preenchido por `buscarTimesParaExportar`.
  const membrosDaPagina = new Map(timesVisiveis.map((time, indice) => [time.id, membrosPorTime[indice]?.data]));
  const integrantesDoTime = (time: Time) => (membrosDaPagina.get(time.id) ?? client.getQueryData<TimeMembro[]>(["time-membros", time.id]) ?? [])
    .filter((membro) => membro.ativo).map((membro) => usuarioNome(membro.usuario_id));
  const rotuloSetor = (time: Time) => time.setor_nome ?? nomesSetores.get(time.setor_id) ?? time.setor_id;
  const rotuloStatus = (time: Time) => time.ativo ? t("active") : t("inactive");
  async function buscarTimesParaExportar() {
    const todos = await buscarTodasAsPaginas((page, pageSize) => timesApi.listar(page, pageSize, filtros));
    // Reaproveita o que a tela acabou de buscar; o que estiver velho ou invalidado é buscado de novo.
    if (podeGerenciarMembros) await Promise.all(todos.map((time) => client.fetchQuery({ staleTime: CACHE_EXPORTACAO_MS, queryKey: ["time-membros", time.id], queryFn: () => timesApi.membros(time.id) })));
    return todos;
  }
  const podeGerenciarTime = (time: Time) => admin ||
    (ehGerenteComEscopo && perfil.setores_gerenciados.includes(time.setor_id)) ||
    (perfil.perfil_codigo === "KP" && perfil.permissoes.includes("times.gerenciar") && perfil.times.some((item) => item.id === time.id));
  const temFiltro = Object.values(filtros).some((value) => value !== undefined && value !== "");
  const alterarFiltro = (novos: Partial<typeof filtros>) => { setPagina(1); setFiltros((atual) => ({ ...atual, ...novos })); };
  function acoesDoTime(time: Time): RowAction[] {
    return [
      { label: t("viewTeam"), icon: <EyeIcon />, onPress: () => navigate(`${modoAdmin ? "/admin/times" : "/times"}/${time.id}`) },
      ...(podeGerenciarTime(time) && time.ativo ? [{ label: t("manageMembers"), icon: <UsersRound {...rowActionIconProps} />, onPress: () => setTimeAtual(time) }] : []),
      ...(admin ? [{
        label: time.ativo ? t("inactivate") : t("activate"),
        icon: time.ativo ? <UserRoundX {...rowActionIconProps} /> : <UserRoundCheck {...rowActionIconProps} />,
        destructive: time.ativo,
        onPress: () => time.ativo ? setTimeParaInativar(time) : definirAtivo.mutate({ id: time.id, ativo: true }),
      }] : []),
    ];
  }

  const colunas: DataTableColumn<Time>[] = [
    { id: "nome", isRowHeader: true, header: <DataTableFilter label={t("teams")} value={filtros.busca ?? ""} onChange={(value) => alterarFiltro({ busca: value || undefined })} placeholder={t("searchTeam")} />, cell: (time) => time.nome, exportar: { titulo: t("teams"), valor: (time) => time.nome } },
    { id: "setor", header: <DataTableFilter label={t("sector")} value={filtros.setor_id ?? ""} onChange={(value) => alterarFiltro({ setor_id: value || undefined })} options={[{ value: "", label: t("all") }, ...(setores.data?.items ?? []).map((setor) => ({ value: setor.id, label: setor.nome }))]} />, cell: rotuloSetor, exportar: { titulo: t("sector"), valor: rotuloSetor } },
    ...(podeGerenciarMembros ? [{
      id: "membros",
      header: t("members"),
      className: "text-end",
      exportar: { titulo: t("members"), valor: (time: Time) => integrantesDoTime(time).join(", ") },
      cell: (time: Time) => {
        const integrantes = integrantesDoTime(time);
        return (
          <Tooltip delay={300} closeDelay={0}>
            <Button variant="ghost" aria-label={t("teamMembersCount", { count: integrantes.length })} className="h-7 min-h-0 gap-1.5 rounded-lg px-1.5 text-[14px] text-body">
              <UsersRound aria-hidden="true" absoluteStrokeWidth strokeWidth={1} className="size-3.5" /><span className="tabular-nums">{integrantes.length}</span>
            </Button>
            <Tooltip.Content className="max-w-64 text-[13px]">
              {(integrantes.length ? integrantes : [t("teamMembersEmpty")]).map((nomeIntegrante, indice) => <span key={`${nomeIntegrante}-${indice}`} className="block truncate">{nomeIntegrante}</span>)}
            </Tooltip.Content>
          </Tooltip>
        );
      },
    }] : []),
    { id: "status", header: <DataTableFilter label={t("status")} value={filtros.ativo === undefined ? "" : String(filtros.ativo)} onChange={(value) => alterarFiltro({ ativo: value === "" ? undefined : value === "true" })} options={[{ value: "", label: t("all") }, { value: "true", label: t("active") }, { value: "false", label: t("inactive") }]} />, cell: (time) => <TagChip tom={time.ativo ? TONS_ETIQUETA.ativo : TONS_ETIQUETA.neutro}>{rotuloStatus(time)}</TagChip>, exportar: { titulo: t("status"), valor: rotuloStatus } },
    ...(podeVisualizarDetalhe ? [{ id: "acoes", header: t("actions"), className: "w-px whitespace-nowrap", cell: (time: Time) => <RowActions identificador={time.nome} actions={acoesDoTime(time)} /> }] : []),
  ];

  const estado = estadoDaTabela({
    isLoading: times.isLoading,
    isError: times.isError,
    isEmpty: !timesVisiveis.length,
    hasFilters: temFiltro,
    onClearFilters: () => { setPagina(1); setFiltros({}); },
    loadingLabel: t("loadingTeams"),
    errorLabel: t("teamsLoadError"),
    clearFiltersLabel: t("clearFilters"),
    empty: { title: t("noTeam"), hint: t("noTeamHint") },
    filtered: { title: t("noResults"), hint: t("noTeamResults") },
  });
  const membrosAtivos = (membros.data ?? []).filter((membro) => membro.ativo);

  return <PageCard>
    <header className="mb-5 flex shrink-0 items-start justify-between gap-4"><div className="min-w-0"><PageTitle>{t("teams")}</PageTitle><p className="mt-1.5 text-[14px] leading-5 text-muted">{t("teamsSubtitle")}</p></div>{podeGerenciar && <Button variant="primary" onPress={() => setCriarAberto(true)}><Plus aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-4" />{t("newTeam")}</Button>}</header>
    <DataTable
      aria-label={t("teams")}
      columns={colunas}
      items={timesVisiveis}
      state={estado}
      pagination={<DataTablePagination page={pagina} pageSize={tamanho} totalCount={times.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(n) => { setTamanho(n); setPagina(1); }} />}
      exportacao={{ listagem: "times", todosOsItens: buscarTimesParaExportar }}
    />
    <NovoTimeDrawer isOpen={criarAberto} onOpenChange={setCriarAberto} setoresAtivos={setoresAtivos} setorUnico={setorUnicoGerenciado} carregandoSetores={!admin && ehGerenteComEscopo && setores.isLoading} />
    <SideDrawer isOpen={Boolean(timeAtual)} onOpenChange={(open) => { if (!open) setTimeAtual(null); }} title={timeAtual ? t("memberTitle", { name: timeAtual.nome }) : t("members")} subtitle={t("teamMembersCount", { count: membrosAtivos.length })}>
      <div className="flex-1 space-y-7 px-7 py-6">
        <form className="space-y-4 rounded-2xl border border-edge bg-page p-4" onSubmit={(event) => { event.preventDefault(); adicionar.mutate(); }}>
          <h3 className="text-[14px] font-medium text-body">{t("addMemberToTeam")}</h3>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <SelectField label={t("selectUser")} value={usuarioId} onChange={setUsuarioId} placeholder={t("selectUser")} options={(usuarios.data ?? []).filter((usuario) => usuario.ativo && !membrosAtivos.some((membro) => membro.usuario_id === usuario.id)).map((usuario) => ({ value: usuario.id, label: `${usuario.nome} · ${usuario.email}`, textValue: usuario.nome }))} />
            <Button type="submit" variant="outline" isIconOnly aria-label={adicionar.isPending ? t("pleaseWait") : t("add")} isDisabled={!usuarioId || adicionar.isPending} className="size-10 text-accent-text">
              <Plus aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </form>
        <section className="space-y-3" aria-label={t("members")}>
          <h3 className="text-[14px] font-medium text-body">{t("members")}</h3>
          {membros.isLoading ? <p role="status" className="py-5 text-center text-[14px] text-muted">{t("loading")}</p>
            : membros.isError ? <p role="alert" className="py-5 text-center text-[14px] text-danger">{t("teamMembersLoadError")}</p>
              : membrosAtivos.length === 0 ? <p className="rounded-xl border border-dashed border-separator px-4 py-8 text-center text-[14px] text-muted">{t("noTeamMembers")}</p>
                : <div className="space-y-2">
                  {membrosAtivos.map((membro) => {
                    const nomeMembro = membro.usuario_nome ?? usuarioNome(membro.usuario_id);
                    const perfilNome = rotuloPerfil(t, membro.usuario_perfil_codigo, membro.usuario_perfil);
                    return <div key={membro.id} className="flex items-center gap-3 rounded-xl border border-edge bg-surface px-3 py-3">
                      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-tint text-[14px] font-medium text-accent-text">{nomeMembro.slice(0, 1).toLocaleUpperCase()}</span>
                      <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-medium text-body" title={nomeMembro}>{nomeMembro}</p><p className="mt-0.5 text-[12px] text-muted">{perfilNome}</p></div>
                      <Button size="sm" variant="ghost" isIconOnly aria-label={`${t("removeTeamMemberTitle")} ${nomeMembro}`} className="shrink-0 text-danger" onPress={() => setMembroParaRemover(membro.usuario_id)}>
                        <Trash2 aria-hidden="true" className="size-4" />
                      </Button>
                    </div>;
                  })}
                </div>}
        </section>
      </div>
    </SideDrawer>
    <AlertConfirm
      open={Boolean(membroParaRemover)}
      onOpenChange={(open) => { if (!open && !remover.isPending) setMembroParaRemover(null); }}
      title={t("removeTeamMemberTitle")}
      description={t("removeTeamMemberDescription", { name: membroParaRemover ? usuarioNome(membroParaRemover) : "", team: timeAtual?.nome ?? "" })}
      confirmLabel={t("remove")}
      variant="destructive"
      isPending={remover.isPending}
      onConfirm={() => { if (membroParaRemover) remover.mutate(membroParaRemover, { onSuccess: () => setMembroParaRemover(null) }); }}
    />
    <AlertConfirm open={Boolean(timeParaInativar)} onOpenChange={(open) => { if (!open) setTimeParaInativar(null); }} title={`${t("inactivate")} ${t("team").toLowerCase()}`} description={`${t("inactivate")} ${timeParaInativar?.nome ?? t("team").toLowerCase()}? ${t("teamDeactivateHint")}`} confirmLabel={`${t("inactivate")} ${t("team").toLowerCase()}`} variant="destructive" isPending={definirAtivo.isPending} onConfirm={() => { if (timeParaInativar) definirAtivo.mutate({ id: timeParaInativar.id, ativo: false }); }} />
  </PageCard>;
}
