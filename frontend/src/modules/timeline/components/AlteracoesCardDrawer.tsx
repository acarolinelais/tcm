import { useState } from "react";
import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { formatDate } from "@/core/i18n/format";
import { AlteracaoCasoTesteItem } from "@/modules/projetos/components/casos-teste/AlteracaoCasoTesteItem";
import { lerDiaIso } from "@/shared/lib/utils";
import { SideDrawer } from "@/shared/ui/side-drawer";

import type { CardTimeline } from "../model/timeline";

/** As mudanças de um card, da mais recente para a mais antiga, e o atalho para o Test Case (spec 054, RN-05). */
export function AlteracoesCardDrawer({ card, onFechar, onAbrirCaso }: {
  card: CardTimeline | null;
  onFechar: () => void;
  onAbrirCaso: (caso: { id: string; tc_id: string }) => void;
}) {
  const { t } = useTranslation();
  // Guarda o último card aberto: o painel continua com o conteúdo durante a animação de saída.
  const [exibido, setExibido] = useState(card);
  if (card && card !== exibido) setExibido(card);

  return <SideDrawer
    isOpen={Boolean(card)}
    onOpenChange={(aberto) => { if (!aberto) onFechar(); }}
    title={exibido?.tc_id ?? ""}
    subtitle={exibido && `${exibido.responsavel_nome} · ${formatDate(lerDiaIso(exibido.dia), { dateStyle: "long" })}`}
    variant="card"
    footer={exibido && <Button variant="primary" onPress={() => onAbrirCaso({ id: exibido.caso_teste_id, tc_id: exibido.tc_id })}>{t("openTestCase")}</Button>}
  >
    <ul className="divide-y divide-separator px-7">
      {exibido?.alteracoes.map((alteracao, indice) => <AlteracaoCasoTesteItem key={`${alteracao.alterado_em}-${alteracao.campo}-${indice}`} alteracao={alteracao} />)}
    </ul>
  </SideDrawer>;
}
