import type { PerfilAtual } from "@/core/auth/api";
import { useNavigate } from "react-router";
import { httpPost } from "@/core/api/http-client";
import { clearTokens } from "@/core/auth/session";
import { ChevronDown, CircleArrowRight } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/core/i18n/LanguageSelector";
import { useDismiss } from "@/shared/lib/use-dismiss";

export function Navbar({ perfil }: { perfil: PerfilAtual }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useDismiss(menuRef, menuAberto, useCallback(() => setMenuAberto(false), []));
  async function sair() {
    try {
      await httpPost<void>("/api/auth/logout", {});
    } finally {
      clearTokens();
      navigate("/login", { replace: true });
    }
  }
  return (
    <header className="col-span-2 col-start-1 row-start-1 flex h-8 items-center justify-end">
      <div className="flex shrink-0 items-center gap-5">
        <LanguageSelector perfil={perfil} />
        <div ref={menuRef} className="relative">
          <button type="button" aria-haspopup="menu" aria-expanded={menuAberto} onClick={() => setMenuAberto(!menuAberto)} title={t("userMenu")} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#8880F7] text-[10px] font-medium text-white">
              {perfil.nome.slice(0, 1).toUpperCase()}
            </span>
            <span className="max-w-40 truncate text-sm font-medium">{perfil.nome.split(" ")[0]}</span>
            <ChevronDown aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          </button>
          {menuAberto && <div role="menu" aria-label={perfil.email} className="popover-enter absolute right-0 top-10 z-50 min-w-44 rounded-xl border border-border bg-card p-1.5 shadow-lg">
            <p aria-hidden="true" className="truncate px-2 py-1.5 text-xs text-muted-foreground">{perfil.email}</p>
            <button type="button" role="menuitem" onClick={sair} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10">
              <CircleArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span>{t("logout")}</span>
            </button>
          </div>}
        </div>
      </div>
    </header>
  );
}
