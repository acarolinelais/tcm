import { useLayoutEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { ApiError } from "@/shared/api/problem-details";
import { toast } from "@/shared/lib/toast";
import { TextInputField } from "@/shared/ui/form-field";
import { DrawerFormActions, SideDrawer } from "@/shared/ui/side-drawer";

import { useAtualizarModeloDispositivo, useCriarModeloDispositivo } from "../hooks/useModelosDispositivo";
import {
  createModeloDispositivoFormSchema,
  DESCRICAO_MAX_LENGTH,
  NOME_MAX_LENGTH,
  type ModeloDispositivo,
  type ModeloDispositivoFormValues,
} from "../model/modelo-dispositivo";

const valoresIniciais = (modelo?: ModeloDispositivo | null) => ({ nome: modelo?.nome ?? "", descricao: modelo?.descricao ?? "" });

/**
 * Painel de criar (`modelo` nulo) e editar modelo de dispositivo; `undefined` mantém o painel fechado.
 * Cada abertura começa com os dados salvos.
 */
export function ModeloDispositivoDrawer({ modelo, onFechar, onSalvo }: {
  modelo: ModeloDispositivo | null | undefined;
  onFechar: () => void;
  onSalvo: (modelo: ModeloDispositivo) => void;
}) {
  const { t } = useTranslation();
  const criar = useCriarModeloDispositivo();
  const atualizar = useAtualizarModeloDispositivo();
  const { control, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<ModeloDispositivoFormValues>({
    resolver: zodResolver(createModeloDispositivoFormSchema(t)),
    defaultValues: valoresIniciais(modelo),
  });
  // O título e o modo ficam no último aberto durante a animação de saída.
  const [exibido, setExibido] = useState(modelo);
  const [anterior, setAnterior] = useState(modelo);
  if (modelo !== anterior) {
    setAnterior(modelo);
    if (modelo !== undefined) setExibido(modelo);
  }
  // O reset mexe no estado do react-hook-form: fica fora do render, antes da pintura, sem mostrar o rascunho antigo.
  useLayoutEffect(() => {
    if (modelo !== undefined) reset(valoresIniciais(modelo));
  }, [modelo, reset]);
  const isPending = criar.isPending || atualizar.isPending || isSubmitting;

  async function salvar(values: ModeloDispositivoFormValues) {
    try {
      onSalvo(exibido ? await atualizar.mutateAsync({ id: exibido.id, body: values }) : await criar.mutateAsync(values));
    } catch (error) {
      if (!(error instanceof ApiError)) return toast.error(t("deviceModelSaveError"));
      if (error.problem.status === 409) return setError("nome", { message: t("deviceModelNameInUse") });
      // 422 do backend (ADR 0006): `campo` vem como "body.nome"; marca os campos do formulário apontados.
      const campos = (error.problem.errors ?? []).map((erro) => erro.campo.split(".").pop()).filter((campo) => campo === "nome" || campo === "descricao");
      if (!campos.length) return toast.error(t("deviceModelSaveError"));
      for (const campo of campos) setError(campo, { message: t(campo === "nome" ? "deviceModelNameMax" : "deviceModelDescriptionMax") });
    }
  }

  return (
    <SideDrawer
      isPending={isPending}
      isOpen={modelo !== undefined}
      onOpenChange={(open) => { if (!open) onFechar(); }}
      title={exibido ? t("editDeviceModel") : t("addDeviceModel")}
      onSubmit={() => void handleSubmit(salvar)()}
      footer={<DrawerFormActions pendingLabel={t("saving")} onCancel={onFechar} submitLabel={t("save")} isPending={isPending} />}
    >
      <div className="space-y-6 px-7 py-6">
        <Controller
          control={control}
          name="nome"
          render={({ field }) => <TextInputField ref={field.ref} label={t("deviceModelName")} value={field.value} onChange={field.onChange} error={errors.nome?.message} maxLength={NOME_MAX_LENGTH} isRequired autoFocus />}
        />
        <Controller
          control={control}
          name="descricao"
          render={({ field }) => <TextInputField ref={field.ref} label={t("description")} value={field.value} onChange={field.onChange} error={errors.descricao?.message} description={t("deviceModelDescriptionHint")} maxLength={DESCRICAO_MAX_LENGTH} />}
        />
      </div>
    </SideDrawer>
  );
}
