import { useLayoutEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { ApiError } from "@/shared/api/problem-details";
import { toast } from "@/shared/lib/toast";
import { SelectField, TextInputField, type SelectOption } from "@/shared/ui/form-field";
import { DrawerFormActions, SideDrawer } from "@/shared/ui/side-drawer";
import { listarPerfis, atribuirPerfil } from "@/modules/perfis/api/perfis.api";

import { useAtualizarUsuario, useCriarUsuario } from "../hooks/useUsuarios";
import { createUsuarioFormSchema, type Usuario, type UsuarioFormValues } from "../model/usuario";

interface UsuarioDrawerProps {
  isOpen: boolean;
  /** Sem usuário, o painel cria um novo. */
  usuario?: Usuario;
  onFechar: () => void;
  onSalvo: (usuario: Usuario) => void;
  podeGerenciar?: boolean;
  podeAtribuirPerfil?: boolean;
  podeAtribuirPerfilKP?: boolean;
}

const valoresIniciais = (usuario?: Usuario): UsuarioFormValues => ({
  nome: usuario?.nome ?? "",
  email: usuario?.email ?? "",
  user_id: usuario?.user_id ?? "",
  perfil_id: usuario?.perfil_id ?? "",
});

/** Painel de criar e editar usuário, com o perfil quando quem edita pode atribuí-lo. */
export function UsuarioDrawer({
  isOpen,
  usuario,
  onFechar,
  onSalvo,
  podeGerenciar = true,
  podeAtribuirPerfil = false,
  podeAtribuirPerfilKP = false,
}: UsuarioDrawerProps) {
  const { t } = useTranslation();
  const criar = useCriarUsuario();
  const atualizar = useAtualizarUsuario();
  const queryClient = useQueryClient();
  const podeSelecionarPerfil = podeAtribuirPerfil || podeAtribuirPerfilKP;
  const perfis = useQuery({ queryKey: ["perfis"], queryFn: listarPerfis, enabled: podeSelecionarPerfil });
  const [perfilSelecionado, setPerfilSelecionado] = useState(usuario?.perfil_id ?? "");
  const { control, handleSubmit, setError, setValue, reset, formState: { errors, isSubmitting } } = useForm<UsuarioFormValues>({
    resolver: zodResolver(createUsuarioFormSchema(t)),
    defaultValues: valoresIniciais(usuario),
  });

  // Cada abertura começa com os dados do usuário (ou vazia, no novo), antes da pintura: sem mostrar o rascunho antigo.
  useLayoutEffect(() => {
    if (!isOpen) return;
    reset(valoresIniciais(usuario));
    setPerfilSelecionado(usuario?.perfil_id ?? "");
  }, [isOpen, usuario, reset]);

  const isPending = criar.isPending || atualizar.isPending || isSubmitting;
  const perfilAtualDisponivel = perfis.data?.some((perfil) => perfil.id === perfilSelecionado);
  const ehAdministrador = Boolean(usuario && (usuario.perfil_codigo === "ADMIN_UNIDADE"
    || perfis.data?.find((perfil) => perfil.id === usuario.perfil_id)?.codigo === "ADMIN_UNIDADE"));
  const nomeDoPerfil = (codigo: string | null | undefined, nome: string | null | undefined) =>
    codigo ? t(`catalog.profile.${codigo}`, { defaultValue: nome ?? t("currentProfileRestricted") }) : nome ?? t("currentProfileRestricted");
  const opcoesDePerfil: SelectOption[] = [
    // O perfil atual fora do escopo de quem edita aparece marcado e indisponível (spec 031, RN-06).
    ...(usuario && perfilSelecionado && perfis.data && !perfilAtualDisponivel
      ? [{ value: perfilSelecionado, label: nomeDoPerfil(usuario.perfil_codigo, usuario.perfil_nome), isDisabled: true }]
      : []),
    ...(perfis.data ?? [])
      .filter((perfil) =>
        (perfil.codigo !== "ADMIN_UNIDADE" || perfil.id === usuario?.perfil_id)
        && (podeAtribuirPerfil || !podeAtribuirPerfilKP || ["KP", "USUARIO_PADRAO"].includes(perfil.codigo ?? ""))
        && (Boolean(usuario) || perfil.codigo !== "USUARIO_PADRAO"))
      .map((perfil) => ({ value: perfil.id, label: nomeDoPerfil(perfil.codigo, perfil.nome) })),
  ];

  async function salvar(values: UsuarioFormValues) {
    try {
      let salvo: Usuario;
      if (usuario) {
        salvo = podeGerenciar ? await atualizar.mutateAsync({ id: usuario.id, body: values }) : usuario;
        if (podeSelecionarPerfil && perfilSelecionado && perfilSelecionado !== usuario.perfil_id) {
          await atribuirPerfil(usuario.id, perfilSelecionado);
          await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
          salvo = { ...salvo, perfil_id: perfilSelecionado };
        }
      } else {
        salvo = await criar.mutateAsync({ ...values, perfil_id: values.perfil_id || undefined });
      }
      onSalvo(salvo);
    } catch (error) {
      if (!(error instanceof ApiError)) return toast.error(t("userSaveError"));
      let aplicado = false;
      for (const campoErro of error.problem.errors ?? []) {
        if (campoErro.campo === "nome" || campoErro.campo === "email") {
          setError(campoErro.campo, { message: t(campoErro.campo === "nome" ? "invalidName" : "emailInUse") });
          aplicado = true;
        } else if (campoErro.campo === "user_id") {
          setError("user_id", { message: t("userIdInUse") });
          aplicado = true;
        }
      }
      if (!aplicado) toast.error(t("userSaveError"));
    }
  }

  const campoDeTexto = (nome: "nome" | "email" | "user_id", label: string, type?: "email") => (
    <Controller
      control={control}
      name={nome}
      render={({ field }) => (
        <TextInputField ref={field.ref} label={label} value={field.value ?? ""} onChange={field.onChange} error={errors[nome]?.message} isReadOnly={!podeGerenciar} type={type} name={nome} />
      )}
    />
  );

  return (
    <SideDrawer
      isPending={isPending}
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onFechar(); }}
      title={usuario ? t("editUser") : t("newUser")}
      onSubmit={() => void handleSubmit(salvar)()}
      footer={<DrawerFormActions pendingLabel={t("saving")}
        onCancel={onFechar}
        submitLabel={t("save")}
        isPending={isPending}
        isSubmitDisabled={!podeGerenciar && perfilSelecionado === usuario?.perfil_id}
      />}
    >
      <div className="space-y-6 px-7 py-6">
        {campoDeTexto("nome", t("name"))}
        {campoDeTexto("email", t("email"), "email")}
        {campoDeTexto("user_id", t("userId"))}
        {podeSelecionarPerfil && (
          <SelectField
            label={t("profile")}
            value={perfilSelecionado}
            onChange={(perfilId) => {
              setPerfilSelecionado(perfilId);
              if (!usuario) setValue("perfil_id", perfilId, { shouldDirty: true });
            }}
            options={opcoesDePerfil}
            emptyOption={usuario ? undefined : t("standardUser")}
            placeholder={t("standardUser")}
            description={t("userProfileHint")}
            isDisabled={perfis.isLoading || isPending || ehAdministrador}
          />
        )}
        {/* Falha ao carregar a lista não é erro do valor escolhido: o aviso fica à parte e a dica continua. */}
        {podeSelecionarPerfil && perfis.isError && <p role="alert" className="-mt-4 text-[12px] text-danger">{t("profilesLoadError")}</p>}
      </div>
    </SideDrawer>
  );
}
