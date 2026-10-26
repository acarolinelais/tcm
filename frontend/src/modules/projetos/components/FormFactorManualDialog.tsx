import { useState, type FormEvent } from "react";
import { Button, Label, ListBox, Modal, Select } from "@heroui/react";
import { useTranslation } from "react-i18next";

import type { CriarRodadaFormFactorInput, LinhaFormFactor, ModeloFormFactor } from "../model/projeto";

type ResultadoManual = "PASS" | "FAIL";
const NAO_DEFINIDO = "unselected";

export function FormFactorManualDialog({ aberto, onAbertoChange, linha, modelos, salvando, onSalvar }: {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  linha: Pick<LinhaFormFactor, "caso_teste_id" | "tc_id"> | null;
  modelos: ModeloFormFactor[];
  salvando: boolean;
  onSalvar: (input: CriarRodadaFormFactorInput) => void;
}) {
  const { t } = useTranslation();
  return <Modal isOpen={aberto} onOpenChange={onAbertoChange}>
    <Modal.Backdrop>
      <Modal.Container size="md">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header className="flex-col items-start gap-1">
            <Modal.Heading className="text-[18px] font-medium text-[#454442]">{t("recordResultsTitle")}</Modal.Heading>
            <p className="text-[14px] text-muted">{t("tcId")}: <span className="font-medium text-[#454442]">{linha?.tc_id ?? "—"}</span></p>
            <p className="text-[14px] leading-relaxed text-muted">{t("manualResultsHint")}</p>
          </Modal.Header>
          {/* key pelo caso: cada abertura começa sem resultados escolhidos. */}
          {linha && <FormularioResultados key={linha.caso_teste_id} linha={linha} modelos={modelos} salvando={salvando} onSalvar={onSalvar} onCancelar={() => onAbertoChange(false)} />}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </Modal>;
}

function FormularioResultados({ linha, modelos, salvando, onSalvar, onCancelar }: {
  linha: Pick<LinhaFormFactor, "caso_teste_id" | "tc_id">;
  modelos: ModeloFormFactor[];
  salvando: boolean;
  onSalvar: (input: CriarRodadaFormFactorInput) => void;
  onCancelar: () => void;
}) {
  const { t } = useTranslation();
  const [resultados, setResultados] = useState<Record<string, ResultadoManual>>({});
  const selecionados = Object.keys(resultados).length;
  const salvar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selecionados || salvando) return;
    onSalvar({ caso_teste_id: linha.caso_teste_id, resultados });
  };
  const escolher = (modeloId: string, proximo: string) => setResultados((atual) => {
    if (proximo === NAO_DEFINIDO) return Object.fromEntries(Object.entries(atual).filter(([id]) => id !== modeloId));
    return { ...atual, [modeloId]: proximo as ResultadoManual };
  });

  return (
    <form onSubmit={salvar}>
      <Modal.Body className="space-y-2">
        {modelos.map((modelo) => (
          <Select
            key={modelo.id}
            aria-label={t("resultForModel", { model: modelo.nome })}
            value={resultados[modelo.id] ?? NAO_DEFINIDO}
            onChange={(valor) => escolher(modelo.id, String(valor))}
            className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-3 rounded-xl border border-separator bg-[#FBFBFB] px-3 py-2.5"
          >
            <Label className="truncate text-[14px] font-medium text-[#454442]">{modelo.nome}</Label>
            <Select.Trigger className="h-9 text-[13px]">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id={NAO_DEFINIDO} textValue={t("notSet")} className="text-[13px]">{t("notSet")}<ListBox.ItemIndicator /></ListBox.Item>
                <ListBox.Item id="PASS" textValue="PASS" className="text-[13px]">PASS<ListBox.ItemIndicator /></ListBox.Item>
                <ListBox.Item id="FAIL" textValue="FAIL" className="text-[13px]">FAIL<ListBox.ItemIndicator /></ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        ))}
      </Modal.Body>
      <Modal.Footer className="mt-4 border-t border-separator pt-4">
        <Button variant="tertiary" onPress={onCancelar}>{t("cancel")}</Button>
        <Button type="submit" variant="primary" isDisabled={!selecionados || salvando}>{salvando ? t("saving") : t("save")}</Button>
      </Modal.Footer>
    </form>
  );
}
