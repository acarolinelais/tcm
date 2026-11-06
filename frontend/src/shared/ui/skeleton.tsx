import { useTranslation } from "react-i18next";

import { cn } from "@/shared/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-secondary motion-reduce:animate-none", className)} />;
}

// Mesmo contorno do cartão das páginas de listagem, para a tela não saltar quando os dados chegam.
export function PageSkeleton({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <section role="status" className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[42px] border border-[#EEEEF1] bg-card px-7 py-8 sm:px-11 sm:py-10">
      <span className="sr-only">{label ?? t("loading")}</span>
      <Skeleton className="h-8 w-48" />
      <div className="mt-7 space-y-3">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}
      </div>
    </section>
  );
}
