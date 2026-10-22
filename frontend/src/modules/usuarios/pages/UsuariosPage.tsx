import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { toast } from "@/shared/lib/toast";

import { UsuarioForm } from "../components/UsuarioForm";
import { UsuariosTable } from "../components/UsuariosTable";
import type { Usuario } from "../model/usuario";

const PAGE_SIZE = 20;

export function UsuariosPage() {
  const [page, setPage] = useState(1);
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<Usuario | undefined>();

  function abrirCriar() {
    setUsuarioEmEdicao(undefined);
    setModalAberto(true);
  }

  function abrirEditar(usuario: Usuario) {
    setUsuarioEmEdicao(usuario);
    setModalAberto(true);
  }

  function aoSalvar() {
    setModalAberto(false);
    toast.success(usuarioEmEdicao ? "Usuário atualizado." : "Usuário cadastrado.");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Usuários</h1>
        <Button onClick={abrirCriar}>Novo usuário</Button>
      </div>

      <UsuariosTable page={page} pageSize={PAGE_SIZE} onPageChange={setPage} onEditar={abrirEditar} />

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{usuarioEmEdicao ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          </DialogHeader>
          <UsuarioForm usuario={usuarioEmEdicao} onSalvo={aoSalvar} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
