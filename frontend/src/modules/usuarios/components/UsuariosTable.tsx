import { Badge } from "@/shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow } from "@/shared/ui/table";
import { TableColumnFilter } from "@/shared/ui/table-column-filter";
import { listarPerfis } from "@/modules/perfis/api/perfis.api";
import { useQuery } from "@tanstack/react-query";

import type { UsuarioFiltros } from "../api/usuario.api";
import { useUsuariosList } from "../hooks/useUsuarios";
import type { Usuario } from "../model/usuario";
import { UsuarioActionsMenu } from "./UsuarioActionsMenu";

interface UsuariosTableProps {
  page: number;
  pageSize: number;
  pageSizeOptions: number[];
  filtros: UsuarioFiltros;
  onFiltroChange: (campo: "nome" | "email" | "ativo" | "perfil", valor: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onEditar: (usuario: Usuario) => void;
  onEditarPerfil: (usuario: Usuario) => void;
  podeGerenciar?: boolean;
  podeAtribuirPerfil?: boolean;
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
  onEditarPerfil,
  podeGerenciar = false,
  podeAtribuirPerfil = false,
}: UsuariosTableProps) {
  const { data, isLoading } = useUsuariosList(page, pageSize, filtros);
  const perfis = useQuery({
    queryKey: ["perfis"],
    queryFn: listarPerfis,
    enabled: podeAtribuirPerfil,
  });
  const mostrarAcoes = podeGerenciar || podeAtribuirPerfil;

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const items = data?.items ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Table containerClassName="min-h-0 flex-1 overflow-auto">
        <TableHeader>
          <TableRow>
            <TableHead>
              <TableColumnFilter
                label="Usuário"
                value={filtros.nome ?? ""}
                onChange={(valor) => onFiltroChange("nome", valor)}
                placeholder="Buscar por nome"
              />
            </TableHead>
            <TableHead>
              <TableColumnFilter
                label="E-mail"
                value={filtros.email ?? ""}
                onChange={(valor) => onFiltroChange("email", valor)}
                placeholder="Buscar por e-mail"
              />
            </TableHead>
            <TableHead>
              <TableColumnFilter
                label="Status"
                value={filtros.ativo === undefined ? "" : String(filtros.ativo)}
                onChange={(valor) => onFiltroChange("ativo", valor)}
                options={[
                  { value: "", label: "Todos" },
                  { value: "true", label: "Ativo" },
                  { value: "false", label: "Inativo" },
                ]}
              />
            </TableHead>
            {podeAtribuirPerfil && (
              <TableHead>
                <TableColumnFilter
                  label="Perfil"
                  value={filtros.sem_perfil ? "__sem_perfil__" : filtros.perfil_id ?? ""}
                  onChange={(valor) => onFiltroChange("perfil", valor)}
                  options={[
                    { value: "", label: "Todos" },
                    { value: "__sem_perfil__", label: "Sem perfil" },
                    ...(perfis.data ?? []).map((perfil) => ({ value: perfil.id, label: perfil.nome })),
                  ]}
                />
              </TableHead>
            )}
            {mostrarAcoes && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={3 + Number(mostrarAcoes) + Number(podeAtribuirPerfil)} className="py-8 text-center text-xs text-muted-foreground">
                Nenhum usuário cadastrado.
              </TableCell>
            </TableRow>
          )}
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
                  {usuario.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              {podeAtribuirPerfil && (
                <TableCell className="text-sm text-muted-foreground">
                  {usuario.perfil_id
                    ? perfis.data?.find((perfil) => perfil.id === usuario.perfil_id)?.nome ?? "—"
                    : "Sem perfil"}
                </TableCell>
              )}
              {mostrarAcoes && <TableCell>
                <UsuarioActionsMenu
                  usuario={usuario}
                  onEditar={onEditar}
                  onEditarPerfil={onEditarPerfil}
                  podeAtribuirPerfil={podeAtribuirPerfil}
                  podeGerenciar={podeGerenciar}
                />
              </TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        page={page}
        pageSize={pageSize}
        totalCount={data?.total_count ?? 0}
        pageSizeOptions={pageSizeOptions}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
