import type { HTMLAttributes } from "react";

import { cn } from "@/shared/lib/utils";

/** Cartão branco da página (Figma TCM, spec 022): raio 50px, borda `#F2F2F2` e 50px de recuo no desktop. */
export function PageCard({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-separator bg-surface px-5 py-6 sm:rounded-[50px] sm:p-[50px]", className)}
      {...props}
    />
  );
}

/** Título da página: Inter 500 22px `#454442`. */
export function PageTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cn("truncate text-[22px] font-medium leading-[27px] text-body", className)} {...props} />;
}
