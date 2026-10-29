import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SideDrawer } from "@/shared/ui/side-drawer";
import type { CasoTeste } from "../../model/projeto";

/** Painel só de leitura com a justificativa da exclusão (spec 026, RN-04), aberto pela coluna de observações. */
export function JustificativaExclusaoDrawer({ caso, onFechar }: { caso: CasoTeste | null; onFechar: () => void }) {
  const { t } = useTranslation();
  // Guarda o último caso aberto: o painel continua com o texto durante a animação de saída.
  const [exibido, setExibido] = useState(caso);
  if (caso && caso !== exibido) setExibido(caso);
  return (
    <SideDrawer isOpen={Boolean(caso)} onOpenChange={(aberto) => { if (!aberto) onFechar(); }} title={exibido?.tc_id ?? ""} subtitle={t("statusCancelled")}>
      <dl className="space-y-2 px-7 py-6">
        <dt className="text-[14px] font-medium text-body">{t("exclusionJustification")}</dt>
        <dd className="whitespace-pre-wrap break-words text-[14px] leading-6 text-body">{exibido?.justificativa_exclusao}</dd>
      </dl>
    </SideDrawer>
  );
}
