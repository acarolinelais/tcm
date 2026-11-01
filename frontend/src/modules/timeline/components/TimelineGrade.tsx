import type { ReactNode } from "react";

import { formatDate } from "@/core/i18n/format";
import { cn, formatarDiaIso } from "@/shared/lib/utils";

import type { CardTimeline, Periodo, VisaoTimeline } from "../model/timeline";
import { colunas as colunasDe } from "../utils/periodo";
import { TimelineCard } from "./TimelineCard";

// Largura mínima de cada coluna: na Semana as 7 cabem na tela; no Dia (24 horas) e no Mês a grade rola na horizontal.
const LARGURA_COLUNA: Record<VisaoTimeline, string> = { dia: "8.5rem", semana: "8.5rem", mes: "3.5rem" };

/**
 * Grade da timeline (spec 054; Figma 2321:345): o mês acima dos dias (ou das horas), uma coluna por dia ou hora
 * com os cards empilhados e a linha do momento atual quando ele está no período (RN-09).
 */
export function TimelineGrade({ visao, periodo, cards, onAbrir, vazio, agora = new Date() }: {
  visao: VisaoTimeline;
  periodo: Periodo;
  cards: CardTimeline[];
  onAbrir: (card: CardTimeline) => void;
  /** Mostrado no corpo da grade quando nenhum card cai no período. */
  vazio: ReactNode;
  agora?: Date;
}) {
  const colunas = colunasDe(visao, periodo);
  const porHora = visao === "dia";
  // No Dia, a coluna é a posição (0 a 23), não `getHours()`: no dia da troca do horário de verão uma hora some ou repete.
  const chave = (data: Date, i: number) => (porHora ? String(i) : formatarDiaIso(data));
  const indice = new Map(colunas.map((coluna, i) => [chave(coluna, i), i]));
  const cardsPorColuna = colunas.map((): CardTimeline[] => []);
  for (const card of cards) {
    const i = indice.get(porHora ? String(new Date(card.primeira_em).getHours()) : card.dia);
    if (i !== undefined) cardsPorColuna[i].push(card);
  }
  const hoje = formatarDiaIso(agora);
  // Posição da linha em colunas: a hora com os minutos no Dia, o dia com a fração do dia nas outras visões.
  const minutos = agora.getHours() * 60 + agora.getMinutes();
  const iHoje = indice.get(hoje);
  const iAgora = porHora ? (formatarDiaIso(periodo.inicio) === hoje ? minutos / 60 : undefined)
    : iHoje === undefined ? undefined : iHoje + minutos / 1440;
  const template = { gridTemplateColumns: `repeat(${colunas.length}, minmax(${LARGURA_COLUNA[visao]}, 1fr))` };

  return <div className="thin-scroll min-h-0 flex-1 overflow-auto">
    <div className="relative grid min-h-full min-w-full grid-rows-[auto_auto_1fr]" style={template}>
      {colunas.map((coluna, i) => {
        // O mês aparece na primeira coluna e onde um novo mês começa; no Dia, a data por extenso.
        const rotuloMes = porHora ? (i === 0 ? formatDate(coluna, { dateStyle: "full" }) : "")
          : i === 0 || coluna.getDate() === 1 ? formatDate(coluna, { month: "long", year: "numeric" }) : "";
        return <p key={`mes-${i}`} aria-hidden="true" className="whitespace-nowrap pb-3 text-[15px] font-medium text-body" style={{ gridColumn: i + 1 }}>{rotuloMes}</p>;
      })}
      {colunas.map((coluna, i) => {
        const atual = porHora ? iAgora !== undefined && Math.floor(iAgora) === i : chave(coluna, i) === hoje;
        return <p key={`dia-${i}`} aria-hidden="true" className={cn("whitespace-nowrap border-b border-separator pb-2 text-[13px] text-muted", atual && "font-medium text-accent-text")}>
          {porHora ? formatDate(coluna, { hour: "2-digit", minute: "2-digit" })
            : <><span className="mr-1 text-[11px]">{formatDate(coluna, { weekday: "narrow" })}</span><span className="tabular-nums">{String(coluna.getDate()).padStart(2, "0")}</span></>}
        </p>;
      })}
      {colunas.map((coluna, i) => <ul
        key={`cards-${i}`}
        aria-label={formatDate(coluna, porHora ? { hour: "2-digit", minute: "2-digit" } : { weekday: "long", day: "numeric", month: "long" })}
        className="flex min-w-0 flex-col gap-3 px-1 pb-4 pt-5"
      >
        {cardsPorColuna[i].map((card) => <li key={`${card.caso_teste_id}-${card.dia}`} className="relative z-10 min-w-0">
          <TimelineCard card={card} compacto={visao === "mes"} onAbrir={onAbrir} />
        </li>)}
      </ul>)}
      {iAgora !== undefined && <div
        data-testid="linha-agora"
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 top-8 w-px bg-accent"
        style={{ left: `${(iAgora / colunas.length) * 100}%` }}
      />}
      {cardsPorColuna.every((lista) => !lista.length)
        ? <div className="pointer-events-none absolute inset-x-0 bottom-0 top-16 flex items-center justify-center [&>*]:pointer-events-auto">{vazio}</div>
        : null}
    </div>
  </div>;
}
