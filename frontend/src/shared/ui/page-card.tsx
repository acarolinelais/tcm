import type { HTMLAttributes } from "react";

import { cn } from "@/shared/lib/utils";

/** Cartão da página (Figma TCM, specs 022 e 050): raio 50px, borda `--edge` e 50px de recuo no desktop. */
export function PageCard({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-edge bg-surface px-5 py-6 sm:rounded-[50px] sm:p-[50px]", className)}
      {...props}
    />
  );
}

/** Frase de apoio sob o título: o que a página faz (mesmo estilo da Teams e da General Results). */
export function PageDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1.5 text-[14px] leading-5 text-muted", className)} {...props} />;
}

/** Título da página: Inter 500 22px na cor de acento (spec 055, RN-09). */
export function PageTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cn("truncate text-[22px] font-medium leading-[27px] text-accent-text", className)} {...props} />;
}
