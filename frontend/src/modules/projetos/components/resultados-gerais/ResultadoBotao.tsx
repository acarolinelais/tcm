import { useTranslation } from "react-i18next";

import { ResultadoFormFactor } from "../form-factor/ResultadoFormFactor";
import { formatarDia } from "./formatar-dia";

interface CelulaProps {
  device: string;
  /** `AAAA-MM-DD`. */
  dia: string;
}

/** Resultado de uma execução como botão (spec 032, RN-09): o nome acessível diz o resultado, o device e a data. */
export function ResultadoBotao({ resultado, device, dia, onPress }: CelulaProps & { resultado: string; onPress: () => void }) {
  const { t } = useTranslation();
  return <button
    type="button"
    aria-label={t("resultChipLabel", { result: resultado, device, date: formatarDia(dia) })}
    onClick={onPress}
    className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
  >
    <ResultadoFormFactor valor={resultado} />
  </button>;
}

/** Marcador vazio de uma célula sem execução do device na data, com o rótulo para leitores de tela. */
export function SemExecucao({ device, dia }: CelulaProps) {
  const { t } = useTranslation();
  return <span role="img" aria-label={t("noRunLabel", { device, date: formatarDia(dia) })} className="text-muted">—</span>;
}
