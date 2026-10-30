import { useRef, type ReactNode } from "react";
import { DragPreview, useDrag } from "react-aria";
import { Button, Dropdown } from "@heroui/react";
import { GripVertical, MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AvatarUsuario } from "@/shared/ui/avatar-usuario";
import { TagChip, TONS_ETIQUETA } from "@/shared/ui/tag-chip";
import { cn } from "@/shared/lib/utils";
import { ROTULO_DIFICULDADE, ROTULO_SITUACAO, ROTULO_STATUS, type KanbanCard as Card, type StatusCasoTeste } from "../../model/projeto";

/** Tipo do item arrastado: só as colunas do Kanban aceitam. */
export const TIPO_ARRASTO_CASO = "application/x-tcm-caso-teste";

const classeCard = "grid gap-2 rounded-lg border border-edge bg-surface p-3 text-[13px] text-body";

export function KanbanCard({ card, onMover, onArrastar }: {
  card: Card;
  onMover: (card: Card, destino: StatusCasoTeste) => void;
  /** Avisa o quadro qual card está sendo arrastado, para as colunas saberem se aceitam. */
  onArrastar: (card: Card | null) => void;
}) {
  const { t } = useTranslation();
  const podeMover = card.destinos.length > 0;
  const previa = useRef(null);
  const { dragProps, dragButtonProps, isDragging } = useDrag({
    isDisabled: !podeMover,
    hasDragButton: true,
    // O navegador desenharia uma cópia translúcida; a prévia mostra o card inteiro, opaco e com sombra (RN-11a).
    preview: previa,
    getItems: () => [{ [TIPO_ARRASTO_CASO]: card.id, "text/plain": card.tc_id }],
    onDragStart: () => onArrastar(card),
    onDragEnd: () => onArrastar(null),
  });

  const cabecalho = (acoes: ReactNode, alca: ReactNode) => (
    <div className="flex items-center gap-1">
      {alca}
      <span className="min-w-0 flex-1 truncate font-medium">{card.tc_id}</span>
      {acoes}
    </div>
  );

  return (
    <>
      <article
        {...(podeMover ? dragProps : {})}
        aria-label={card.tc_id}
        className={cn(
          classeCard,
          "shadow-xs transition-opacity",
          podeMover && "cursor-grab active:cursor-grabbing",
          // O lugar de onde o card saiu fica marcado enquanto ele está no ar.
          isDragging && "border-dashed border-accent bg-transparent opacity-40 shadow-none",
        )}
      >
        {cabecalho(
          podeMover && (
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
          ),
          podeMover && (
            <Button {...dragButtonProps} isIconOnly variant="ghost" size="sm" aria-label={t("dragCase", { tc: card.tc_id })} className="size-6 min-w-0 text-muted">
              <GripVertical aria-hidden="true" className="size-4" />
            </Button>
          ),
        )}
        <CorpoCard card={card} />
      </article>
      <DragPreview ref={previa}>
        {() => (
          <div className={cn(classeCard, "w-[264px] rotate-2 shadow-lg")}>
            {cabecalho(null, <GripVertical aria-hidden="true" className="size-4 text-muted" />)}
            <CorpoCard card={card} />
          </div>
        )}
      </DragPreview>
    </>
  );
}

function CorpoCard({ card }: { card: Card }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex flex-wrap gap-1">
        <TagChip tom={TONS_ETIQUETA.neutro}>{card.category}</TagChip>
        <TagChip tom={TONS_ETIQUETA.neutro}>{t(ROTULO_DIFICULDADE[card.difficulty])}</TagChip>
        <TagChip tom={TONS_ETIQUETA.neutro}>{t(ROTULO_SITUACAO[card.situation])}</TagChip>
      </div>
      <p className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted">
        <AvatarUsuario cor={card.responsavel_cor_avatar} className="size-4 shrink-0" />
        <span className="truncate">{card.responsavel_nome}</span>
      </p>
    </>
  );
}
