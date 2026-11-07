import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";
import { InboxIcon } from "@/shared/ui/figma-icons";

/**
 * Estado vazio do protótipo (spec 055, RN-04): ícone azul, título e frase de apoio. A mensagem é de cada tela.
 * `tituloDaPagina`: quando o vazio é o único título da tela, vira `h1` em vez de `h2`.
 * `compacto`: ícone e textos menores, para o vazio dentro de um cartão (gráficos da Overview).
 */
export function EstadoVazio({ titulo, dica, icone, tituloDaPagina = false, compacto = false, className, children }: {
  titulo: string;
  dica: string;
  icone?: ReactNode;
  tituloDaPagina?: boolean;
  compacto?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const Titulo = tituloDaPagina ? "h1" : "h2";
  return (
    <div role="status" className={cn("w-full max-w-md text-center", className)}>
      <div className={cn("flex justify-center text-accent-text", compacto ? "mb-2" : "mb-3")}>
        {icone ?? <InboxIcon className={compacto ? "h-[18px] w-[25px]" : undefined} />}
      </div>
      <Titulo className={cn("font-medium text-body", compacto ? "text-[15px] leading-[20px]" : "text-[18px] leading-[22px]")}>{titulo}</Titulo>
      <p className={cn("text-subtle", compacto ? "mt-1 text-[13px] leading-[18px]" : "mt-2 text-[15px] leading-[18px]")}>{dica}</p>
      {children}
    </div>
  );
}
