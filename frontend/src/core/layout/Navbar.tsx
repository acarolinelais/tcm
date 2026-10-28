import type { PerfilAtual } from "@/core/auth/api";
import { useLocation, useNavigate } from "react-router";
import { httpPost } from "@/core/api/http-client";
import { clearTokens } from "@/core/auth/session";
import { Avatar } from "@heroui/react";
import { ChevronDown, CircleArrowRight, Search, UserRound } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/core/i18n/LanguageSelector";
import { iniciais } from "@/shared/lib/iniciais";
import { useDismiss } from "@/shared/lib/use-dismiss";
import { ChevronIcon } from "./sidebar-icons";
import { rotaPai, rotuloDaRota } from "./voltar";

/** Imagem padrão do avatar (esfera azul dos exemplos do HeroUI). Sem ela, o fallback mostra as iniciais. */
export const AVATAR_PADRAO_URL = "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg";

export function Navbar({ perfil }: { perfil: PerfilAtual }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useDismiss(menuRef, menuAberto, useCallback(() => setMenuAberto(false), []));
  const voltar = useVoltar();
  async function sair() {
    try {
      await httpPost<void>("/api/auth/logout", {});
    } finally {
      clearTokens();
      navigate("/login", { replace: true });
    }
  }
  return (
    // Layout do Figma (TCM, node 2090:199): voltar à esquerda, alinhado ao card; idioma e usuário à direita.
    <header className="col-start-2 row-start-1 grid h-8 min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,33.375rem)_minmax(0,1fr)] items-center gap-4">
      {voltar ? (
        <button
          type="button"
          onClick={voltar.ir}
          aria-label={t("backTo", { page: t(voltar.rotulo) })}
          className="flex min-w-0 items-center gap-1 rounded-lg py-1 pr-2 text-[15px] leading-[21px] text-[#454442] transition-colors hover:text-primary active:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronIcon aria-hidden="true" className="shrink-0 rotate-90" />
          <span className="truncate">{t(voltar.rotulo)}</span>
        </button>
      ) : <span />}
      {/* Só visual por enquanto (Figma): ainda não existe busca no app. */}
      <label className="hidden h-[37px] items-center gap-2.5 rounded-full border border-[#F7F8FA] bg-white px-5 md:flex">
        <Search aria-hidden="true" className="size-[13px] shrink-0 text-[#A1A19F]" strokeWidth={1.75} />
        <input type="search" aria-label={t("searchKeyword")} placeholder={t("searchKeyword")} className="min-w-0 flex-1 bg-transparent text-[15px] leading-[21px] text-[#454442] outline-none placeholder:text-[#A1A19F]" />
      </label>
      <div className="flex shrink-0 items-center justify-end gap-6 md:col-start-3">
        <LanguageSelector perfil={perfil} className="gap-2 text-[15px] text-[#454442]" />
        <div ref={menuRef} className="relative">
          <button type="button" aria-haspopup="menu" aria-expanded={menuAberto} onClick={() => setMenuAberto(!menuAberto)} title={t("userMenu")} className="flex items-center gap-1.5">
            {/* Decorativo: o nome já aparece ao lado. Tamanho e cor do Figma, menores que o `sm` do HeroUI. */}
            <Avatar aria-hidden="true" className="size-[21px]">
              <Avatar.Image src={AVATAR_PADRAO_URL} alt="" />
              {/* O atraso evita piscar as iniciais enquanto a imagem carrega. */}
              <Avatar.Fallback delayMs={600} className="bg-[#8880F7] text-[11px] font-medium text-white">
                {iniciais(perfil.nome) || <UserRound className="size-3" strokeWidth={2} />}
              </Avatar.Fallback>
            </Avatar>
            <span className="max-w-40 truncate text-[15px] font-medium text-[#454442]">{perfil.nome.split(" ")[0]}</span>
            <ChevronDown aria-hidden="true" className="size-3.5 text-[#454442]" />
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

/** Nas páginas fora da sidebar (ex.: detalhe de projeto), volta para a página principal delas. */
function useVoltar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const destino = rotaPai(pathname);
  return destino ? { rotulo: rotuloDaRota(destino), ir: () => navigate(destino) } : null;
}
