import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeader, TableLayout, TablePagination, TableRow } from "@/shared/ui/table";
import { TableColumnFilter } from "@/shared/ui/table-column-filter";
import { useTranslation } from "react-i18next";
import { listarPerfis } from "@/modules/perfis/api/perfis.api";
import { useQuery } from "@tanstack/react-query";
import { SearchX, UsersRound } from "lucide-react";
import { usuarioApi } from "../api/usuario.api";

import type { UsuarioFiltros } from "../api/usuario.api";
import { useUsuariosList } from "../hooks/useUsuarios";
import type { Usuario } from "../model/usuario";
import { UsuarioActionsMenu } from "./UsuarioActionsMenu";

interface UsuariosTableProps {
  page: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  filtros: UsuarioFiltros;
  onFiltroChange: (campo: "nome" | "email" | "ativo" | "perfil", valor: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onEditar: (usuario: Usuario) => void;
  onNovoUsuario: () => void;
  onLimparFiltros: () => void;
  podeGerenciar?: boolean;
  podeAtribuirPerfil?: boolean;
  podeAtribuirPerfilKP?: boolean;
  podeConsultarPerfil?: boolean;
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
  onNovoUsuario,
  onLimparFiltros,
  podeGerenciar = false,
  podeAtribuirPerfil = false,
  podeAtribuirPerfilKP = false,
  podeConsultarPerfil = false,
  usuarioAtualId = "",
}: UsuariosTableProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useUsuariosList(page, pageSize, filtros);
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
  const mostrarAcoes = podeGerenciar || podeAtribuirPerfil;

  if (isLoading) return <p className="text-sm text-muted-foreground">{t("loadingProfile")}</p>;

  const items = data?.items ?? [];
  const temFiltro = Boolean(
    filtros.nome || filtros.email || filtros.ativo !== undefined || filtros.perfil_id,
  );

  return (
    <TableLayout>
      <Table containerClassName={items.length > 0 ? "min-h-0 flex-1 overflow-auto" : "shrink-0 overflow-visible"}>
        <TableHeader>
          <TableRow>
            <TableHead>
              <TableColumnFilter
                label={t("user")}
                value={filtros.nome ?? ""}
                onChange={(valor) => onFiltroChange("nome", valor)}
                placeholder={t("usersSearchName")}
              />
            </TableHead>
            <TableHead>
              <TableColumnFilter
                label={t("email")}
                value={filtros.email ?? ""}
                onChange={(valor) => onFiltroChange("email", valor)}
                placeholder={t("usersSearchEmail")}
              />
            </TableHead>
            <TableHead>
              <TableColumnFilter
                label={t("status")}
                value={filtros.ativo === undefined ? "" : String(filtros.ativo)}
                onChange={(valor) => onFiltroChange("ativo", valor)}
                options={[
                  { value: "", label: t("all") },
                  { value: "true", label: t("active") },
                  { value: "false", label: t("inactive") },
                ]}
              />
            </TableHead>
            {podeConsultarPerfil && (
              <TableHead>
                {(podeAtribuirPerfil || podeAtribuirPerfilKP) ? (
                  <TableColumnFilter
                    label={t("profile")}
                    value={filtros.perfil_id ?? ""}
                    onChange={(valor) => onFiltroChange("perfil", valor)}
                    options={[
                      { value: "", label: t("all") },
                      ...(perfis.data ?? []).map((perfil) => ({ value: perfil.id, label: perfil.codigo ? t(`catalog.profile.${perfil.codigo}`, { defaultValue: perfil.nome }) : perfil.nome })),
                    ]}
                  />
                ) : t("profile")}
              </TableHead>
            )}
            {podeAtribuirPerfil && <TableHead>{t("owner")}</TableHead>}
            {mostrarAcoes && <TableHead>{t("actions")}</TableHead>}
          </TableRow>
        </TableHeader>
        {items.length > 0 && <TableBody>
          {items.map((usuario) => (
            <TableRow key={usuario.id}>
              <TableCell className="text-base font-medium text-foreground">{usuario.nome}</TableCell>
              <TableCell className="text-base text-muted-foreground">{usuario.email}</TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={usuario.ativo
                    ? "rounded-md bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700"
                    : "rounded-md px-2.5 py-1 text-xs"}
                >
                  {usuario.ativo ? t("active") : t("inactive")}
                </Badge>
              </TableCell>
              {podeConsultarPerfil && (
                <TableCell className="text-sm text-muted-foreground">
                  {(() => {
                    const perfil = perfis.data?.find((item) => item.id === usuario.perfil_id);
                    const codigo = usuario.perfil_codigo ?? perfil?.codigo;
                    const nome = usuario.perfil_nome ?? perfil?.nome;
                    return codigo
                      ? t(`catalog.profile.${codigo}`, { defaultValue: nome ?? "—" })
                      : nome ?? "—";
                  })()}
                </TableCell>
              )}
              {podeAtribuirPerfil && <TableCell className="text-sm text-muted-foreground">
                  {gerentes.data?.items.find((gerente) => gerente.id === usuario.responsavel_id)?.nome ?? t("noOwner")}
              </TableCell>}
              {mostrarAcoes && <TableCell>
                <UsuarioActionsMenu
                  usuario={usuario}
                  onEditar={onEditar}
                  podeAtribuirPerfil={podeAtribuirPerfil}
                  podeGerenciar={podeGerenciar && (podeAtribuirPerfil || usuario.responsavel_id === usuarioAtualId)}
                  podeAtribuirResponsavel={podeAtribuirPerfil}
                  gerentes={gerentes.data?.items ?? []}
                />
              </TableCell>}
            </TableRow>
          ))}
        </TableBody>}
      </Table>
      {items.length === 0 && (
        <TableEmptyState className="px-4 py-6">
          <div role="status" className="w-full max-w-md text-center">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              {temFiltro
                ? <SearchX aria-hidden="true" className="h-5 w-5" />
                : <UsersRound aria-hidden="true" className="h-5 w-5" />}
            </div>
            <h2 className="text-base font-semibold text-foreground">
              {temFiltro ? t("noResults") : t("noUsers")}
            </h2>
            <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-muted-foreground">
              {temFiltro
                ? t("noUsersResults")
                : t("noUsersHint")}
            </p>
            {temFiltro ? (
              <Button variant="outline" size="sm" className="mt-5" onClick={onLimparFiltros}>
                {t("clearFilters")}
              </Button>
            ) : podeGerenciar ? (
              <Button size="sm" className="mt-5" onClick={onNovoUsuario}>
                {t("createFirstUser")}
              </Button>
            ) : null}
          </div>
        </TableEmptyState>
      )}
      <TablePagination
        page={page}
        pageSize={pageSize}
        totalCount={data?.total_count ?? 0}
        pageSizeOptions={pageSizeOptions}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </TableLayout>
  );
}
