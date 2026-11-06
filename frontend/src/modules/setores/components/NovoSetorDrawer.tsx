import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { toast } from "@/shared/lib/toast";
import { SelectField, TextInputField } from "@/shared/ui/form-field";
import { DrawerFormActions, SideDrawer } from "@/shared/ui/side-drawer";
import type { Usuario } from "@/modules/usuarios/model/usuario";
import { setoresApi } from "../api/setores.api";

/** Painel de criar setor, com um gerente opcional. O estado fica aqui para não redesenhar a listagem a cada tecla. */
export function NovoSetorDrawer({ isOpen, onOpenChange, gerentes }: { isOpen: boolean; onOpenChange: (open: boolean) => void; gerentes: Usuario[] }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [nome, setNome] = useState("");
  const [gerente, setGerente] = useState("");
  const [erroNome, setErroNome] = useState("");
  const criar = useMutation({
    mutationFn: () => setoresApi.criar(nome.trim(), gerente || undefined),
    onSuccess: async () => { fechar(); await client.invalidateQueries({ queryKey: ["setores"] }); toast.success(t("sectorCreateSuccess")); },
    onError: () => toast.error(t("sectorCreateError")),
  });

  function fechar() {
    onOpenChange(false);
    setNome("");
    setGerente("");
    setErroNome("");
  }

  function enviar() {
    if (!nome.trim()) return setErroNome(t("requiredField"));
    criar.mutate();
  }

  return (
    <SideDrawer
      isPending={criar.isPending}
      isOpen={isOpen}
      onOpenChange={(open) => { if (open) onOpenChange(true); else fechar(); }}
      title={t("newSector")}
      onSubmit={enviar}
      footer={<DrawerFormActions pendingLabel={t("saving")} onCancel={fechar} submitLabel={t("createSector")} isPending={criar.isPending} />}
    >
      <div className="space-y-6 px-7 py-6">
        <TextInputField label={t("sectorName")} value={nome} onChange={(valor) => { setNome(valor); setErroNome(""); }} error={erroNome} isRequired maxLength={150} autoFocus />
        <SelectField
          label={t("selectManager")}
          value={gerente}
          onChange={setGerente}
          emptyOption={t("noOwner")}
          description={t("managerSelectHint")}
          options={gerentes.filter((usuario) => usuario.ativo).map((usuario) => ({ value: usuario.id, label: `${usuario.nome} · ${usuario.email}` }))}
        />
      </div>
    </SideDrawer>
  );
}
