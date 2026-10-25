import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { ApiError } from "@/shared/api/problem-details";
import { toast } from "@/shared/lib/toast";
import { Button } from "@/shared/ui/button";
import { DrawerClose } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

import { useAtualizarModeloDispositivo, useCriarModeloDispositivo } from "../hooks/useModelosDispositivo";
import {
  createModeloDispositivoFormSchema,
  DESCRICAO_MAX_LENGTH,
  NOME_MAX_LENGTH,
  type ModeloDispositivo,
  type ModeloDispositivoFormValues,
} from "../model/modelo-dispositivo";

interface ModeloDispositivoFormProps {
  modelo?: ModeloDispositivo;
  onSalvo: (modelo: ModeloDispositivo) => void;
}

export function ModeloDispositivoForm({ modelo, onSalvo }: ModeloDispositivoFormProps) {
  const { t } = useTranslation();
  const criar = useCriarModeloDispositivo();
  const atualizar = useAtualizarModeloDispositivo();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ModeloDispositivoFormValues>({
    resolver: zodResolver(createModeloDispositivoFormSchema(t)),
    defaultValues: { nome: modelo?.nome ?? "", descricao: modelo?.descricao ?? "" },
  });
  const isPending = criar.isPending || atualizar.isPending || isSubmitting;

  async function onSubmit(values: ModeloDispositivoFormValues) {
    try {
      onSalvo(modelo ? await atualizar.mutateAsync({ id: modelo.id, body: values }) : await criar.mutateAsync(values));
    } catch (error) {
      if (error instanceof ApiError && error.problem.status === 409) {
        setError("nome", { message: t("deviceModelNameInUse") });
      } else {
        toast.error(t("deviceModelSaveError"));
      }
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
      <div className="thin-scroll flex-1 space-y-6 overflow-y-auto px-7 py-6">
        <div className="flex flex-col">
          <Label htmlFor="device-model-name">{t("deviceModelName")}</Label>
          <Input
            id="device-model-name"
            className="mt-2.5"
            maxLength={NOME_MAX_LENGTH}
            aria-invalid={Boolean(errors.nome)}
            aria-describedby={errors.nome ? "device-model-name-error" : undefined}
            {...register("nome")}
          />
          {errors.nome && <p id="device-model-name-error" role="alert" className="mt-1.5 text-sm text-destructive">{errors.nome.message}</p>}
        </div>
        <div className="flex flex-col">
          <Label htmlFor="device-model-description">{t("description")}</Label>
          <Input
            id="device-model-description"
            className="mt-2.5"
            maxLength={DESCRICAO_MAX_LENGTH}
            aria-invalid={Boolean(errors.descricao)}
            aria-describedby={errors.descricao ? "device-model-description-error" : "device-model-description-hint"}
            {...register("descricao")}
          />
          {errors.descricao
            ? <p id="device-model-description-error" role="alert" className="mt-1.5 text-sm text-destructive">{errors.descricao.message}</p>
            : <p id="device-model-description-hint" className="mt-1.5 text-xs leading-5 text-muted-foreground">{t("deviceModelDescriptionHint")}</p>}
        </div>
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-border px-7 py-5">
        <DrawerClose asChild><Button type="button" variant="outline">{t("cancel")}</Button></DrawerClose>
        <Button type="submit" disabled={isPending}>{isPending ? t("saving") : t("save")}</Button>
      </div>
    </form>
  );
}
