import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

/** Uma linha da pilha de uma célula que abre (specs 059 e 072), com os 40px das linhas de tabela: as linhas ficam alinhadas entre as colunas. */
export function LinhaDaPilha({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex h-10 items-center", className)}>{children}</div>;
}
