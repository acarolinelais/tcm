import { useTranslation } from "react-i18next";
import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

import { atualizarIdiomaPreferido, type PerfilAtual } from "@/core/auth/api";
import i18n, { TEMP_LANGUAGE_KEY } from "@/core/i18n";
import { getAccessToken } from "@/core/auth/session";
import { languages, type LanguageCode } from "./resources";
import { toast } from "@/shared/lib/toast";
import { useDismiss } from "@/shared/lib/use-dismiss";

export function LanguageSelector({ perfil }: { perfil?: PerfilAtual }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useDismiss(menuRef, aberto, useCallback(() => setAberto(false), []));
  const atual = languages.find(({ code }) => code === i18n.resolvedLanguage)?.label ?? "English";

  async function selecionar(code: LanguageCode) {
    setAberto(false);
    const anterior = i18n.resolvedLanguage ?? "en";
    if (!perfil) {
      window.sessionStorage.setItem(TEMP_LANGUAGE_KEY, code);
      await i18n.changeLanguage(code);
      return;
    }
    const queryKey = ["auth", "me", getAccessToken()];
    const perfilEmCache = queryClient.getQueryData<PerfilAtual>(queryKey);
    queryClient.setQueryData<PerfilAtual>(queryKey, (atual) => atual ? { ...atual, idioma_preferido: code } : atual);
    await i18n.changeLanguage(code);
    try {
      await atualizarIdiomaPreferido(code);
      window.sessionStorage.removeItem(TEMP_LANGUAGE_KEY);
    } catch {
      if (perfilEmCache) queryClient.setQueryData(queryKey, perfilEmCache);
      await i18n.changeLanguage(anterior);
      toast.error(t("languageSaveError"));
    }
  }

  return <div ref={menuRef} className="relative">
    <button type="button" aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto((value) => !value)} className="flex items-center gap-1.5 text-sm text-foreground">
      <span aria-hidden="true">🌐</span>{atual}<ChevronDown aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
    {aberto && <div role="menu" className="popover-enter absolute right-0 top-8 z-50 min-w-36 rounded-xl border border-border bg-card p-1.5 shadow-lg">
      {languages.map(({ code, label }) => <button key={code} role="menuitem" type="button" onClick={() => void selecionar(code)} className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary ${code === i18n.resolvedLanguage ? "font-medium text-primary" : ""}`}>{label}</button>)}
    </div>}
  </div>;
}
