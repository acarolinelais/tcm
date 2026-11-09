import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { toast } from "@/shared/lib/toast";
import { formatarDiaIso } from "@/shared/lib/utils";
import { DateInputField, SelectField, TextInputField } from "@/shared/ui/form-field";
import { MultiSelectCombobox } from "@/shared/ui/multi-select-combobox";
import { DrawerFormActions, SideDrawer } from "@/shared/ui/side-drawer";
import { projetosApi, type Projeto } from "../api/projetos.api";

interface OpcaoModelo {
  value: string;
  label: string;
  description?: string | null;
}

/** Painel de editar projeto: nome, app, One UI, time, modelos e data planejada. Cada abertura começa com os dados salvos. */
export function EditarProjetoDrawer({ projeto, onFechar, times, nomeTime, opcoesModelos, carregandoModelos }: {
  projeto: Projeto | null;
  onFechar: () => void;
  /** Times ativos que podem ser escolhidos. */
  times: { id: string; nome: string }[];
  /** Nome de qualquer time conhecido, inclusive inativo: o time atual continua visível. */
  nomeTime: Record<string, string>;
  opcoesModelos: OpcaoModelo[];
  carregandoModelos: boolean;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [nome, setNome] = useState(projeto?.nome ?? "");
  const [app, setApp] = useState(projeto?.app ?? "");
  const [oneUi, setOneUi] = useState(projeto?.one_ui ?? "");
  const [timeId, setTimeId] = useState(projeto?.time_id ?? "");
  const [modelosIds, setModelosIds] = useState<string[]>(projeto?.modelos_ids ?? []);
  const [dataPlanejada, setDataPlanejada] = useState(projeto?.data_planejada ?? "");
  // Reabrir o mesmo projeto depois de cancelar volta aos dados salvos; ao fechar, o conteúdo fica até a animação
  // de saída terminar.
  const [exibido, setExibido] = useState(projeto);
  const [anterior, setAnterior] = useState(projeto);
  if (projeto !== anterior) {
    setAnterior(projeto);
    if (projeto) {
      setExibido(projeto);
      setNome(projeto.nome);
      setApp(projeto.app);
      setOneUi(projeto.one_ui);
      setTimeId(projeto.time_id);
      setModelosIds(projeto.modelos_ids ?? []);
      setDataPlanejada(projeto.data_planejada ?? "");
    }
  }
  const editar = useMutation({
    mutationFn: () => projetosApi.atualizar(exibido!.id, { nome: nome.trim(), app: app.trim(), one_ui: oneUi.trim(), time_id: timeId, modelos_ids: modelosIds, data_planejada: dataPlanejada || null }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["projetos"] }); onFechar(); toast.success(t("projectUpdateSuccess")); },
    onError: () => toast.error(t("projectUpdateError")),
  });
  // A data que o projeto já tem continua valendo mesmo depois de passar (spec 071, RN-09).
  const dataNoPassado = Boolean(dataPlanejada) && dataPlanejada !== (exibido?.data_planejada ?? "") && dataPlanejada < formatarDiaIso(new Date());
  const incompleto = !nome.trim() || !app.trim() || !oneUi.trim() || !timeId || dataNoPassado;
  // O time atual inativo continua visível e marcado, mas não pode ser escolhido de novo (como na RN-06).
  const opcoesTime = [
    ...(timeId && !times.some((time) => time.id === timeId) ? [{ value: timeId, label: nomeTime[timeId] ?? timeId, isDisabled: true }] : []),
    ...times.map((time) => ({ value: time.id, label: time.nome })),
  ];

  return (
    <SideDrawer
      isPending={editar.isPending}
      isOpen={Boolean(projeto)}
      onOpenChange={(open) => { if (!open) onFechar(); }}
      title={t("editProjectTitle", { name: exibido?.nome ?? "" })}
      onSubmit={() => { if (!incompleto && !editar.isPending) editar.mutate(); }}
      footer={<DrawerFormActions pendingLabel={t("saving")} onCancel={onFechar} submitLabel={t("save")} isPending={editar.isPending} isSubmitDisabled={incompleto} />}
    >
      <div className="space-y-6 px-7 py-6">
        <TextInputField label={t("projectNamePreview")} value={nome} onChange={setNome} maxLength={150} isRequired />
        <TextInputField label={t("app")} value={app} onChange={setApp} maxLength={100} isRequired />
        <TextInputField label={t("oneUi")} value={oneUi} onChange={setOneUi} maxLength={40} isRequired />
        <SelectField label={t("team")} value={timeId} onChange={setTimeId} placeholder={t("selectTeam")} isRequired options={opcoesTime} />
        <MultiSelectCombobox
          label={t("deviceModels")}
          placeholder={t("selectDeviceModels", { defaultValue: "Selecionar modelos" })}
          options={opcoesModelos}
          value={modelosIds}
          onValueChange={setModelosIds}
          emptyLabel={carregandoModelos ? t("loadingDeviceModels") : t("noDeviceModels")}
          removeLabel={(name) => t("removeSelectedModel", { defaultValue: "Remover {{name}}", name })}
        />
        <DateInputField label={t("plannedDate")} value={dataPlanejada} onChange={setDataPlanejada} description={t("plannedDateHint")} error={dataNoPassado ? t("plannedDatePast") : undefined} />
      </div>
    </SideDrawer>
  );
}
