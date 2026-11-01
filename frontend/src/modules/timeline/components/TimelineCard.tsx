import { Button, Tooltip } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { AVATAR_POR_COR } from "@/shared/lib/cor-avatar";
import { cn } from "@/shared/lib/utils";
import { AvatarUsuario } from "@/shared/ui/avatar-usuario";

import type { CardTimeline } from "../model/timeline";

/**
 * As mudanças de um caso num dia, com o responsável do caso (spec 054, RN-04; Figma 2321:345). A barra e o
 * avatar usam a cor do responsável. Compacto, na visão Mês, mostra só a barra e o avatar, com o resto no tooltip.
 */
export function TimelineCard({ card, compacto = false, onAbrir }: { card: CardTimeline; compacto?: boolean; onAbrir: (card: CardTimeline) => void }) {
  const { t } = useTranslation();
  const cor = card.responsavel_cor_avatar;
  const nome = card.responsavel_nome;
  const total = card.alteracoes.length;
  const mudancas = t("timelineChanges", { count: total });
  const resumo = total > 1 ? `${nome} · ${mudancas}` : nome;
  const botao = <Button
    variant="ghost"
    onPress={() => onAbrir(card)}
    aria-label={t("timelineCardLabel", { tcId: card.tc_id, name: nome, changes: mudancas })}
    className={cn(
      "h-auto min-h-[45px] w-full min-w-0 justify-start gap-1.5 rounded-xl border border-edge bg-surface px-2 py-2 text-left shadow-sm hover:bg-panel",
      compacto && "w-fit",
    )}
  >
    <span aria-hidden="true" className={cn("h-[17px] w-0.5 shrink-0 rounded-full", AVATAR_POR_COR[cor]?.fundo)} />
    {!compacto && <span className="grid min-w-0 flex-1">
      <span className="truncate text-[12px] font-medium leading-4 text-body">{card.tc_id}</span>
      <span className="truncate text-[11px] leading-4 text-muted">{resumo}</span>
    </span>}
    <AvatarUsuario cor={cor} className="shrink-0" />
  </Button>;
  if (!compacto) return botao;
  return <Tooltip delay={300} closeDelay={0}>
    {botao}
    <Tooltip.Content className="text-[12px]">{card.tc_id} · {resumo}</Tooltip.Content>
  </Tooltip>;
}
