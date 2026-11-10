import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SideDrawer } from "@/shared/ui/side-drawer";
import type { FalhaSdf } from "../model/bug-report";

export interface FalhaExibida {
  tcId: string;
  falha: FalhaSdf;
}

/** Description do relatório SDF de uma falha (spec 072, RN-12), como o painel da coluna Notes. */
export function DescricaoFalhaDrawer({ aberta, onFechar }: { aberta: FalhaExibida | null; onFechar: () => void }) {
  const { t } = useTranslation();
  // Guarda a última falha aberta: o painel continua com o texto durante a animação de saída.
  const [exibida, setExibida] = useState(aberta);
  if (aberta && aberta !== exibida) setExibida(aberta);
  return (
    <SideDrawer isOpen={Boolean(aberta)} onOpenChange={(abrir) => { if (!abrir) onFechar(); }} title={exibida?.tcId ?? ""} subtitle={exibida ? `${exibida.falha.modelo_nome} · ${exibida.falha.resultado}` : ""}>
      <dl className="space-y-2 px-7 py-6">
        <dt className="text-[14px] font-medium text-body">{t("resultDescription")}</dt>
        <dd className="whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-body">{exibida?.falha.descricao}</dd>
      </dl>
    </SideDrawer>
  );
}
