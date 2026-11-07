import type { UseQueryResult } from "@tanstack/react-query";
import { ClipboardCheck, ClipboardList, ClipboardPen, type LucideIcon } from "lucide-react";
import { useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { formatNumber } from "@/core/i18n/format";
import { ProjetoSwitcher } from "@/modules/projetos/components/ProjetoSwitcher";
import { cn } from "@/shared/lib/utils";
import { useOverview } from "../hooks/useOverview";
import type { OverviewTime, ProjetoOverview } from "../model/overview";

// Cabeçalho do protótipo (Figma, frame 2580-4911; spec 064, RN-12), em todos os perfis. Sem Recharts: a página
// também o usa no perfil sem visão própria.

export interface SelecaoDeProjeto {
  projetos: ProjetoOverview[];
  projetoAberto?: ProjetoOverview;
  escolher: (projetoId: string) => void;
}

export interface CardDoCabecalho {
  icone: LucideIcon;
  rotulo: string;
  valor: number;
}

/** Saudação, quanto falta no escopo do perfil, o seletor de projeto (quando há) e os três cards. */
export function CabecalhoDaOverview({ selecao, cards, rotuloDosCards }: {
  selecao?: SelecaoDeProjeto;
  cards: CardDoCabecalho[];
  rotuloDosCards: string;
}) {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const resumo = useOverview().data;
  const faltam = resumo ? resumo.total - resumo.concluidos : 0;
  const alinhamento = ["sm:pr-6", "sm:justify-center sm:px-6", "sm:justify-end sm:pl-6"];

  return <>
    <header className="space-y-1.5">
      {/* h2, e não h1: a saudação do protótipo é escura, e todo h1 do app usa a cor de acento (spec 055, RN-09). */}
      <h2 className="text-[22px] font-medium leading-[27px] text-body">{t("overviewGreeting", { name: perfil.nome.trim().split(/\s+/)[0] })}</h2>
      <p className="text-[15px] leading-5 text-muted">{faltam > 0 ? t("overviewCasesLeft", { count: faltam }) : t("overviewAllDone")}</p>
    </header>
    {selecao?.projetoAberto && (
      <div className="border-b border-separator pb-3">
        <ProjetoSwitcher comoTitulo={false} projetoId={selecao.projetoAberto.id} nome={selecao.projetoAberto.nome} projetos={selecao.projetos} buscavel onEscolher={selecao.escolher} />
      </div>
    )}
    {(!selecao || selecao.projetoAberto) && (
      <section aria-label={rotuloDosCards} className="grid grid-cols-1 gap-4 rounded-3xl border border-edge bg-card px-6 py-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-separator">
        {cards.map((card, i) => <Contagem key={card.rotulo} {...card} className={alinhamento[i]} />)}
      </section>
    )}
  </>;
}

/** O cabeçalho com os cards do projeto escolhido (admin, gerente e KP): Completed, In Progress e All. */
export function CabecalhoDoProjeto({ time, selecao }: { time: UseQueryResult<OverviewTime>; selecao: SelecaoDeProjeto }) {
  const { t } = useTranslation();
  const contagem = time.data?.donePorProjeto.find((p) => p.projetoId === selecao.projetoAberto?.id);
  return (
    <CabecalhoDaOverview
      selecao={selecao}
      rotuloDosCards={t("overviewProjectCards")}
      cards={[
        { icone: ClipboardCheck, rotulo: t("completed"), valor: contagem?.concluidos ?? 0 },
        { icone: ClipboardPen, rotulo: t("inProgress"), valor: contagem?.emAndamento ?? 0 },
        { icone: ClipboardList, rotulo: t("allTests"), valor: contagem?.total ?? 0 },
      ]}
    />
  );
}

function Contagem({ icone: Icone, rotulo, valor, className }: CardDoCabecalho & { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent-tint text-accent-text">
        <Icone className="size-5" strokeWidth={1.75} />
      </span>
      <p className="grid">
        <span className="text-[13px] leading-4 text-body">{rotulo}</span>
        <span className="text-[22px] font-medium leading-7 text-accent-text">{`${formatNumber(valor)} ${t("testCases")}`}</span>
      </p>
    </div>
  );
}
