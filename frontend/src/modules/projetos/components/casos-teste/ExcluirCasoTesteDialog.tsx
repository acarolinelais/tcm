import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AlertConfirm } from "@/shared/ui/alert-confirm";
import { TextAreaField } from "@/shared/ui/form-field";
import { MAX_JUSTIFICATIVA_EXCLUSAO, type CasoTeste } from "../../model/projeto";

/**
 * Confirmação de exclusão com a justificativa (spec 026). O texto vive aqui, e não na página: cada tecla
 * redesenha só o diálogo, sem refazer as colunas e as linhas da tabela.
 */
export function ExcluirCasoTesteDialog({ caso, podeGerenciar, isPending, onConfirmar, onFechar }: {
  caso: CasoTeste | null;
  podeGerenciar: boolean;
  isPending: boolean;
  onConfirmar: (justificativa: string) => void;
  onFechar: () => void;
}) {
  const { t } = useTranslation();
  const [justificativa, setJustificativa] = useState("");
  // Cada caso aberto começa com o campo vazio; ao fechar, o texto fica até a animação de saída terminar.
  const [casoAberto, setCasoAberto] = useState(caso);
  if (caso !== casoAberto) {
    setCasoAberto(caso);
    if (caso) setJustificativa("");
  }
  const justificativaLimpa = justificativa.trim();

  return (
    <AlertConfirm
      open={Boolean(caso)}
      onOpenChange={(open) => { if (!open && !isPending) onFechar(); }}
      title={t("excludeCaseTitle", { tc: caso?.tc_id ?? "" })}
      description={podeGerenciar ? t("excludeCaseDescription") : `${t("excludeCaseDescription")} ${t("excludeCaseOnlyManagement")}`}
      confirmLabel={t("excludeCase")}
      variant="destructive"
      isPending={isPending}
      isConfirmDisabled={!justificativaLimpa}
      onConfirm={() => onConfirmar(justificativaLimpa)}
    >
      <TextAreaField label={t("exclusionJustification")} value={justificativa} onChange={setJustificativa} description={t("exclusionJustificationHint")} maxLength={MAX_JUSTIFICATIVA_EXCLUSAO} isRequired autoFocus />
    </AlertConfirm>
  );
}
