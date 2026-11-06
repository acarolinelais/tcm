import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { toast } from "@/shared/lib/toast";
import { TextInputField } from "@/shared/ui/form-field";
import { DrawerFormActions, SideDrawer } from "@/shared/ui/side-drawer";
import { timesApi } from "../api/times.api";

/** Painel de renomear o time. Cada abertura começa do nome atual. */
export function EditarTimeDrawer({ isOpen, onOpenChange, timeId, nomeAtual }: { isOpen: boolean; onOpenChange: (open: boolean) => void; timeId: string; nomeAtual: string }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [nome, setNome] = useState(nomeAtual);
  const [abertoAntes, setAbertoAntes] = useState(isOpen);
  if (isOpen !== abertoAntes) {
    setAbertoAntes(isOpen);
    if (isOpen) setNome(nomeAtual);
  }
  const atualizar = useMutation({
    mutationFn: () => timesApi.atualizar(timeId, { nome: nome.trim() }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["times"] }); onOpenChange(false); toast.success(t("teamUpdateSuccess")); },
    onError: () => toast.error(t("teamUpdateError")),
  });

  return (
    <SideDrawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t("editTeam")}
      onSubmit={() => { if (nome.trim()) atualizar.mutate(); }}
      footer={<DrawerFormActions onCancel={() => onOpenChange(false)} submitLabel={t("save")} isPending={atualizar.isPending} isSubmitDisabled={!nome.trim()} />}
    >
      <div className="space-y-5 px-7 py-6">
        <TextInputField label={t("teamName")} value={nome} onChange={setNome} maxLength={150} isRequired autoFocus />
      </div>
    </SideDrawer>
  );
}
