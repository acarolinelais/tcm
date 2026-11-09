import { useRef, useState } from "react";
import { useDrop } from "react-aria";
import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { cn } from "@/shared/lib/utils";
import { statusChipTons } from "../status/status-chip-estilos";
import { ROTULO_STATUS, type KanbanCard as Card, type KanbanColuna as ColunaDados, type StatusCasoTeste } from "../../model/projeto";
import { KanbanCard, TIPO_ARRASTO_CASO } from "./KanbanCard";

/** Cards renderizados por coluna antes do "Mostrar mais": mantém leve um projeto com 1.000 casos (RN-10). */
const CARDS_POR_VEZ = 50;

/** Coluna do Kanban (spec 056): painel cinza com ponto na cor do Status, nome e total; o To-Do é um anel vazio. */
export function KanbanColuna({ coluna, arrastando, aceita, onSoltar, onMover, onArrastar }: {
  coluna: ColunaDados;
  arrastando: boolean;
  aceita: boolean;
  onSoltar: () => void;
  onMover: (card: Card, destino: StatusCasoTeste) => void;
  onArrastar: (card: Card | null) => void;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLElement>(null);
  const [visiveis, setVisiveis] = useState(CARDS_POR_VEZ);
  const { dropProps, isDropTarget } = useDrop({
    ref,
    getDropOperation: (tipos) => (tipos.has(TIPO_ARRASTO_CASO) && aceita ? "move" : "cancel"),
    onDrop: () => onSoltar(),
  });
  const rotulo = t(ROTULO_STATUS[coluna.status]);
  const aVazio = coluna.status === "To-Do";

  return (
    <section
      {...dropProps}
      ref={ref}
      aria-label={t("kanbanColumn", { status: rotulo, count: coluna.total })}
      className={cn(
        "flex w-[280px] shrink-0 flex-col gap-2.5 rounded-3xl bg-panel p-2.5 transition-colors",
        arrastando && (aceita ? "bg-accent-soft" : "opacity-50"),
        isDropTarget && "ring-2 ring-focus",
      )}
    >
      <header className="flex items-center gap-2 px-2 pb-0.5 pt-1.5">
        <span
          aria-hidden="true"
          className={cn("size-1.5 shrink-0 rounded-full", aVazio && "border border-body")}
          style={aVazio ? undefined : { backgroundColor: statusChipTons[coluna.status].texto }}
        />
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium leading-5 text-body">{rotulo}</span>
        <span className="text-[13px] tabular-nums text-subtle">{coluna.total}</span>
      </header>
      <ul className="thin-scroll flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
        {coluna.casos.slice(0, visiveis).map((card) => (
          <li key={card.id}><KanbanCard card={card} onMover={onMover} onArrastar={onArrastar} /></li>
        ))}
      </ul>
      {coluna.casos.length > visiveis && (
        <Button variant="ghost" size="sm" onPress={() => setVisiveis((atual) => atual + CARDS_POR_VEZ)}>
          {t("showMoreCases", { count: coluna.casos.length - visiveis })}
        </Button>
      )}
    </section>
  );
}
