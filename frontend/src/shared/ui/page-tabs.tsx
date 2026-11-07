import { useEffect, useRef, type Key, type ReactNode } from "react";
import { Tabs } from "@heroui/react";

export interface PageTab {
  id: string;
  label: string;
}

interface PageTabsProps {
  "aria-label": string;
  tabs: PageTab[];
  selectedKey: string;
  onSelectionChange: (id: string) => void;
  /** Ações da aba atual, à direita na barra (ex.: "Novo Test Case"). */
  actions?: ReactNode;
  /** Controles logo depois das abas (ex.: setas para ver mais abas). */
  navegacao?: ReactNode;
  /** De que lado entram as abas novas depois de uma seta. */
  direcaoAbas?: "proximo" | "anterior";
  /** Os `Tabs.Panel` de cada aba, com o mesmo `id`. */
  children: ReactNode;
}

// Abas do Figma (TCM 2070:1476): ativa Inter 500 18px #2D72E4 com sublinhado de 1.5px; inativa Inter 400 `text-muted`;
// linha de base #ECEFF2. A variante "secondary" do HeroUI só estiliza a lista quando ela é filha direta do Tabs; aqui
// ela divide a barra com as ações, então o sublinhado e o fundo transparente vão nas classes.
// O anel de foco do HeroUI fica por fora da aba e a área de rolagem da lista o corta (sobrava só uma linha vertical):
// aqui ele é desenhado por dentro, inteiro.
const classeAba = "h-auto w-auto rounded-none px-0.5 pb-2 pt-0 text-[18px] font-normal leading-[25px] text-muted data-[selected=true]:font-medium data-[selected=true]:text-accent-text data-[focus-visible=true]:rounded-md data-[focus-visible=true]:outline-none data-[focus-visible=true]:[box-shadow:inset_0_0_0_2px_var(--focus)]";
const classeIndicador = "top-auto bottom-0 h-[1.5px] rounded-none bg-accent shadow-none";
const classeListaBase = "rounded-none bg-transparent p-0";
// Com setas próprias (`navegacao`), a seta de rolagem e o esmaecimento do HeroUI sobram, e o detector dele às vezes
// fica preso em "transborda" depois de uma troca de abas, desenhando a seta por cima do texto.
const semRolagemDoHeroUI = "[&>[class*=scroll-prev]]:hidden! [&>[class*=scroll-next]]:hidden! [&_[data-slot=scroll-shadow]]:[mask-image:none] [&_[data-slot=scroll-shadow]]:[-webkit-mask-image:none]";

/** Abas de página (spec 022) sobre o `Tabs` do HeroUI, com espaço para as ações da aba na mesma barra. */
export function PageTabs({ tabs, selectedKey, onSelectionChange, actions, navegacao, direcaoAbas, children, ...props }: PageTabsProps) {
  const barraRef = useRef<HTMLDivElement>(null);
  const chaveAbas = tabs.map((aba) => aba.id).join();
  useEffect(() => {
    const lista = barraRef.current?.querySelector<HTMLElement>('[data-slot="tabs-list-container"]');
    if (!lista?.animate || !direcaoAbas) return;
    // A fila anda para o lado da seta e para sem quicar. O movimento fica no contêiner, fora da área rolável: nas
    // abas, ele faria a lista transbordar e o HeroUI mostraria a seta de rolagem por cima delas.
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const de = reduzido ? "none" : `translateX(${direcaoAbas === "proximo" ? 12 : -12}px)`;
    const animacao = lista.animate([{ opacity: 0, transform: de }, { opacity: 1, transform: "none" }], { duration: reduzido ? 150 : 320, easing: "cubic-bezier(0.32, 0.72, 0, 1)" });
    // O sombreado de rolagem do HeroUI só mede de novo ao rolar: um scroll sintético tira um estado que ficou velho.
    const medirDeNovo = () => lista.querySelector('[data-slot="scroll-shadow"]')?.dispatchEvent(new Event("scroll"));
    void animacao.finished.then(medirDeNovo, () => undefined);
    return () => animacao.cancel();
  }, [chaveAbas, direcaoAbas]);
  return (
    <Tabs variant="secondary" selectedKey={selectedKey} onSelectionChange={(chave: Key) => onSelectionChange(String(chave))} className="flex min-h-0 flex-1 flex-col gap-0">
      <div className="mb-5 flex shrink-0 flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-separator">
        {/* Não encolhe: espremida, a lista ganha as setas de rolagem do HeroUI por cima das abas. */}
        <div ref={barraRef} className="flex shrink-0 items-end gap-2" data-abas-direcao={direcaoAbas}>
          <Tabs.ListContainer className={navegacao ? `${classeListaBase} ${semRolagemDoHeroUI}` : classeListaBase}>
            <Tabs.List aria-label={props["aria-label"]} className="gap-4 bg-transparent p-0">
              {tabs.map((aba) => <Tabs.Tab key={aba.id} id={aba.id} className={classeAba}>{aba.label}<Tabs.Indicator className={classeIndicador} /></Tabs.Tab>)}
            </Tabs.List>
          </Tabs.ListContainer>
          {navegacao ? <div className="mb-1 flex items-center">{navegacao}</div> : null}
        </div>
        {actions ? <div className="mb-2 flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </Tabs>
  );
}

export const PageTabPanel = Tabs.Panel;
