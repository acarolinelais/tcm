import { ToggleButton } from "@heroui/react";
import { Archive, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/shared/lib/utils";

/** Pílula que liga a exibição dos projetos Completed e Canceled, no estilo do seletor "Day or Week". */
export function FiltroEncerrados({ ligado, onChange, autoFocus }: { ligado: boolean; onChange: (ligado: boolean) => void; autoFocus?: boolean }) {
  const { t } = useTranslation();
  return (
    <ToggleButton
      isSelected={ligado}
      onChange={onChange}
      autoFocus={autoFocus}
      className={cn(
        "shrink-0 gap-2 rounded-full border px-4 font-medium shadow-none transition-[background-color,border-color,transform] duration-100 ease-out data-[pressed]:scale-[0.97] motion-reduce:transition-none motion-reduce:data-[pressed]:scale-100",
        ligado ? "border-accent/20 bg-accent-tint text-accent-text" : "border-edge bg-surface text-body hover:bg-page dark:text-muted",
      )}
    >
      <Archive aria-hidden="true" className="size-4" strokeWidth={1.75} />
      {t("showClosedProjects")}
      {ligado && <Check aria-hidden="true" className="size-4" strokeWidth={2} />}
    </ToggleButton>
  );
}
