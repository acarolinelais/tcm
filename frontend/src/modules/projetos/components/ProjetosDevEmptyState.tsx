import { useTranslation } from "react-i18next";

import { EstadoVazio } from "@/shared/ui/estado-vazio";

/** Projects vazio do dev (Figma TCM 2310-157): a moldura cinza ocupa o cartão, com o estado vazio no centro. */
export function ProjetosDevEmptyState() {
  const { t } = useTranslation();
  return <div className="flex min-h-0 flex-1 items-center justify-center rounded-[30px] bg-panel p-6">
    <EstadoVazio tituloDaPagina className="max-w-[34rem]" titulo={t("devProjectsEmpty")} dica={t("devProjectsEmptyHint")} />
  </div>;
}
