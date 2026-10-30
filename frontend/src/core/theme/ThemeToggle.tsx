import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/shared/lib/utils";
import { useTheme } from "./use-theme";

/** Liga e desliga o tema escuro (spec 034). O ícone mostra o tema em uso; `aria-pressed`, se o escuro está ligado. */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { tema, alternar } = useTheme();
  // A animação do ícone só roda depois de uma troca por este toggle, não quando a página carrega.
  const [trocou, setTrocou] = useState(false);
  const escuro = tema === "dark";
  const Icone = escuro ? Moon : Sun;
  return (
    <button
      type="button"
      aria-label={t("darkTheme")}
      aria-pressed={escuro}
      title={t("darkTheme")}
      onClick={() => {
        setTrocou(true);
        alternar();
      }}
      className={cn("flex size-8 items-center justify-center rounded-full text-body transition-colors hover:bg-default hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
    >
      {/* A key remonta o ícone a cada troca, para a animação de entrada rodar de novo (spec 049). */}
      <Icone key={tema} aria-hidden="true" className={cn("size-4", trocou && "tema-icone-entrar")} strokeWidth={1.75} />
    </button>
  );
}
