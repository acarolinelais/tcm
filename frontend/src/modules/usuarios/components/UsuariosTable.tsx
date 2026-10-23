import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow } from "@/shared/ui/table";
import { TableColumnFilter } from "@/shared/ui/table-column-filter";
import { listarPerfis } from "@/modules/perfis/api/perfis.api";
import { useQuery } from "@tanstack/react-query";
import { SearchX, UsersRound } from "lucide-react";

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
  onNovoUsuario: () => void;
  onLimparFiltros: () => void;
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
  onNovoUsuario,
  onLimparFiltros,
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
  const temFiltro = Boolean(
    filtros.nome || filtros.email || filtros.ativo !== undefined || filtros.perfil_id,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Table containerClassName={items.length > 0 ? "min-h-0 flex-1 overflow-auto" : "shrink-0 overflow-visible"}>
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
                  value={filtros.perfil_id ?? ""}
                  onChange={(valor) => onFiltroChange("perfil", valor)}
                  options={[
                    { value: "", label: "Todos" },
                    ...(perfis.data ?? []).map((perfil) => ({ value: perfil.id, label: perfil.nome })),
                  ]}
                />
              </TableHead>
            )}
            {mostrarAcoes && <TableHead>Ações</TableHead>}
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
                  {usuario.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              {podeAtribuirPerfil && (
                <TableCell className="text-sm text-muted-foreground">
                  {perfis.data?.find((perfil) => perfil.id === usuario.perfil_id)?.nome ?? "—"}
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
        </TableBody>}
      </Table>
      {items.length === 0 && (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl bg-secondary/30 px-4 py-6">
          <div role="status" className="w-full max-w-md text-center">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              {temFiltro
                ? <SearchX aria-hidden="true" className="h-5 w-5" />
                : <UsersRound aria-hidden="true" className="h-5 w-5" />}
            </div>
            <h2 className="text-base font-semibold text-foreground">
              {temFiltro ? "Nenhum resultado encontrado" : "Nenhum usuário cadastrado"}
            </h2>
            <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-muted-foreground">
              {temFiltro
                ? "Não encontramos usuários que correspondam aos filtros selecionados."
                : "Adicione o primeiro usuário para começar a gerenciar os acessos da unidade."}
            </p>
            {temFiltro ? (
              <Button variant="outline" size="sm" className="mt-5" onClick={onLimparFiltros}>
                Limpar filtros
              </Button>
            ) : podeGerenciar ? (
              <Button size="sm" className="mt-5" onClick={onNovoUsuario}>
                Cadastrar usuário
              </Button>
            ) : null}
          </div>
        </div>
      )}
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
