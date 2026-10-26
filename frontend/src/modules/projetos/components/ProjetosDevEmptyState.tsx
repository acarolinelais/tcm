import { useTranslation } from "react-i18next";

import { InboxIcon } from "@/shared/ui/figma-icons";

/** Projects vazio do dev (Figma TCM 2310-157): a moldura cinza ocupa o cartão, com a caixa de entrada no centro. */
export function ProjetosDevEmptyState() {
  const { t } = useTranslation();
  return <div className="flex min-h-0 flex-1 items-center justify-center rounded-[30px] bg-[#F3F5F7] p-6">
    <div role="status" className="max-w-[34rem] text-center">
      <InboxIcon className="mx-auto mb-3 text-[#454442]" />
      <h1 className="text-[18px] font-medium leading-[22px] text-[#454442]">{t("devProjectsEmpty")}</h1>
      <p className="mt-2 text-[15px] leading-[18px] text-[#777777]">{t("devProjectsEmptyHint")}</p>
    </div>
  </div>;
}
