import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { Button } from "@heroui/react";
import { SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PerfilAtual } from "@/core/auth/api";

import { toast } from "@/shared/lib/toast";
import { ErroComRetry } from "@/shared/ui/erro-com-retry";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { ExcluirCasoTesteDialog } from "../casos-teste/ExcluirCasoTesteDialog";
import { useKanban, useMoverCasoKanban } from "../../hooks/useKanban";
import type { KanbanCard as Card, StatusCasoTeste } from "../../model/projeto";
import { KanbanColuna } from "./KanbanColuna";
import { filtrarKanban, useFiltrosKanban } from "../../hooks/useFiltrosKanban";
import { KanbanFiltros } from "./KanbanFiltros";

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

/** `faixa` é o que a tela põe à esquerda dos filtros, na linha abaixo do cabeçalho (o seletor de projeto, na spec 056). */
export function KanbanBoard({ projetoId, perfil, podeGerenciar, faixa }: { projetoId: string; perfil: PerfilAtual; podeGerenciar: boolean; faixa?: ReactNode }) {
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

  const topo = (filtrosDoQuadro?: ReactNode) => (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge pb-3">
      <div className="min-w-0">{faixa}</div>
      {filtrosDoQuadro}
    </div>
  );

  if (kanban.isLoading) return <div>{topo()}<p role="status" className="py-8 text-[14px] text-muted">{t("loading")}</p></div>;
  if (kanban.isError || !kanban.data) {
    return <div>{topo()}<div className="py-8"><ErroComRetry mensagem={t("kanbanLoadError")} retry={{ label: t("retryQuery"), onRetry: () => void kanban.refetch() }} /></div></div>;
  }

  const semResultado = ativos && kanban.data.total > 0 && colunas.every((coluna) => coluna.casos.length === 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {topo(<KanbanFiltros colunas={kanban.data.colunas} filtros={filtros} ativos={ativos} onAlterar={alterar} onLimpar={limpar} />)}
      {kanban.data.total === 0 && <EstadoVazio className="mx-auto py-4" titulo={t("kanbanEmpty")} dica={t("noProjectCasesHint")} />}
      {semResultado && (
        <EstadoVazio className="mx-auto py-4" titulo={t("kanbanNoMatches")} dica={t("kanbanNoMatchesHint")} icone={<SearchX aria-hidden="true" className="size-7" />}>
          <Button variant="outline" size="sm" className="mt-5" onPress={limpar}>{t("clearFilters")}</Button>
        </EstadoVazio>
      )}
      <div
        className="thin-scroll flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2"
        // Captura: o useDrop das colunas para a propagação do dragover.
        {...(arrastando ? rolagem : {})}
      >
        {colunas.map((coluna) => (
          <KanbanColuna
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
