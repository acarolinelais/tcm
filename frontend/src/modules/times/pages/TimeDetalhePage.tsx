import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@heroui/react";
import { Plus, Trash2, UsersRound } from "lucide-react";
import { useOutletContext, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import { rotuloPerfil } from "@/shared/lib/perfil";
import { toast } from "@/shared/lib/toast";
import { AlertConfirm } from "@/shared/ui/alert-confirm";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { estadoDaTabela } from "@/shared/ui/data-table-state";
import { DataTableFilter } from "@/shared/ui/data-table-filter";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { PageCard, PageTitle } from "@/shared/ui/page-card";
import { RowActions } from "@/shared/ui/row-action-button";
import { rowActionIconProps } from "@/shared/ui/row-action-icon";
import { setoresApi } from "@/modules/setores/api/setores.api";
import { timesApi, type TimeMembro } from "../api/times.api";
import { AdicionarMembroDrawer } from "../components/AdicionarMembroDrawer";
import { EditarTimeDrawer } from "../components/EditarTimeDrawer";

/** Visualizar Team (Figma TCM 2311-652). O caminho de volta para Teams fica no topo da página (navbar). */
export function TimeDetalhePage({ modoAdmin = false }: { modoAdmin?: boolean }) {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const { timeId = "" } = useParams();
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtros, setFiltros] = useState<{ nome?: string; perfil?: string }>({});
  const [membroParaRemover, setMembroParaRemover] = useState<string | null>(null);
  const [editarTimeAberto, setEditarTimeAberto] = useState(false);
  const [adicionarMembroAberto, setAdicionarMembroAberto] = useState(false);
  const client = useQueryClient();
  const admin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  const podeConsultar = admin || perfil.permissoes.includes("times.consultar");
  const times = useQuery({ queryKey: ["times", "detalhe", timeId], queryFn: () => timesApi.listar(1, 100), enabled: podeConsultar });
  const time = times.data?.items.find((item) => item.id === timeId);
  const membroDoTime = Boolean(time && perfil.times.some((item) => item.id === time.id));
  // Gerente vê o time pelo setor ou como membro (ADR 0036); gerir membros continua exigindo o setor.
  const escopoPermitido = Boolean(time && (admin || perfil.setores_gerenciados.includes(time.setor_id) || membroDoTime));
  const podeGerenciarMembros = Boolean(time && (admin ||
    (perfil.permissoes.includes("times.gerenciar") && perfil.setores_gerenciados.includes(time.setor_id)) ||
    (perfil.perfil_codigo === "KP" && perfil.permissoes.includes("times.gerenciar") && membroDoTime)));
  const membros = useQuery({ queryKey: ["time-membros", timeId], queryFn: () => timesApi.membros(timeId), enabled: escopoPermitido });
  const usuariosDisponiveis = useQuery({ queryKey: ["times", "usuarios-disponiveis"], queryFn: timesApi.usuariosDisponiveis, enabled: podeGerenciarMembros });
  const setores = useQuery({ queryKey: ["setores", "times"], queryFn: () => setoresApi.listar(1, 100), enabled: escopoPermitido });
  const remover = useMutation({ mutationFn: (usuarioId: string) => timesApi.remover(timeId, usuarioId), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["time-membros", timeId] }); setMembroParaRemover(null); toast.success(t("memberRemoved")); }, onError: () => toast.error(t("memberRemoveError")) });

  if ((modoAdmin && !admin) || !podeConsultar) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;

  const setorNome = time?.setor_nome ?? setores.data?.items.find((setor) => setor.id === time?.setor_id)?.nome ?? "—";
  const membrosAtivos = (membros.data ?? []).filter((membro) => membro.ativo);
  // O rótulo do perfil serve ao filtro, às opções e à célula: calculado uma vez por membro.
  const linhas = membrosAtivos.map((membro) => ({ ...membro, perfilNome: rotuloPerfil(t, membro.usuario_perfil_codigo, membro.usuario_perfil) }));
  const perfisFiltro = [...new Set(linhas.map((linha) => linha.perfilNome))].sort((a, b) => a.localeCompare(b));
  const membrosFiltrados = linhas.filter((membro) => {
    const nome = (membro.usuario_nome ?? membro.usuario_id).toLocaleLowerCase();
    return (!filtros.nome || nome.includes(filtros.nome.toLocaleLowerCase())) && (!filtros.perfil || membro.perfilNome === filtros.perfil);
  });
  const membrosPaginados = membrosFiltrados.slice((pagina - 1) * tamanho, pagina * tamanho);
  const temFiltro = Boolean(filtros.nome || filtros.perfil);
  const alterarFiltro = (novos: Partial<typeof filtros>) => { setPagina(1); setFiltros((atual) => ({ ...atual, ...novos })); };

  const colunas: DataTableColumn<TimeMembro & { perfilNome: string }>[] = [
    { id: "nome", isRowHeader: true, header: <DataTableFilter label={t("user")} value={filtros.nome ?? ""} onChange={(value) => alterarFiltro({ nome: value || undefined })} placeholder={t("usersSearchName")} />, cell: (membro) => membro.usuario_nome ?? membro.usuario_id },
    { id: "perfil", header: <DataTableFilter label={t("profile")} value={filtros.perfil ?? ""} onChange={(value) => alterarFiltro({ perfil: value || undefined })} options={[{ value: "", label: t("all") }, ...perfisFiltro.map((nome) => ({ value: nome, label: nome }))]} />, cell: (membro) => membro.perfilNome },
    ...(podeGerenciarMembros ? [{
      id: "acoes",
      header: t("actions"),
      className: "w-px whitespace-nowrap",
      cell: (membro: TimeMembro) => <RowActions identificador={membro.usuario_nome ?? membro.usuario_id} actions={[{ label: t("removeTeamMemberTitle"), icon: <Trash2 {...rowActionIconProps} />, destructive: true, onPress: () => setMembroParaRemover(membro.usuario_id) }]} />,
    }] : []),
  ];
  const estado = estadoDaTabela({
    isLoading: membros.isLoading,
    isError: membros.isError,
    isEmpty: !membrosFiltrados.length,
    hasFilters: temFiltro,
    onClearFilters: () => { setPagina(1); setFiltros({}); },
    loadingLabel: t("loading"),
    errorLabel: t("teamMembersLoadError"),
    clearFiltersLabel: t("clearFilters"),
    empty: { icon: <UsersRound aria-hidden="true" className="size-5" />, title: t("noTeamMembers"), hint: t("addMemberToTeam") },
    filtered: { title: t("noResults"), hint: t("noTeamResults") },
  });

  return <PageCard>
    <header className="mb-5 flex shrink-0 items-start gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium leading-5 text-muted">{t("teamDetails")}</p>
        <PageTitle className="mt-1 text-accent">{time?.nome ?? t("team")}</PageTitle>
      </div>
      {podeGerenciarMembros && time && <div className="ml-auto flex flex-wrap justify-end gap-2">
        <Button variant="outline" isIconOnly aria-label={t("addMemberToTeam")} onPress={() => setAdicionarMembroAberto(true)}>
          <Plus aria-hidden="true" className="size-4" />
        </Button>
        <Button variant="outline" onPress={() => setEditarTimeAberto(true)}>{t("editTeam")}</Button>
      </div>}
    </header>

    {times.isLoading ? <p role="status" className="py-8 text-[14px] text-muted">{t("loadingTeams")}</p> : !time || !escopoPermitido ? <p role="alert" className="py-8 text-[14px] text-muted">{t("teamNotFound")}</p> : <>
      {/* Linha de dados do Figma: rótulo em cinza, valor em #454442, "Ativo" em verde e "·" entre os itens. */}
      <div className="mb-5 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-[#EFEFF0] px-2.5 pb-5 text-[14px] font-medium leading-5 text-muted">
        <span>{t("sector")}: <span className="ms-1 text-[#454442]">{setorNome}</span></span>
        <span aria-hidden="true" className="font-semibold text-[#7E7E7E]">·</span>
        <span>{t("status")}: <span className={time.ativo ? "ms-1 text-[#007A55]" : "ms-1 text-muted"}>{time.ativo ? t("active") : t("inactive")}</span></span>
        <span aria-hidden="true" className="font-semibold text-[#7E7E7E]">·</span>
        <span>{t("teamMembersCount", { count: membrosAtivos.length })}</span>
      </div>

      <DataTable
        aria-label={t("members")}
        columns={colunas}
        items={membrosPaginados}
        state={estado}
        pagination={<DataTablePagination page={pagina} pageSize={tamanho} totalCount={membrosFiltrados.length} onPageChange={setPagina} onPageSizeChange={(valor) => { setTamanho(valor); setPagina(1); }} />}
      />
    </>}
    <EditarTimeDrawer isOpen={editarTimeAberto} onOpenChange={setEditarTimeAberto} timeId={timeId} nomeAtual={time?.nome ?? ""} />
    <AdicionarMembroDrawer isOpen={adicionarMembroAberto} onOpenChange={setAdicionarMembroAberto} timeId={timeId} opcoes={(usuariosDisponiveis.data ?? []).filter((usuario) => usuario.ativo && !membrosAtivos.some((membro) => membro.usuario_id === usuario.id)).map((usuario) => ({ value: usuario.id, label: `${usuario.nome} · ${usuario.email}`, textValue: usuario.nome }))} />
    <AlertConfirm open={Boolean(membroParaRemover)} onOpenChange={(open) => { if (!open && !remover.isPending) setMembroParaRemover(null); }} title={t("removeTeamMemberTitle")} description={t("removeTeamMemberDescription", { name: membroParaRemover ? membrosAtivos.find((membro) => membro.usuario_id === membroParaRemover)?.usuario_nome ?? membroParaRemover : "", team: time?.nome ?? "" })} confirmLabel={t("remove")} variant="destructive" isPending={remover.isPending} onConfirm={() => { if (membroParaRemover) remover.mutate(membroParaRemover); }} />
  </PageCard>;
}
