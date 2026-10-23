import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/api/problem-details";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { toast } from "@/shared/lib/toast";

import { useAtualizarUsuario, useCriarUsuario } from "../hooks/useUsuarios";
import { createUsuarioFormSchema, type Usuario, type UsuarioFormValues } from "../model/usuario";
import { listarPerfis, atribuirPerfil } from "@/modules/perfis/api/perfis.api";
import { useTranslation } from "react-i18next";

interface UsuarioFormProps {
  usuario?: Usuario;
  onSalvo: (usuario: Usuario) => void;
  podeGerenciar?: boolean;
  podeAtribuirPerfil?: boolean;
}

export function UsuarioForm({ usuario, onSalvo, podeGerenciar = true, podeAtribuirPerfil = false }: UsuarioFormProps) {
  const { t } = useTranslation();
  const criar = useCriarUsuario();
  const atualizar = useAtualizarUsuario();
  const queryClient = useQueryClient();
  const perfis = useQuery({ queryKey: ["perfis"], queryFn: listarPerfis, enabled: podeAtribuirPerfil });
  const [perfilSelecionado, setPerfilSelecionado] = useState(usuario?.perfil_id ?? "");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UsuarioFormValues>({
    resolver: zodResolver(createUsuarioFormSchema(t)),
    defaultValues: { nome: usuario?.nome ?? "", email: usuario?.email ?? "", perfil_id: usuario?.perfil_id ?? "" },
  });

  useEffect(() => setPerfilSelecionado(usuario?.perfil_id ?? ""), [usuario?.id, usuario?.perfil_id]);

  const isPending = criar.isPending || atualizar.isPending || isSubmitting;

  async function onSubmit(values: UsuarioFormValues) {
    try {
      let salvo: Usuario;
      if (usuario) {
        salvo = podeGerenciar
          ? await atualizar.mutateAsync({ id: usuario.id, body: values })
          : usuario;
        if (podeAtribuirPerfil && perfilSelecionado && perfilSelecionado !== usuario.perfil_id) {
          await atribuirPerfil(usuario.id, perfilSelecionado);
          await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
          salvo = { ...salvo, perfil_id: perfilSelecionado };
        }
      } else {
        salvo = await criar.mutateAsync({ ...values, perfil_id: values.perfil_id || undefined });
      }
      onSalvo(salvo);
    } catch (error) {
      if (error instanceof ApiError) {
        let aplicado = false;
        for (const campoErro of error.problem.errors ?? []) {
          if (campoErro.campo === "nome" || campoErro.campo === "email") {
            setError(campoErro.campo, { message: t(campoErro.campo === "nome" ? "invalidName" : "emailInUse") });
            aplicado = true;
          }
        }
        if (!aplicado) toast.error(t("userSaveError"));
      } else {
        toast.error(t("userSaveError"));
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="nome">{t("name")}</Label>
        <Input id="nome" readOnly={!podeGerenciar} {...register("nome")} />
        {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" type="email" readOnly={!podeGerenciar} {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      {podeAtribuirPerfil && (
        <div className="space-y-1.5">
          <Label htmlFor="perfil-usuario">{t("profile")}</Label>
          <select
            id="perfil-usuario"
            aria-label={t("userProfile")}
            value={usuario ? perfilSelecionado : undefined}
            {...(!usuario ? register("perfil_id") : {})}
            onChange={(event) => {
              setPerfilSelecionado(event.target.value);
              if (!usuario) register("perfil_id").onChange(event);
            }}
            disabled={perfis.isLoading || isPending || Boolean(usuario && perfis.data?.find((perfil) => perfil.id === usuario.perfil_id)?.codigo === "ADMIN_UNIDADE")}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!usuario && <option value="">{t("standardUser")}</option>}
            {perfis.data?.filter((perfil) => perfil.codigo !== "ADMIN_UNIDADE" || perfil.id === usuario?.perfil_id)
              .map((perfil) => <option key={perfil.id} value={perfil.id}>{perfil.codigo ? t(`catalog.profile.${perfil.codigo}`, { defaultValue: perfil.nome }) : perfil.nome}</option>)}
          </select>
          {perfis.isError && <p role="alert" className="text-sm text-destructive">{t("profilesLoadError")}</p>}
        </div>
      )}
      <Button type="submit" disabled={isPending || !podeGerenciar && perfilSelecionado === usuario?.perfil_id}>
        {isPending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
