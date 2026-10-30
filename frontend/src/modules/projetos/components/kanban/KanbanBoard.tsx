import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
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
import { filtrarKanban, useFiltrosKanban } from "../../hooks/useFiltrosKanban";
import { KanbanFiltros } from "./KanbanFiltros";

/** Cards renderizados por coluna antes do "Mostrar mais": mantém leve um projeto com 1.000 casos (RN-10). */
const CARDS_POR_VEZ = 50;
/** Distância da borda do quadro, em px, em que o arrasto começa a rolar as colunas (RN-11a). */
const BORDA_DE_ROLAGEM = 80;
/** Pixels por quadro de animação: cerca de 700 px/s a 60 fps. */
const VELOCIDADE_DE_ROLAGEM = 12;

/**
 * Rola o quadro enquanto o card arrastado fica perto da borda. O navegador só dispara `dragover` quando o ponteiro
 * se mexe (ou de tempos em tempos parado), então o `dragover` só aponta a direção e a rolagem roda quadro a quadro.
 */
function useRolagemNaBorda(arrastando: boolean) {
  const direcao = useRef(0);
  const quadro = useRef<HTMLElement | null>(null);
  const animacao = useRef<number | null>(null);

  useEffect(() => {
    if (!arrastando) direcao.current = 0;
  }, [arrastando]);
  useEffect(() => () => { if (animacao.current !== null) cancelAnimationFrame(animacao.current); }, []);

  const rolar = () => {
    if (!quadro.current || direcao.current === 0) {
      animacao.current = null;
      return;
    }
    quadro.current.scrollLeft += direcao.current * VELOCIDADE_DE_ROLAGEM;
    animacao.current = requestAnimationFrame(rolar);
  };

  return {
    onDragOverCapture: (evento: DragEvent<HTMLElement>) => {
      const { left, right } = evento.currentTarget.getBoundingClientRect();
      quadro.current = evento.currentTarget;
      direcao.current = evento.clientX < left + BORDA_DE_ROLAGEM ? -1 : evento.clientX > right - BORDA_DE_ROLAGEM ? 1 : 0;
      if (direcao.current !== 0 && animacao.current === null) animacao.current = requestAnimationFrame(rolar);
    },
    // Saiu do quadro: para de rolar.
    onDragLeaveCapture: (evento: DragEvent<HTMLElement>) => {
      if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) direcao.current = 0;
    },
  };
}

export function KanbanBoard({ projetoId, perfil, podeGerenciar }: { projetoId: string; perfil: PerfilAtual; podeGerenciar: boolean }) {
  const { t } = useTranslation();
  const kanban = useKanban(projetoId, perfil);
  const mover = useMoverCasoKanban(projetoId, perfil);
  const [arrastando, setArrastando] = useState<Card | null>(null);
  const [excluindo, setExcluindo] = useState<Card | null>(null);
  const rolagem = useRolagemNaBorda(Boolean(arrastando));
  const { filtros, alterar, limpar, ativos } = useFiltrosKanban();
  // Sem memo, cada início e fim de arrasto refaria o filtro sobre todos os casos.
  const colunas = useMemo(() => (kanban.data ? filtrarKanban(kanban.data.colunas, filtros) : []), [kanban.data, filtros]);

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

  const semResultado = ativos && kanban.data.total > 0 && colunas.every((coluna) => coluna.casos.length === 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <KanbanFiltros colunas={kanban.data.colunas} filtros={filtros} ativos={ativos} onAlterar={alterar} onLimpar={limpar} />
      {kanban.data.total === 0 && <p role="status" className="text-[14px] text-muted">{t("kanbanEmpty")}</p>}
      {semResultado && <p role="status" className="text-[14px] text-muted">{t("kanbanNoMatches")}</p>}
      <div
        className="thin-scroll flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2"
        // Captura: o useDrop das colunas para a propagação do dragover.
        {...(arrastando ? rolagem : {})}
      >
        {colunas.map((coluna) => (
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
        arrastando && (aceita ? "bg-accent-soft" : "opacity-50"),
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
