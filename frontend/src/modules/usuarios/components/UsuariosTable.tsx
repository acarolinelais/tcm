import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

import { useUsuariosList } from "../hooks/useUsuarios";
import type { Usuario } from "../model/usuario";
import { UsuarioToggleAtivo } from "./UsuarioToggleAtivo";

interface UsuariosTableProps {
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onEditar: (usuario: Usuario) => void;
}

export function UsuariosTable({ page, pageSize, onPageChange, onEditar }: UsuariosTableProps) {
  const { data, isLoading } = useUsuariosList(page, pageSize);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const items = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total_count / pageSize)) : 1;

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nenhum usuário cadastrado.
              </TableCell>
            </TableRow>
          )}
          {items.map((usuario) => (
            <TableRow key={usuario.id}>
              <TableCell>{usuario.nome}</TableCell>
              <TableCell>{usuario.email}</TableCell>
              <TableCell>
                <Badge variant={usuario.ativo ? "default" : "secondary"}>
                  {usuario.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => onEditar(usuario)}>
                  Editar
                </Button>
                <UsuarioToggleAtivo usuario={usuario} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          Página {page} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
