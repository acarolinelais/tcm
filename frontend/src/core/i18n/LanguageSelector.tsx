import { useTranslation } from "react-i18next";
import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@heroui/react";
import { ChevronDown } from "lucide-react";

import { atualizarIdiomaPreferido, type PerfilAtual } from "@/core/auth/api";
import i18n, { TEMP_LANGUAGE_KEY } from "@/core/i18n";
import { perfilAtualQueryKey } from "@/core/auth/usePerfilAtual";
import { languages, type LanguageCode } from "./resources";
import { cn } from "@/shared/lib/utils";
import { toast } from "@/shared/lib/toast";
import { useDismiss } from "@/shared/lib/use-dismiss";
import { LanguageIcon } from "@/shared/ui/figma-icons";

export function LanguageSelector({ perfil, className, botao }: { perfil?: PerfilAtual; className?: string; botao?: boolean }) {
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
    const queryKey = perfilAtualQueryKey();
    const perfilEmCache = queryClient.getQueryData<PerfilAtual>(queryKey);
    queryClient.setQueryData<PerfilAtual>(queryKey, (atual) => atual ? { ...atual, idioma_preferido: code } : atual);
    await i18n.changeLanguage(code);
    try {
      await atualizarIdiomaPreferido(code);
      window.sessionStorage.removeItem(TEMP_LANGUAGE_KEY);
    } catch {
      // Desfaz só o idioma: o resto do perfil (ex.: a cor do avatar) pode ter mudado enquanto este PATCH corria.
      if (perfilEmCache) queryClient.setQueryData<PerfilAtual>(queryKey, (atual) => atual ? { ...atual, idioma_preferido: perfilEmCache.idioma_preferido } : atual);
      await i18n.changeLanguage(anterior);
      toast.error(t("languageSaveError"));
    }
  }

  return <div ref={menuRef} className="relative">
    {/* Em "botao" (tela Settings): sem o ícone de idioma e com o mesmo contorno do botão Change password. */}
    {botao
      ? <Button variant="outline" size="sm" aria-haspopup="menu" aria-expanded={aberto} onPress={() => setAberto((value) => !value)}>
        {atual}<ChevronDown aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
      : <button type="button" aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto((value) => !value)} className={cn("flex items-center gap-1.5 text-sm text-foreground", className)}>
        <LanguageIcon className="size-[1.1em]" />{atual}<ChevronDown aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
      </button>}
    {aberto && <div role="menu" className="popover-enter absolute right-0 top-8 z-50 min-w-36 rounded-xl border border-border bg-overlay p-1.5 shadow-overlay">
      {languages.map(({ code, label }) => <button key={code} role="menuitem" type="button" onClick={() => void selecionar(code)} className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary ${code === i18n.resolvedLanguage ? "font-medium text-accent-text" : ""}`}>{label}</button>)}
    </div>}
  </div>;
}
