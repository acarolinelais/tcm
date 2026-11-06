import { ClipboardList } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TableEmptyState } from "@/shared/ui/table";

export function ProjetosDevEmptyState() {
  const { t } = useTranslation();
  return <TableEmptyState><div role="status" className="max-w-md text-center">
    <ClipboardList aria-hidden="true" className="mx-auto mb-4 size-6 text-primary" />
    <h1 className="text-base font-semibold">{t("devProjectsEmpty")}</h1>
    <p className="mt-2 text-sm text-muted-foreground">{t("devProjectsEmptyHint")}</p>
  </div></TableEmptyState>;
}
