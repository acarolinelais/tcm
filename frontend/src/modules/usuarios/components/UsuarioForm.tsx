import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { ApiError } from "@/shared/api/problem-details";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { toast } from "@/shared/lib/toast";

import { useAtualizarUsuario, useCriarUsuario } from "../hooks/useUsuarios";
import { type Usuario, type UsuarioFormValues, usuarioFormSchema } from "../model/usuario";

interface UsuarioFormProps {
  usuario?: Usuario;
  onSalvo: (usuario: Usuario) => void;
}

export function UsuarioForm({ usuario, onSalvo }: UsuarioFormProps) {
  const criar = useCriarUsuario();
  const atualizar = useAtualizarUsuario();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioFormSchema),
    defaultValues: { nome: usuario?.nome ?? "", email: usuario?.email ?? "" },
  });

  const isPending = criar.isPending || atualizar.isPending;

  async function onSubmit(values: UsuarioFormValues) {
    try {
      const salvo = usuario
        ? await atualizar.mutateAsync({ id: usuario.id, body: values })
        : await criar.mutateAsync(values);
      onSalvo(salvo);
    } catch (error) {
      if (error instanceof ApiError) {
        let aplicado = false;
        for (const campoErro of error.problem.errors ?? []) {
          if (campoErro.campo === "nome" || campoErro.campo === "email") {
            setError(campoErro.campo, { message: campoErro.mensagem });
            aplicado = true;
          }
        }
        if (!aplicado) toast.error(error.problem.detail ?? error.problem.title);
      } else {
        toast.error("Não foi possível salvar o usuário.");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" {...register("nome")} />
        {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
