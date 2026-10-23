import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { atribuirPerfil, listarPerfis } from "./api/perfis.api";

export function UsuarioPerfilSelect({
  usuarioId,
  perfilId,
}: {
  usuarioId: string;
  perfilId: string;
}) {
  const client = useQueryClient();
  const perfis = useQuery({ queryKey: ["perfis"], queryFn: listarPerfis });
  const perfilProtegido = perfis.data?.find((perfil) => perfil.id === perfilId)?.codigo === "ADMIN_UNIDADE";
  const atribuir = useMutation({
    mutationFn: (value: string) => atribuirPerfil(usuarioId, value),
    onSuccess: () => client.invalidateQueries({ queryKey: ["usuarios"] }),
  });

  return (
    <select
      aria-label="Perfil do usuário"
      disabled={perfis.isLoading || atribuir.isPending || perfilProtegido}
      value={perfilId}
      onChange={(event) => atribuir.mutate(event.target.value)}
      className="max-w-40 rounded-md border border-border bg-background px-2 py-1 text-sm"
    >
      {perfis.data?.filter((perfil) => perfil.codigo !== "ADMIN_UNIDADE" || perfil.id === perfilId)
        .map((perfil) => <option key={perfil.id} value={perfil.id}>{perfil.nome}</option>)}
    </select>
  );
}
