import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/api/problem-details";
import { Button } from "@/shared/ui/button";
import { DrawerClose } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { SELECT_EMPTY_VALUE, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
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
    setValue,
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
      <div className="flex-1 space-y-6 overflow-y-auto px-7 py-6">
        <div className="flex flex-col">
          <Label htmlFor="nome">{t("name")}</Label>
          <Input
            id="nome"
            className="mt-2.5"
            aria-invalid={Boolean(errors.nome)}
            aria-describedby={errors.nome ? "user-name-hint user-name-error" : "user-name-hint"}
            readOnly={!podeGerenciar}
            {...register("nome")}
          />
          <p id="user-name-hint" className="mt-1.5 text-xs leading-5 text-muted-foreground">{t("userNameHint")}</p>
          {errors.nome && <p id="user-name-error" className="mt-1.5 text-sm text-destructive">{errors.nome.message}</p>}
        </div>
        <div className="flex flex-col">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            className="mt-2.5"
            type="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "user-email-hint user-email-error" : "user-email-hint"}
            readOnly={!podeGerenciar}
            {...register("email")}
          />
          <p id="user-email-hint" className="mt-1.5 text-xs leading-5 text-muted-foreground">{t("userEmailHint")}</p>
          {errors.email && <p id="user-email-error" className="mt-1.5 text-sm text-destructive">{errors.email.message}</p>}
        </div>
        {podeSelecionarPerfil && (
          <div className="flex flex-col">
            <Label htmlFor="perfil-usuario">{t("profile")}</Label>
            <Select
              value={perfilSelecionado}
              onValueChange={(value) => {
                const perfilId = value === SELECT_EMPTY_VALUE ? "" : value;
                setPerfilSelecionado(perfilId);
                if (!usuario) setValue("perfil_id", perfilId, { shouldDirty: true });
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
            >
              <SelectTrigger id="perfil-usuario" aria-describedby="user-profile-hint" className="mt-2.5">
                <SelectValue placeholder={t("standardUser")} />
              </SelectTrigger>
              <SelectContent>
              {!usuario && <SelectItem value={SELECT_EMPTY_VALUE}>{t("standardUser")}</SelectItem>}
              {usuario && perfilSelecionado && perfis.data && !perfilAtualDisponivel && (
                <SelectItem value={perfilSelecionado} disabled>
                  {t("currentProfileRestricted")}
                </SelectItem>
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
                  <SelectItem key={perfil.id} value={perfil.id}>
                    {perfil.codigo
                      ? t(`catalog.profile.${perfil.codigo}`, { defaultValue: perfil.nome })
                      : perfil.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p id="user-profile-hint" className="mt-1.5 text-xs leading-5 text-muted-foreground">{t("userProfileHint")}</p>
            {perfis.isError && <p role="alert" className="mt-1.5 text-sm text-destructive">{t("profilesLoadError")}</p>}
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
