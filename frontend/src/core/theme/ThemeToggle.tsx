import { Sun } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/shared/lib/utils";
import { DarkModeIcon } from "@/shared/ui/figma-icons";
import { useTheme } from "./use-theme";

/**
 * Liga e desliga o tema escuro (spec 034). O ícone mostra o tema em uso; `aria-pressed`, se o escuro está ligado.
 * Desenho do Figma (spec 050): círculo de 29px com a borda dos cartões, o mesmo na Navbar e no login.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { tema, alternar } = useTheme();
  // A animação do ícone só roda depois de uma troca por este toggle, não quando a página carrega.
  const [trocou, setTrocou] = useState(false);
  const escuro = tema === "dark";
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
      className={cn("flex size-[29px] shrink-0 items-center justify-center rounded-full border border-edge bg-surface text-body transition-[color,background-color,transform] duration-100 ease-out hover:bg-default hover:text-foreground active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
    >
      {/* A key remonta o ícone a cada troca, para a animação de entrada rodar de novo (spec 049). */}
      {escuro
        ? <DarkModeIcon key={tema} className={cn(trocou && "tema-icone-entrar")} />
        : <Sun key={tema} aria-hidden="true" className={cn("size-3.5", trocou && "tema-icone-entrar")} strokeWidth={1.75} />}
    </button>
  );
}
