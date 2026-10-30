import { Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";

// Mesmo contorno do cartão das páginas de listagem, para a tela não saltar quando os dados chegam.
export function PageSkeleton({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <section role="status" className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[42px] border border-edge bg-card px-7 py-8 sm:px-11 sm:py-10">
      <span className="sr-only">{label ?? t("loading")}</span>
      <Skeleton className="h-8 w-48 rounded-md" />
      <div className="mt-7 space-y-3">
        <Skeleton className="h-10 w-full rounded-md" />
        {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-12 w-full rounded-md" />)}
      </div>
    </section>
  );
}
