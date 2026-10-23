import { useTranslation } from "react-i18next";

export function EmBreve({ titulo }: { titulo: string }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-3xl border border-border bg-card px-6 py-5">
      <h1 className="text-lg font-semibold text-foreground">{t(titulo.toLowerCase())}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("comingSoon")}</p>
    </div>
  );
}
