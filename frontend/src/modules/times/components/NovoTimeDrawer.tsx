import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { toast } from "@/shared/lib/toast";
import { SelectField, TextInputField } from "@/shared/ui/form-field";
import { DrawerFormActions, SideDrawer } from "@/shared/ui/side-drawer";
import type { Setor } from "@/modules/setores/api/setores.api";
import { timesApi } from "../api/times.api";

interface NovoTimeDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  setoresAtivos: Setor[];
  /** Gerente com um setor só: o setor vem fixo, sem seletor. */
  setorUnico?: Setor;
  /** Gerente esperando os próprios setores: mostra o campo de setor em carregamento. */
  carregandoSetores: boolean;
}

/** Painel de criar time. O estado do formulário fica aqui para não redesenhar a listagem a cada tecla. */
export function NovoTimeDrawer({ isOpen, onOpenChange, setoresAtivos, setorUnico, carregandoSetores }: NovoTimeDrawerProps) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [nome, setNome] = useState("");
  const [setorId, setSetorId] = useState("");
  const [erros, setErros] = useState<{ nome?: string; setor?: string }>({});
  const setorEscolhido = setorUnico?.id ?? setorId;
  const criar = useMutation({
    mutationFn: () => timesApi.criar({ nome: nome.trim(), setor_id: setorEscolhido }),
    onSuccess: async () => { fechar(); await client.invalidateQueries({ queryKey: ["times"] }); toast.success(t("teamCreateSuccess")); },
    onError: () => toast.error(t("teamCreateError")),
  });

  function fechar() {
    onOpenChange(false);
    setNome("");
    setSetorId("");
    setErros({});
  }

  function enviar() {
    const novos: typeof erros = {};
    if (!nome.trim()) novos.nome = t("requiredField");
    if (!setorEscolhido) novos.setor = t("requiredField");
    setErros(novos);
    if (!Object.keys(novos).length) criar.mutate();
  }

  return (
    <SideDrawer
      isOpen={isOpen}
      onOpenChange={(open) => { if (open) onOpenChange(true); else fechar(); }}
      title={t("newTeam")}
      onSubmit={enviar}
      footer={<DrawerFormActions onCancel={fechar} submitLabel={t("createTeam")} isPending={criar.isPending} isSubmitDisabled={carregandoSetores} />}
    >
      <div className="space-y-6 px-7 py-6">
        <TextInputField label={t("teamName")} value={nome} onChange={(valor) => { setNome(valor); setErros((atual) => ({ ...atual, nome: undefined })); }} error={erros.nome} isRequired maxLength={120} autoFocus />
        {carregandoSetores ? <TextInputField label={t("sector")} value={t("loadingSectors")} isReadOnly isDisabled />
          : setorUnico ? <TextInputField label={t("sector")} value={setorUnico.nome} isReadOnly />
            : <SelectField label={t("sector")} value={setorId} onChange={(valor) => { setSetorId(valor); setErros((atual) => ({ ...atual, setor: undefined })); }} error={erros.setor} isRequired placeholder={t("selectSector")} options={setoresAtivos.map((setor) => ({ value: setor.id, label: setor.nome, textValue: setor.nome }))} />}
      </div>
    </SideDrawer>
  );
}
