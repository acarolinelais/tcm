import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/shared/lib/utils";
import { useTheme } from "./use-theme";

/** Liga e desliga o tema escuro (spec 034). O ícone mostra o tema em uso; `aria-pressed`, se o escuro está ligado. */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { tema, alternar } = useTheme();
  const escuro = tema === "dark";
  const Icone = escuro ? Moon : Sun;
  return (
    <button
      type="button"
      aria-label={t("darkTheme")}
      aria-pressed={escuro}
      title={t("darkTheme")}
      onClick={alternar}
      className={cn("flex size-8 items-center justify-center rounded-full text-body transition-colors hover:bg-default hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
    >
      <Icone aria-hidden="true" className="size-4" strokeWidth={1.75} />
    </button>
  );
}
