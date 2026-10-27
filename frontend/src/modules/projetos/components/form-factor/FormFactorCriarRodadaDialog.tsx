import { useState, type FormEvent } from "react";
import { Button, Description, Input, Label, Modal, TextField } from "@heroui/react";
import { useTranslation } from "react-i18next";

const MAX_SDF_ID = 50;

export function FormFactorCriarRodadaDialog({ aberto, onAbertoChange, salvando, onCriar }: {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  salvando: boolean;
  onCriar: (sdfId: string) => void;
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
          {aberto && <FormularioRodada salvando={salvando} onCriar={onCriar} onCancelar={() => onAbertoChange(false)} />}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </Modal>;
}

function FormularioRodada({ salvando, onCriar, onCancelar }: { salvando: boolean; onCriar: (sdfId: string) => void; onCancelar: () => void }) {
  const { t } = useTranslation();
  const [sdfId, setSdfId] = useState("");
  const criar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sdfId.length <= MAX_SDF_ID && !salvando) onCriar(sdfId);
  };

  return (
    <form onSubmit={criar}>
      <Modal.Body>
        <TextField value={sdfId} onChange={setSdfId} className="flex flex-col gap-2">
          <Label className="text-[14px] font-medium text-[#454442]">{t("sdfId")}</Label>
          <Input maxLength={MAX_SDF_ID} autoFocus className="h-10 text-[14px]" />
          <Description className="text-[12px] text-muted">{t("sdfIdOptionalHint")}</Description>
        </TextField>
      </Modal.Body>
      <Modal.Footer className="mt-4 border-t border-separator pt-4">
        <Button variant="tertiary" onPress={onCancelar}>{t("cancel")}</Button>
        <Button type="submit" variant="primary" isDisabled={salvando}>{salvando ? t("saving") : t("createTestRound")}</Button>
      </Modal.Footer>
    </form>
  );
}
