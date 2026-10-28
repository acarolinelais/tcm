import { useState, type FormEvent } from "react";
import { Button, Modal } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { TextInputField } from "@/shared/ui/form-field";

const MAX_SDF_ID = 50;

export function FormFactorCriarRodadaDialog({ aberto, onAbertoChange, salvando, onCriar, sdfIdRecusado }: {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  salvando: boolean;
  onCriar: (sdfId: string) => void;
  /** SDF ID que a API recusou por já ter rodada no projeto; o erro some quando o valor muda. */
  sdfIdRecusado?: string | null;
}) {
  const { t } = useTranslation();
  return <Modal isOpen={aberto} onOpenChange={onAbertoChange}>
    <Modal.Backdrop>
      <Modal.Container size="md">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header className="flex-col items-start gap-1">
            <Modal.Heading className="text-[18px] font-medium text-[#454442]">{t("createTestRound")}</Modal.Heading>
            <p className="text-[14px] leading-relaxed text-muted">{t("createTestRoundHint")}</p>
          </Modal.Header>
          {/* Montado só com o modal aberto: cada abertura começa com o SDF ID vazio. */}
          {aberto && <FormularioRodada salvando={salvando} onCriar={onCriar} onCancelar={() => onAbertoChange(false)} sdfIdRecusado={sdfIdRecusado} />}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </Modal>;
}

function FormularioRodada({ salvando, onCriar, onCancelar, sdfIdRecusado }: { salvando: boolean; onCriar: (sdfId: string) => void; onCancelar: () => void; sdfIdRecusado?: string | null }) {
  const { t } = useTranslation();
  const [sdfId, setSdfId] = useState("");
  // Mesma comparação da API (spec 025, RN-02): "sdf-001 " continua repetindo "SDF-001".
  const normalizar = (valor: string) => valor.trim().toLowerCase();
  const repetido = sdfIdRecusado != null && normalizar(sdfId) === normalizar(sdfIdRecusado);
  const criar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sdfId.length <= MAX_SDF_ID && !salvando && !repetido) onCriar(sdfId);
  };

  return (
    <form onSubmit={criar}>
      <Modal.Body>
        <TextInputField label={t("sdfId")} value={sdfId} onChange={setSdfId} maxLength={MAX_SDF_ID} autoFocus error={repetido ? t("sdfIdAlreadyUsed") : undefined} description={t("sdfIdOptionalHint")} />
      </Modal.Body>
      <Modal.Footer className="mt-4 border-t border-separator pt-4">
        <Button variant="tertiary" onPress={onCancelar}>{t("cancel")}</Button>
        <Button type="submit" variant="primary" isDisabled={salvando}>{salvando ? t("saving") : t("createTestRound")}</Button>
      </Modal.Footer>
    </form>
  );
}
