import type { CSSProperties, ReactNode } from "react";
import { Chip } from "@heroui/react";

import { cn } from "@/shared/lib/utils";

/** Par de cores de uma etiqueta do Figma: fundo claro e texto na cor forte. */
export interface TomEtiqueta {
  fundo: string;
  texto: string;
}

/** Tons sem domínio (spec 022, referência visual). Status de domínio ficam no módulo dono. */
export const TONS_ETIQUETA = {
  ativo: { fundo: "#DCF7E8", texto: "#3C8355" },
  neutro: { fundo: "#EDEFF1", texto: "#777777" },
} satisfies Record<string, TomEtiqueta>;

// 17px de altura, raio pleno, Inter 500 12px. O texto sempre acompanha a cor.
export const tagChipClass = "h-[17px] gap-0 whitespace-nowrap rounded-full px-2 py-0 text-[12px] font-medium leading-4";

export function TagChip({ tom, children, className }: { tom: TomEtiqueta; children: ReactNode; className?: string }) {
  return (
    <Chip className={cn(tagChipClass, className)} style={{ "--chip-bg": tom.fundo, "--chip-fg": tom.texto } as CSSProperties}>
      {children}
    </Chip>
  );
}
