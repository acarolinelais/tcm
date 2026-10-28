import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { TimeMembro } from "@/modules/times/api/times.api";
import { toast } from "@/shared/lib/toast";
import { SelectField, TextAreaField, TextInputField } from "@/shared/ui/form-field";
import { DrawerFormActions, SideDrawer } from "@/shared/ui/side-drawer";
import type { CasoTeste, CategoriaCasoTeste, DificuldadeCasoTeste, SituacaoCasoTeste } from "../../api/projetos.api";
import { useAtualizarCasoTeste, useCriarCasoTeste } from "../../hooks/useProjetos";
import { CATEGORIAS_CASO_TESTE, DIFICULDADES_CASO_TESTE, ROTULO_DIFICULDADE, ROTULO_SITUACAO, ROTULO_STATUS, SITUACOES_CASO_TESTE, MAX_JUSTIFICATIVA_EXCLUSAO, STATUS_CASO_TESTE, opcoesRotuladas, type StatusCasoTeste } from "../../model/projeto";

type CamposEditaveis = Pick<CasoTeste, "category" | "difficulty" | "situation" | "status" | "responsavel_id" | "backup_id">;

/** Só os campos que mudaram: reenviar o resto desfaria edições feitas por outra pessoa enquanto o painel estava aberto. */
function camposAlterados(original: CasoTeste, editado: CamposEditaveis) {
  return Object.fromEntries(Object.entries(editado).filter(([campo, valor]) => original[campo as keyof CamposEditaveis] !== valor)) as Partial<CamposEditaveis>;
}

interface CasoTesteDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projetoId: string;
  /** Test Case em edição; `null` cria um novo. */
  editar: CasoTeste | null;
  membrosAtivos: TimeMembro[];
}

/**
 * Painel de criar e editar Test Case (gestão). A página troca a `key` a cada abertura: o estado nasce dos valores
 * do caso e não é limpo ao fechar, o que trocaria título e campos durante a animação de saída.
 */
export function CasoTesteDrawer({ isOpen, onOpenChange, projetoId, editar, membrosAtivos }: CasoTesteDrawerProps) {
  const { t } = useTranslation();
  const [tcId, setTcId] = useState(editar?.tc_id ?? "");
  const [category, setCategory] = useState<CategoriaCasoTeste>(editar?.category ?? "A");
  const [difficulty, setDifficulty] = useState<DificuldadeCasoTeste>(editar?.difficulty ?? "Low");
  const [situation, setSituation] = useState<SituacaoCasoTeste | "">(editar?.situation ?? "");
  const [status, setStatus] = useState<StatusCasoTeste>(editar?.status ?? "To-Do");
  const [responsavelId, setResponsavelId] = useState(editar?.responsavel_id ?? "");
  const [backupId, setBackupId] = useState(editar?.backup_id ?? "");
  const [justificativa, setJustificativa] = useState("");
  // Spec 026: só a entrada em Excluded pede justificativa; um TC já excluído mantém a dele.
  const excluindo = Boolean(editar) && status === "Cancelled" && editar?.status !== "Cancelled";
  const criar = useCriarCasoTeste(projetoId);
  const atualizar = useAtualizarCasoTeste(projetoId);
  const salvando = criar.isPending || atualizar.isPending;
  const camposFaltando = !tcId.trim() || !situation || !responsavelId || !backupId || (excluindo && !justificativa.trim());
  const opcoesMembros = (membros: TimeMembro[]) => membros.map((membro) => ({ value: membro.usuario_id, label: membro.usuario_nome ?? membro.usuario_id }));
  const aoSalvar = {
    onSuccess: () => { onOpenChange(false); toast.success(t("caseSaveSuccess")); },
    onError: (error: Error) => toast.error(error.message || t("caseSaveError")),
  };

  function salvar() {
    if (camposFaltando) return;
    if (editar) {
      const input = camposAlterados(editar, { category, difficulty, situation: situation || editar.situation, status, responsavel_id: responsavelId, backup_id: backupId || null });
      atualizar.mutate({ id: editar.id, input: excluindo ? { ...input, justificativa_exclusao: justificativa.trim() } : input }, aoSalvar);
    } else {
      criar.mutate({ tc_id: tcId.trim(), category, difficulty, situation: situation as SituacaoCasoTeste, responsavel_id: responsavelId, backup_id: backupId }, aoSalvar);
    }
  }

  return (
    <SideDrawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={editar ? t("editTestCase") : t("newTestCase")}
      onSubmit={salvar}
      footer={<>
        {camposFaltando && <p id="case-required-fields" className="mr-auto text-[12px] leading-5 text-muted">{t("caseRequiredFields")}</p>}
        <DrawerFormActions onCancel={() => onOpenChange(false)} submitLabel={t("save")} isPending={salvando} isSubmitDisabled={camposFaltando} />
      </>}
    >
      <div className="space-y-5 px-7 py-6">
        <TextInputField label={t("tcId")} value={tcId} onChange={setTcId} maxLength={120} isDisabled={Boolean(editar)} isRequired autoFocus={!editar} />
        <SelectField label={t("category")} value={category} onChange={(valor) => setCategory(valor as CategoriaCasoTeste)} options={CATEGORIAS_CASO_TESTE.map((valor) => ({ value: valor, label: valor }))} />
        <SelectField label={t("difficulty")} value={difficulty} onChange={(valor) => setDifficulty(valor as DificuldadeCasoTeste)} options={opcoesRotuladas(DIFICULDADES_CASO_TESTE, ROTULO_DIFICULDADE, t)} />
        <SelectField label={t("tcSituation")} value={situation} onChange={(valor) => setSituation(valor as SituacaoCasoTeste)} isRequired placeholder={t("tcSituationRequired")} options={opcoesRotuladas(SITUACOES_CASO_TESTE, ROTULO_SITUACAO, t)} />
        {editar && <SelectField label={t("status")} value={status} onChange={(valor) => setStatus(valor as StatusCasoTeste)} options={opcoesRotuladas(STATUS_CASO_TESTE, ROTULO_STATUS, t)} />}
        {excluindo && <TextAreaField label={t("exclusionJustification")} value={justificativa} onChange={setJustificativa} description={t("exclusionJustificationHint")} maxLength={MAX_JUSTIFICATIVA_EXCLUSAO} isRequired />}
        <SelectField label={t("assignee")} value={responsavelId} onChange={setResponsavelId} isRequired placeholder={t("selectUser")} options={opcoesMembros(membrosAtivos)} />
        <SelectField label={t("backup")} value={backupId} onChange={setBackupId} isRequired placeholder={t("selectUser")} options={opcoesMembros(membrosAtivos.filter((membro) => membro.usuario_id !== responsavelId))} />
      </div>
    </SideDrawer>
  );
}
