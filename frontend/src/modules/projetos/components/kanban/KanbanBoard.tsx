import { useRef, useState } from "react";
import { useDrop } from "react-aria";
import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { PerfilAtual } from "@/core/auth/api";

import { toast } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { ErroComRetry } from "@/shared/ui/erro-com-retry";
import { ExcluirCasoTesteDialog } from "../casos-teste/ExcluirCasoTesteDialog";
import { StatusPill } from "../status/StatusBadge";
import { useKanban, useMoverCasoKanban } from "../../hooks/useKanban";
import { ROTULO_STATUS, type KanbanCard as Card, type KanbanColuna, type StatusCasoTeste } from "../../model/projeto";
import { KanbanCard, TIPO_ARRASTO_CASO } from "./KanbanCard";

/** Cards renderizados por coluna antes do "Mostrar mais": mantém leve um projeto com 1.000 casos (RN-10). */
const CARDS_POR_VEZ = 50;

export function KanbanBoard({ projetoId, perfil, podeGerenciar }: { projetoId: string; perfil: PerfilAtual; podeGerenciar: boolean }) {
  const { t } = useTranslation();
  const kanban = useKanban(projetoId, perfil);
  const mover = useMoverCasoKanban(projetoId, perfil);
  const [arrastando, setArrastando] = useState<Card | null>(null);
  const [excluindo, setExcluindo] = useState<Card | null>(null);

  const pedirMovimento = (card: Card, destino: StatusCasoTeste, justificativa?: string) => {
    if (!card.destinos.includes(destino)) return;
    // Excluir pede a justificativa antes de gravar (spec 026); cancelar não muda nada.
    if (destino === "Cancelled" && justificativa === undefined) {
      setExcluindo(card);
      return;
    }
    mover.mutate({ casoId: card.id, destino, justificativa }, {
      onSuccess: () => setExcluindo(null),
      onError: (erro) => toast.error(t("moveCaseError", { tc: card.tc_id }), { description: erro.message }),
    });
  };

  if (kanban.isLoading) return <p role="status" className="py-8 text-[14px] text-muted">{t("loading")}</p>;
  if (kanban.isError || !kanban.data) {
    return <div className="py-8"><ErroComRetry mensagem={t("kanbanLoadError")} retry={{ label: t("retryQuery"), onRetry: () => void kanban.refetch() }} /></div>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {kanban.data.total === 0 && <p role="status" className="text-[14px] text-muted">{t("kanbanEmpty")}</p>}
      <div className="thin-scroll flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
        {kanban.data.colunas.map((coluna) => (
          <Coluna
            key={coluna.status}
            coluna={coluna}
            arrastando={Boolean(arrastando)}
            aceita={Boolean(arrastando?.destinos.includes(coluna.status))}
            // O card arrastado já está no estado: o drop não precisa ler o id de volta.
            onSoltar={() => { if (arrastando) pedirMovimento(arrastando, coluna.status); }}
            onMover={pedirMovimento}
            onArrastar={setArrastando}
          />
        ))}
      </div>
      <ExcluirCasoTesteDialog
        caso={excluindo}
        podeGerenciar={podeGerenciar}
        isPending={mover.isPending}
        onFechar={() => setExcluindo(null)}
        onConfirmar={(justificativa) => { if (excluindo) pedirMovimento(excluindo, "Cancelled", justificativa); }}
      />
    </div>
  );
}

function Coluna({ coluna, arrastando, aceita, onSoltar, onMover, onArrastar }: {
  coluna: KanbanColuna;
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

  return (
    <section
      {...dropProps}
      ref={ref}
      aria-label={t("kanbanColumn", { status: rotulo, count: coluna.total })}
      className={cn(
        "flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-panel p-2 transition-colors",
        arrastando && !aceita && "opacity-60",
        isDropTarget && "ring-2 ring-focus",
      )}
    >
      <header className="flex items-center justify-between gap-2 px-1 py-1">
        <StatusPill status={coluna.status} label={rotulo} />
        <span className="text-[13px] font-medium tabular-nums text-muted">{coluna.total}</span>
      </header>
      <ul className="thin-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
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
