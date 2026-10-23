import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/api/problem-details";
import { Button } from "@/shared/ui/button";
import { DrawerClose } from "@/shared/ui/dialog";
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
  podeAtribuirPerfilKP?: boolean;
}

export function UsuarioForm({
  usuario,
  onSalvo,
  podeGerenciar = true,
  podeAtribuirPerfil = false,
  podeAtribuirPerfilKP = false,
}: UsuarioFormProps) {
  const { t } = useTranslation();
  const criar = useCriarUsuario();
  const atualizar = useAtualizarUsuario();
  const queryClient = useQueryClient();
  const podeSelecionarPerfil = podeAtribuirPerfil || podeAtribuirPerfilKP;
  const perfis = useQuery({
    queryKey: ["perfis"],
    queryFn: listarPerfis,
    enabled: podeSelecionarPerfil,
  });
  const [perfilSelecionado, setPerfilSelecionado] = useState(usuario?.perfil_id ?? "");
  const perfilAtualDisponivel = perfis.data?.some((perfil) => perfil.id === perfilSelecionado);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UsuarioFormValues>({
    resolver: zodResolver(createUsuarioFormSchema(t)),
    defaultValues: {
      nome: usuario?.nome ?? "",
      email: usuario?.email ?? "",
      perfil_id: usuario?.perfil_id ?? "",
    },
  });

  useEffect(
    () => setPerfilSelecionado(usuario?.perfil_id ?? ""),
    [usuario?.id, usuario?.perfil_id],
  );

  const isPending = criar.isPending || atualizar.isPending || isSubmitting;

  async function onSubmit(values: UsuarioFormValues) {
    try {
      let salvo: Usuario;
      if (usuario) {
        salvo = podeGerenciar
          ? await atualizar.mutateAsync({ id: usuario.id, body: values })
          : usuario;
        if (
          podeSelecionarPerfil &&
          perfilSelecionado &&
          perfilSelecionado !== usuario.perfil_id
        ) {
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
            setError(campoErro.campo, {
              message: t(campoErro.campo === "nome" ? "invalidName" : "emailInUse"),
            });
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
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
        <div className="space-y-2">
          <Label htmlFor="nome">{t("name")}</Label>
          <Input
            id="nome"
            aria-invalid={Boolean(errors.nome)}
            readOnly={!podeGerenciar}
            {...register("nome")}
          />
          {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            aria-invalid={Boolean(errors.email)}
            readOnly={!podeGerenciar}
            {...register("email")}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        {podeSelecionarPerfil && (
          <div className="space-y-2">
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
              disabled={
                perfis.isLoading ||
                isPending ||
                Boolean(
                  usuario &&
                    perfis.data?.find((perfil) => perfil.id === usuario.perfil_id)?.codigo ===
                      "ADMIN_UNIDADE",
                )
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {!usuario && <option value="">{t("standardUser")}</option>}
              {usuario && perfilSelecionado && perfis.data && !perfilAtualDisponivel && (
                <option value={perfilSelecionado} disabled>
                  {t("currentProfileRestricted")}
                </option>
              )}
              {perfis.data
                ?.filter(
                  (perfil) =>
                    (perfil.codigo !== "ADMIN_UNIDADE" || perfil.id === usuario?.perfil_id) &&
                    (podeAtribuirPerfil ||
                      !podeAtribuirPerfilKP ||
                      ["KP", "USUARIO_PADRAO"].includes(perfil.codigo ?? "")) &&
                    (Boolean(usuario) || perfil.codigo !== "USUARIO_PADRAO"),
                )
                .map((perfil) => (
                  <option key={perfil.id} value={perfil.id}>
                    {perfil.codigo
                      ? t(`catalog.profile.${perfil.codigo}`, { defaultValue: perfil.nome })
                      : perfil.nome}
                  </option>
                ))}
            </select>
            {perfis.isError && <p role="alert" className="text-sm text-destructive">{t("profilesLoadError")}</p>}
          </div>
        )}
      </div>
      <div className="flex shrink-0 justify-end border-t border-border bg-white px-7 py-5">
        <div className="flex gap-2">
          <DrawerClose asChild><Button type="button" variant="outline">{t("cancel")}</Button></DrawerClose>
          <Button type="submit" disabled={isPending || !podeGerenciar && perfilSelecionado === usuario?.perfil_id}>
            {isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </form>
  );
}
