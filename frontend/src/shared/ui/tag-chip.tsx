import type { CSSProperties, ReactNode } from "react";
import { Chip } from "@heroui/react";

import { tomDoToken, type TomEtiqueta } from "@/shared/lib/tom-etiqueta";
import { cn } from "@/shared/lib/utils";

export type { TomEtiqueta };

/** Tons sem domínio (spec 022, referência visual). Status de domínio ficam no módulo dono. */
export const TONS_ETIQUETA = {
  ativo: tomDoToken("etiqueta-ativo"),
  neutro: tomDoToken("etiqueta-neutro"),
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
