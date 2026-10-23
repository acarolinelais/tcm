import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

import { useAtivarUsuario, useInativarUsuario } from "../hooks/useUsuarios";
import type { Usuario } from "../model/usuario";

export function UsuarioToggleAtivo({ usuario }: { usuario: Usuario }) {
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  const ativar = useAtivarUsuario();
  const inativar = useInativarUsuario();

  if (usuario.ativo) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          disabled={inativar.isPending}
          onClick={() => setConfirmacaoAberta(true)}
        >
          Inativar
        </Button>
        <ConfirmDialog
          open={confirmacaoAberta}
          onOpenChange={setConfirmacaoAberta}
          title="Inativar usuário?"
          description={`Tem certeza que deseja inativar o usuário “${usuario.nome}”?`}
          confirmLabel="Inativar usuário"
          variant="destructive"
          isPending={inativar.isPending}
          onConfirm={() => {
            inativar.mutate(usuario.id);
            setConfirmacaoAberta(false);
          }}
        />
      </>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={ativar.isPending}
      onClick={() => ativar.mutate(usuario.id)}
    >
      Ativar
    </Button>
  );
}
