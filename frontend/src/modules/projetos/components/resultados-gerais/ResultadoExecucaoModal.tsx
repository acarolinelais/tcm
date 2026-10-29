import { useState } from "react";
import { Button, Modal } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { formatarDia } from "./formatar-dia";
import type { ResultadoAberto } from "./HistoricoProjetoTabela";

interface Props {
  resultado: ResultadoAberto | null;
  onFechar: () => void;
}

/** Detalhe de um resultado (spec 032, RN-09): TC ID, device e data no título; SDF ID e origem; só o botão Fechar. */
export function ResultadoExecucaoModal({ resultado: aberto, onFechar }: Props) {
  const { t } = useTranslation();
  // A janela continua mostrando o último resultado enquanto a animação de saída roda.
  const [resultado, setResultado] = useState(aberto);
  if (aberto && aberto !== resultado) setResultado(aberto);
  return <Modal isOpen={aberto !== null} onOpenChange={(abrir) => { if (!abrir) onFechar(); }}>
    <Modal.Backdrop>
      <Modal.Container size="sm">
        <Modal.Dialog>
          {resultado && <>
            <Modal.Header>
              <Modal.Heading className="text-[18px] font-medium text-[#454442]">
                {resultado.tcId} · {resultado.device} · {formatarDia(resultado.dia)}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[14px] leading-5">
                <dt className="text-muted">{t("sdfId")}</dt>
                <dd className="text-[#454442]">{resultado.resultado.sdf_id ?? <span className="text-muted">—</span>}</dd>
                <dt className="text-muted">{t("origin")}</dt>
                <dd className="text-[#454442]">{t(resultado.resultado.origem === "MANUAL" ? "resultOriginManual" : "resultOriginImported")}</dd>
              </dl>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline" onPress={onFechar}>{t("close")}</Button>
            </Modal.Footer>
          </>}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </Modal>;
}
