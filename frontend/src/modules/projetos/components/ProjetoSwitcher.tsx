import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import { useProjetos } from "../hooks/useProjetos";

const titulo = "truncate text-2xl font-medium text-primary";

// Título do projeto; com outros projetos visíveis, vira um menu para trocar de projeto.
export function ProjetoSwitcher({ projetoId, nome }: { projetoId: string; nome: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // 100 é o page_size máximo da API de projetos.
  const projetos = useProjetos(1, 100);
  const outros = (projetos.data?.items ?? []).filter((projeto) => projeto.id !== projetoId);

  if (!outros.length) return <h1 className={titulo}>{nome}</h1>;

  return (
    <h1 className="min-w-0">
      <Menu.Root>
        <Menu.Trigger className={`${titulo} inline-flex max-w-full items-center gap-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring`}>
          <span className="truncate">{nome}</span>
          <ChevronDown aria-hidden="true" className="size-5 shrink-0 transition-transform duration-150 [[data-popup-open]>&]:rotate-180" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="start" sideOffset={6} className="z-[70] outline-none">
            <Menu.Popup aria-label={t("switchProject")} className="popover-enter max-h-80 min-w-56 overflow-y-auto rounded-xl border border-border bg-card p-1 text-sm text-card-foreground shadow-lg outline-none">
              <Menu.RadioGroup value={projetoId} onValueChange={(id: string) => navigate(`/projetos/${id}`)}>
                {projetos.data?.items.map((projeto) => (
                  <Menu.RadioItem
                    key={projeto.id}
                    value={projeto.id}
                    className="flex cursor-default items-center justify-between gap-3 rounded-lg px-3 py-2 outline-none data-[highlighted]:bg-secondary data-[checked]:font-medium data-[checked]:text-primary"
                  >
                    <span className="truncate">{projeto.nome}</span>
                    <Menu.RadioItemIndicator>
                      <Check aria-hidden="true" className="size-4" />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </h1>
  );
}
