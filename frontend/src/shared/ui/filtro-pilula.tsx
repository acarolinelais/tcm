import type { ReactNode } from "react";
import { ToggleButton } from "@heroui/react";
import { Check } from "lucide-react";

import { cn } from "@/shared/lib/utils";

/** Filtro liga/desliga em pílula, com ícone, rótulo e o check quando ligado (projetos encerrados, reincidentes). */
export function FiltroPilula({ ligado, onChange, icone, rotulo, autoFocus }: { ligado: boolean; onChange: (ligado: boolean) => void; icone: ReactNode; rotulo: string; autoFocus?: boolean }) {
  return (
    <ToggleButton
      isSelected={ligado}
      onChange={onChange}
      autoFocus={autoFocus}
      className={cn(
        "shrink-0 gap-2 rounded-full border px-4 font-medium shadow-none transition-[background-color,border-color,transform] duration-100 ease-out data-[pressed]:scale-[0.97] motion-reduce:transition-none motion-reduce:data-[pressed]:scale-100",
        ligado ? "border-accent/20 bg-accent-tint text-accent-text" : "border-edge bg-surface text-body hover:bg-page dark:text-muted",
      )}
    >
      {icone}
      {rotulo}
      {ligado && <Check aria-hidden="true" className="size-4" strokeWidth={2} />}
    </ToggleButton>
  );
}
