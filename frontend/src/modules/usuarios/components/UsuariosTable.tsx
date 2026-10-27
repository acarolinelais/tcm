import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, UserRoundCheck, UserRoundCog, UserRoundX, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import { listarPerfis } from "@/modules/perfis/api/perfis.api";
import { setoresApi } from "@/modules/setores/api/setores.api";
import { comOpcaoTodos } from "@/shared/lib/opcoes";
import { toast } from "@/shared/lib/toast";
import { AlertConfirm } from "@/shared/ui/alert-confirm";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { DataTableFilter } from "@/shared/ui/data-table-filter";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { estadoDaTabela } from "@/shared/ui/data-table-state";
import { RowActions, type RowAction } from "@/shared/ui/row-action-button";
import { rowActionIconProps } from "@/shared/ui/row-action-icon";
import { TONS_ETIQUETA, TagChip } from "@/shared/ui/tag-chip";

import { usuarioApi, type UsuarioFiltros } from "../api/usuario.api";
import { useAtivarUsuario, useInativarUsuario, useUsuariosList } from "../hooks/useUsuarios";
import type { Usuario } from "../model/usuario";
import { UsuarioResponsavelDrawer } from "./UsuarioResponsavelDrawer";

interface UsuariosTableProps {
  page: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  filtros: UsuarioFiltros;
  onFiltroChange: (campo: "nome" | "email" | "ativo" | "perfil" | "responsavel" | "setor", valor: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onEditar: (usuario: Usuario) => void;
  onNovoUsuario: () => void;
  onLimparFiltros: () => void;
  podeGerenciar?: boolean;
  podeAtribuirPerfil?: boolean;
  podeAtribuirPerfilKP?: boolean;
  podeConsultarPerfil?: boolean;
  podeConsultarSetores?: boolean;
  usuarioAtualId?: string;
}

export function UsuariosTable({
  page,
  pageSize,
  pageSizeOptions,
  filtros,
  onFiltroChange,
  onPageChange,
  onPageSizeChange,
  onEditar,
  onLimparFiltros,
  podeGerenciar = false,
  podeAtribuirPerfil = false,
  podeAtribuirPerfilKP = false,
  podeConsultarPerfil = false,
  podeConsultarSetores = false,
  usuarioAtualId = "",
}: UsuariosTableProps) {
  const { t } = useTranslation();
  const usuarios = useUsuariosList(page, pageSize, filtros);
  const perfis = useQuery({
    queryKey: ["perfis"],
    queryFn: listarPerfis,
    enabled: podeAtribuirPerfil || podeAtribuirPerfilKP,
  });
  const perfilGerenteId = perfis.data?.find((perfil) => perfil.codigo === "GERENTE")?.id;
  const gerentes = useQuery({
    queryKey: ["usuarios", "gerentes", perfilGerenteId],
    queryFn: () => usuarioApi.listar(1, 100, { perfil_id: perfilGerenteId }),
    enabled: podeAtribuirPerfil && Boolean(perfilGerenteId),
  });
  const setores = useQuery({
    queryKey: ["setores", "filtro-usuarios"],
    queryFn: () => setoresApi.listar(1, 100),
    enabled: podeConsultarSetores,
  });
  const ativar = useAtivarUsuario();
  const inativar = useInativarUsuario();
  // Confirmação e painel de responsável ficam fora das células: a grade não interfere no teclado deles.
  const [paraInativar, setParaInativar] = useState<Usuario | null>(null);
  const [responsavelDe, setResponsavelDe] = useState<Usuario | null>(null);
  const listaGerentes = gerentes.data?.items ?? [];
  const mostrarAcoes = podeGerenciar || podeAtribuirPerfil;

  const items = usuarios.isError ? [] : usuarios.data?.items ?? [];
  const temFiltro = Boolean(
    filtros.nome || filtros.email || filtros.ativo !== undefined || filtros.perfil_id || filtros.responsavel_id || filtros.sem_responsavel || filtros.setor_id,
  );
  const rotuloPerfil = (perfil: { codigo?: string | null; nome?: string | null }) =>
    perfil.codigo ? t(`catalog.profile.${perfil.codigo}`, { defaultValue: perfil.nome ?? "—" }) : perfil.nome ?? "—";

  function acoesDoUsuario(usuario: Usuario): RowAction[] {
    // Quem gerencia sem atribuir perfil só mexe nos usuários de que é responsável.
    const gerenciaEste = podeGerenciar && (podeAtribuirPerfil || usuario.responsavel_id === usuarioAtualId);
    return [
      ...(gerenciaEste || podeAtribuirPerfil ? [{ label: t("edit"), icon: <Pencil {...rowActionIconProps} />, onPress: () => onEditar(usuario) }] : []),
      ...(podeAtribuirPerfil ? [{ label: t("changeOwner"), icon: <UserRoundCog {...rowActionIconProps} />, onPress: () => setResponsavelDe(usuario) }] : []),
      ...(gerenciaEste ? [{
        label: usuario.ativo ? t("inactivate") : t("activate"),
        icon: usuario.ativo ? <UserRoundX {...rowActionIconProps} /> : <UserRoundCheck {...rowActionIconProps} />,
        destructive: usuario.ativo,
        disabled: ativar.isPending || inativar.isPending,
        onPress: () => usuario.ativo ? setParaInativar(usuario) : ativar.mutate(usuario.id),
      }] : []),
    ];
  }

  const colunas: DataTableColumn<Usuario>[] = [
    { id: "nome", isRowHeader: true, header: <DataTableFilter label={t("user")} value={filtros.nome ?? ""} onChange={(valor) => onFiltroChange("nome", valor)} placeholder={t("usersSearchName")} />, cell: (usuario) => usuario.nome },
    { id: "email", header: <DataTableFilter label={t("email")} value={filtros.email ?? ""} onChange={(valor) => onFiltroChange("email", valor)} placeholder={t("usersSearchEmail")} />, cell: (usuario) => usuario.email },
    {
      id: "status",
      header: <DataTableFilter label={t("status")} value={filtros.ativo === undefined ? "" : String(filtros.ativo)} onChange={(valor) => onFiltroChange("ativo", valor)} options={comOpcaoTodos(t("all"), [{ value: "true", label: t("active") }, { value: "false", label: t("inactive") }])} />,
      cell: (usuario) => <TagChip tom={usuario.ativo ? TONS_ETIQUETA.ativo : TONS_ETIQUETA.neutro}>{usuario.ativo ? t("active") : t("inactive")}</TagChip>,
    },
    ...(podeConsultarPerfil ? [{
      id: "perfil",
      header: podeAtribuirPerfil || podeAtribuirPerfilKP
        ? <DataTableFilter label={t("profile")} value={filtros.perfil_id ?? ""} onChange={(valor) => onFiltroChange("perfil", valor)} options={comOpcaoTodos(t("all"), (perfis.data ?? []).map((perfil) => ({ value: perfil.id, label: rotuloPerfil(perfil) })))} />
        : t("profile"),
      cell: (usuario: Usuario) => {
        const perfil = perfis.data?.find((item) => item.id === usuario.perfil_id);
        return rotuloPerfil({ codigo: usuario.perfil_codigo ?? perfil?.codigo, nome: usuario.perfil_nome ?? perfil?.nome });
      },
    }] : []),
    ...(podeAtribuirPerfil ? [{
      id: "responsavel",
      header: <DataTableFilter label={t("owner")} value={filtros.sem_responsavel ? "__none" : filtros.responsavel_id ?? ""} onChange={(valor) => onFiltroChange("responsavel", valor)} options={comOpcaoTodos(t("all"), [{ value: "__none", label: t("noOwner") }, ...listaGerentes.map((gerente) => ({ value: gerente.id, label: gerente.nome }))])} />,
      cell: (usuario: Usuario) => listaGerentes.find((gerente) => gerente.id === usuario.responsavel_id)?.nome ?? t("noOwner"),
    }] : []),
    ...(podeConsultarSetores ? [{
      id: "setor",
      header: <DataTableFilter label={t("sector")} value={filtros.setor_id ?? ""} onChange={(valor) => onFiltroChange("setor", valor)} options={comOpcaoTodos(t("all"), (setores.data?.items ?? []).map((setor) => ({ value: setor.id, label: setor.nome })))} />,
      cell: (usuario: Usuario) => usuario.setores?.join(", ") || "—",
    }] : []),
    ...(mostrarAcoes ? [{ id: "acoes", header: t("actions"), className: "w-px whitespace-nowrap", cell: (usuario: Usuario) => <RowActions identificador={usuario.nome} actions={acoesDoUsuario(usuario)} /> }] : []),
  ];

  const estado = estadoDaTabela({
    isLoading: usuarios.isLoading,
    isError: usuarios.isError,
    isEmpty: !items.length,
    hasFilters: temFiltro,
    onClearFilters: onLimparFiltros,
    loadingLabel: t("loadingUsers"),
    errorLabel: t("usersLoadError"),
    clearFiltersLabel: t("clearFilters"),
    empty: { icon: <UsersRound aria-hidden="true" className="size-5" />, title: t("noUsers"), hint: t("noUsersHint") },
    filtered: { title: t("noResults"), hint: t("noUsersResults") },
  });

  return (
    <>
      <DataTable
        aria-label={t("users")}
        columns={colunas}
        items={items}
        state={estado}
        pagination={<DataTablePagination page={page} pageSize={pageSize} pageSizeOptions={pageSizeOptions} totalCount={usuarios.data?.total_count ?? 0} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />}
        rowDependencies={[t, perfis.data, listaGerentes, setores.data, podeGerenciar, podeAtribuirPerfil, usuarioAtualId, ativar.isPending, inativar.isPending]}
      />
      <AlertConfirm
        open={Boolean(paraInativar)}
        onOpenChange={(open) => { if (!open && !inativar.isPending) setParaInativar(null); }}
        title={t("deactivateUserQuestion")}
        description={t("deactivateUserDescription", { name: paraInativar?.nome ?? "" })}
        confirmLabel={t("deactivateUser")}
        variant="destructive"
        isPending={inativar.isPending}
        onConfirm={() => {
          if (!paraInativar) return;
          const usuario = paraInativar;
          inativar.mutate(usuario.id, { onSuccess: () => toast.success(t("userDeactivated", { name: usuario.nome })) });
          setParaInativar(null);
        }}
      />
      <UsuarioResponsavelDrawer usuario={responsavelDe} gerentes={listaGerentes} onFechar={() => setResponsavelDe(null)} />
    </>
  );
}
