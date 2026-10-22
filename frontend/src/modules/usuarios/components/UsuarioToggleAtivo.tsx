import { Button } from "@/shared/ui/button";

import { useAtivarUsuario, useInativarUsuario } from "../hooks/useUsuarios";
import type { Usuario } from "../model/usuario";

export function UsuarioToggleAtivo({ usuario }: { usuario: Usuario }) {
  const ativar = useAtivarUsuario();
  const inativar = useInativarUsuario();

  if (usuario.ativo) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={inativar.isPending}
        onClick={() => {
          if (confirm(`Inativar o usuário "${usuario.nome}"?`)) {
            inativar.mutate(usuario.id);
          }
        }}
      >
        Inativar
      </Button>
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
