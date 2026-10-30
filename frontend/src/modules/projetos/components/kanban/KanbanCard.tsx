import { useDrag } from "react-aria";
import { Button, Dropdown } from "@heroui/react";
import { GripVertical, MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

import { TagChip, TONS_ETIQUETA } from "@/shared/ui/tag-chip";
import { cn } from "@/shared/lib/utils";
import { ROTULO_DIFICULDADE, ROTULO_SITUACAO, ROTULO_STATUS, type KanbanCard as Card, type StatusCasoTeste } from "../../model/projeto";

/** Tipo do item arrastado: só as colunas do Kanban aceitam. */
export const TIPO_ARRASTO_CASO = "application/x-tcm-caso-teste";

export function KanbanCard({ card, onMover, onArrastar }: {
  card: Card;
  onMover: (card: Card, destino: StatusCasoTeste) => void;
  /** Avisa o quadro qual card está sendo arrastado, para as colunas saberem se aceitam. */
  onArrastar: (card: Card | null) => void;
}) {
  const { t } = useTranslation();
  const podeMover = card.destinos.length > 0;
  const { dragProps, dragButtonProps, isDragging } = useDrag({
    isDisabled: !podeMover,
    hasDragButton: true,
    getItems: () => [{ [TIPO_ARRASTO_CASO]: card.id, "text/plain": card.tc_id }],
    onDragStart: () => onArrastar(card),
    onDragEnd: () => onArrastar(null),
  });

  return (
    <article
      {...(podeMover ? dragProps : {})}
      aria-label={card.tc_id}
      className={cn(
        "grid gap-2 rounded-lg border border-separator bg-surface p-3 text-[13px] text-body shadow-xs",
        podeMover && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-center gap-1">
        {podeMover && (
          <Button {...dragButtonProps} isIconOnly variant="ghost" size="sm" aria-label={t("dragCase", { tc: card.tc_id })} className="size-6 min-w-0 text-muted">
            <GripVertical aria-hidden="true" className="size-4" />
          </Button>
        )}
        <span className="min-w-0 flex-1 truncate font-medium">{card.tc_id}</span>
        {podeMover && (
          <Dropdown>
            <Button isIconOnly variant="ghost" size="sm" aria-label={t("moveCaseTo", { tc: card.tc_id })} className="size-6 min-w-0 text-muted">
              <MoreHorizontal aria-hidden="true" className="size-4" />
            </Button>
            <Dropdown.Popover placement="bottom end" className="min-w-44">
              <Dropdown.Menu aria-label={t("moveCaseTo", { tc: card.tc_id })} onAction={(destino) => onMover(card, destino as StatusCasoTeste)}>
                {card.destinos.map((destino) => (
                  <Dropdown.Item key={destino} id={destino} textValue={t(ROTULO_STATUS[destino])} className="text-[13px]">
                    {t(ROTULO_STATUS[destino])}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        <TagChip tom={TONS_ETIQUETA.neutro}>{card.category}</TagChip>
        <TagChip tom={TONS_ETIQUETA.neutro}>{t(ROTULO_DIFICULDADE[card.difficulty])}</TagChip>
        <TagChip tom={TONS_ETIQUETA.neutro}>{t(ROTULO_SITUACAO[card.situation])}</TagChip>
      </div>
      <p className="truncate text-[12px] text-muted">{card.responsavel_nome}</p>
    </article>
  );
}
