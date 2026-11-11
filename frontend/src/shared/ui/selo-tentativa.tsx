import { useTranslation } from "react-i18next";

/** Spec 073, RN-14: a partir da segunda tentativa de correção, o número dela ao lado do TC ID. */
export function SeloTentativa({ tentativa }: { tentativa: number | undefined }) {
  const { t } = useTranslation();
  if (!tentativa || tentativa < 2) return null;
  return (
    <span className="shrink-0 whitespace-nowrap rounded-full bg-warning-soft px-2 py-0.5 text-[12px] font-medium leading-4 text-warning-soft-foreground">
      {t("fixAttempt", { count: tentativa })}
    </span>
  );
}
