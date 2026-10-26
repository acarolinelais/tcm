import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { toast } from "@/shared/lib/toast";
import { SelectField, type SelectOption } from "@/shared/ui/form-field";
import { DrawerFormActions, SideDrawer } from "@/shared/ui/side-drawer";
import { timesApi } from "../api/times.api";

/** Painel de adicionar um membro ao time; `opcoes` são os usuários ativos que ainda não estão nele. */
export function AdicionarMembroDrawer({ isOpen, onOpenChange, timeId, opcoes }: { isOpen: boolean; onOpenChange: (open: boolean) => void; timeId: string; opcoes: SelectOption[] }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [usuarioId, setUsuarioId] = useState("");
  const fechar = () => { onOpenChange(false); setUsuarioId(""); };
  const adicionar = useMutation({
    mutationFn: () => timesApi.adicionar(timeId, usuarioId),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["time-membros", timeId] }); fechar(); toast.success(t("memberAdded")); },
    onError: () => toast.error(t("memberAddError")),
  });

  return (
    <SideDrawer
      isOpen={isOpen}
      onOpenChange={(open) => { if (open) onOpenChange(true); else fechar(); }}
      title={t("addMemberToTeam")}
      onSubmit={() => { if (usuarioId) adicionar.mutate(); }}
      footer={<DrawerFormActions onCancel={fechar} submitLabel={t("add")} isPending={adicionar.isPending} isSubmitDisabled={!usuarioId} />}
    >
      <div className="space-y-5 px-7 py-6">
        <SelectField label={t("selectUser")} value={usuarioId} onChange={setUsuarioId} placeholder={t("selectUser")} options={opcoes} />
      </div>
    </SideDrawer>
  );
}
