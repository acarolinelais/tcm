import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { usuarioApi } from "../api/usuario.api";

export function useUsuariosList(page: number, pageSize: number) {
  return useQuery({
    queryKey: ["usuarios", page, pageSize],
    queryFn: () => usuarioApi.listar(page, pageSize),
    placeholderData: (prev) => prev,
  });
}

export function useCriarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usuarioApi.criar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}

export function useAtualizarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof usuarioApi.atualizar>[1] }) =>
      usuarioApi.atualizar(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}

export function useAtivarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usuarioApi.ativar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}

export function useInativarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usuarioApi.inativar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}
