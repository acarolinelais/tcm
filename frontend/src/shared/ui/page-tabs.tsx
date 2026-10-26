import type { Key, ReactNode } from "react";
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
  /** Os `Tabs.Panel` de cada aba, com o mesmo `id`. */
  children: ReactNode;
}

// Abas do Figma (TCM 2070:1476): ativa Inter 500 18px #2D72E4 com sublinhado de 1.5px; inativa Inter 400 `text-muted`;
// linha de base #ECEFF2. A variante "secondary" do HeroUI só estiliza a lista quando ela é filha direta do Tabs; aqui
// ela divide a barra com as ações, então o sublinhado e o fundo transparente vão nas classes.
const classeAba = "h-auto w-auto rounded-none px-0.5 pb-2 pt-0 text-[18px] font-normal leading-[25px] text-muted data-[selected=true]:font-medium data-[selected=true]:text-[#2D72E4]";
const classeIndicador = "top-auto bottom-0 h-[1.5px] rounded-none bg-[#2D72E4] shadow-none";

/** Abas de página (spec 022) sobre o `Tabs` do HeroUI, com espaço para as ações da aba na mesma barra. */
export function PageTabs({ tabs, selectedKey, onSelectionChange, actions, children, ...props }: PageTabsProps) {
  return (
    <Tabs variant="secondary" selectedKey={selectedKey} onSelectionChange={(chave: Key) => onSelectionChange(String(chave))} className="flex min-h-0 flex-1 flex-col gap-0">
      <div className="mb-5 flex shrink-0 flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-[#ECEFF2]">
        <Tabs.ListContainer className="rounded-none bg-transparent p-0">
          <Tabs.List aria-label={props["aria-label"]} className="gap-4 bg-transparent p-0">
            {tabs.map((aba) => <Tabs.Tab key={aba.id} id={aba.id} className={classeAba}>{aba.label}<Tabs.Indicator className={classeIndicador} /></Tabs.Tab>)}
          </Tabs.List>
        </Tabs.ListContainer>
        {actions ? <div className="mb-2 flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </Tabs>
  );
}

export const PageTabPanel = Tabs.Panel;
