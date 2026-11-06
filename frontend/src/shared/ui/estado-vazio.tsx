import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";
import { InboxIcon } from "@/shared/ui/figma-icons";

/**
 * Estado vazio do protótipo (spec 055, RN-04): ícone azul, título e frase de apoio. A mensagem é de cada tela.
 * `tituloDaPagina`: quando o vazio é o único título da tela, vira `h1` em vez de `h2`.
 */
export function EstadoVazio({ titulo, dica, icone = <InboxIcon />, tituloDaPagina = false, className, children }: {
  titulo: string;
  dica: string;
  icone?: ReactNode;
  tituloDaPagina?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const Titulo = tituloDaPagina ? "h1" : "h2";
  return (
    <div role="status" className={cn("w-full max-w-md text-center", className)}>
      <div className="mb-3 flex justify-center text-accent-text">{icone}</div>
      <Titulo className="text-[18px] font-medium leading-[22px] text-body">{titulo}</Titulo>
      <p className="mt-2 text-[15px] leading-[18px] text-subtle">{dica}</p>
      {children}
    </div>
  );
}
