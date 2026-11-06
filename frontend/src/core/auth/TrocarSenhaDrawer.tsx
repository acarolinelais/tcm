import { zodResolver } from "@hookform/resolvers/zod";
import { useLayoutEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { ApiError } from "@/shared/api/problem-details";
import { toast } from "@/shared/lib/toast";
import { TextInputField } from "@/shared/ui/form-field";
import { DrawerFormActions, SideDrawer } from "@/shared/ui/side-drawer";

import { alterarPropriaSenha } from "./api";

const criarSchema = (t: (key: string) => string) => z.object({
  senhaAtual: z.string().min(1, t("passwordRequired")),
  novaSenha: z.string().min(1, t("passwordRequired")).max(128),
  confirmacao: z.string().min(1, t("passwordRequired")),
}).refine((valores) => valores.novaSenha === valores.confirmacao, { path: ["confirmacao"], message: t("passwordsMismatch") });

type Valores = z.infer<ReturnType<typeof criarSchema>>;
const vazio: Valores = { senhaAtual: "", novaSenha: "", confirmacao: "" };

/** Troca da própria senha pelo menu da conta (spec 042): as outras sessões caem, esta continua. */
export function TrocarSenhaDrawer({ isOpen, onFechar }: { isOpen: boolean; onFechar: () => void }) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<Valores>({
    resolver: zodResolver(criarSchema(t)),
    defaultValues: vazio,
  });

  useLayoutEffect(() => { if (isOpen) reset(vazio); }, [isOpen, reset]);

  async function salvar({ senhaAtual, novaSenha }: Valores) {
    try {
      await alterarPropriaSenha(senhaAtual, novaSenha);
      toast.success(t("passwordChanged"));
      onFechar();
    } catch (error) {
      if (error instanceof ApiError && error.problem.status === 422) {
        setError("senhaAtual", { message: t("currentPasswordIncorrect") });
      } else {
        toast.error(t("passwordChangeError"));
      }
    }
  }

  const campo = (nome: keyof Valores, label: string, autoComplete: string) => (
    <Controller
      control={control}
      name={nome}
      render={({ field }) => (
        <TextInputField ref={field.ref} label={label} type="password" name={nome} autoComplete={autoComplete} value={field.value} onChange={field.onChange} error={errors[nome]?.message} isRequired />
      )}
    />
  );

  return (
    <SideDrawer
      isOpen={isOpen}
      isPending={isSubmitting}
      onOpenChange={(aberto) => { if (!aberto) onFechar(); }}
      title={t("changePassword")}
      onSubmit={() => void handleSubmit(salvar)()}
      footer={<DrawerFormActions onCancel={onFechar} submitLabel={t("savePassword")} pendingLabel={t("saving")} isPending={isSubmitting} />}
    >
      <div className="space-y-6 px-7 py-6">
        {campo("senhaAtual", t("currentPassword"), "current-password")}
        {campo("novaSenha", t("newPassword"), "new-password")}
        {campo("confirmacao", t("confirmPassword"), "new-password")}
      </div>
    </SideDrawer>
  );
}
