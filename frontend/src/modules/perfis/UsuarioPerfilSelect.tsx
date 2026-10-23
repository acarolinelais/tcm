import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { atribuirPerfil, listarPerfis } from "./api/perfis.api";

export function UsuarioPerfilSelect({
  usuarioId,
  perfilId,
}: {
  usuarioId: string;
  perfilId: string | null;
}) {
  const client = useQueryClient();
  const perfis = useQuery({ queryKey: ["perfis"], queryFn: listarPerfis });
  const atribuir = useMutation({
    mutationFn: (value: string | null) => atribuirPerfil(usuarioId, value),
    onSuccess: () => client.invalidateQueries({ queryKey: ["usuarios"] }),
  });

  return (
    <select
      aria-label="Perfil do usuário"
      disabled={perfis.isLoading || atribuir.isPending}
      value={perfilId ?? ""}
      onChange={(event) => atribuir.mutate(event.target.value || null)}
      className="max-w-40 rounded-md border border-border bg-background px-2 py-1 text-sm"
    >
      <option value="">Sem perfil</option>
      {perfis.data?.map((perfil) => <option key={perfil.id} value={perfil.id}>{perfil.nome}</option>)}
    </select>
  );
}
