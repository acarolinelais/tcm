import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { LanguageSelector } from "@/core/i18n/LanguageSelector";
import { ThemeToggle } from "@/core/theme/ThemeToggle";
import ilustracao from "@/shared/assets/figma/illustrations/login.svg";
import logo from "@/shared/assets/figma/icons/logo-tcm.svg";

/** Moldura das telas de entrada (login e troca de senha). Com `perfil`, a troca de idioma é salva na conta. */
export function AuthLayout({ titulo, dica, perfil, children }: { titulo: string; dica: string; perfil?: PerfilAtual; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    // Tema e idioma ficam numa linha acima do cartão, no fluxo da página: em janelas baixas o cartão centralizado
    // não sobe por baixo deles (spec 050). Mesma distância das bordas de antes: 80px à direita e 52px no topo.
    <main className="flex min-h-screen flex-col bg-page p-5 sm:p-8">
      <div className="flex shrink-0 items-center justify-end gap-4 sm:px-12 sm:pt-5">
        <ThemeToggle />
        <LanguageSelector perfil={perfil} className="gap-1.5 text-[15px] text-body" />
      </div>

      <div className="flex flex-1 items-center justify-center py-5">
        {/* Layout do Figma (TCM, node 2191:99): card de 1042×612, ilustração à esquerda e formulário à direita. */}
        <section className="grid w-full max-w-[65.125rem] overflow-hidden rounded-[2rem] border border-edge bg-surface lg:min-h-[38.25rem] lg:grid-cols-2 lg:rounded-[50px]">
          <aside className="hidden items-center justify-center rounded-[50px] border border-edge bg-accent-tint px-10 lg:flex">
            <img src={ilustracao} alt="" className="w-full max-w-[27.375rem] dark:brightness-[.85]" />
          </aside>

          <div className="flex flex-col px-6 pb-[35px] pt-[55px] sm:px-12 lg:px-[5.5rem]">
            <div className="w-full max-w-[22.125rem]">
              <header>
                <img src={logo} alt="TCM" className="h-[35px] w-auto" />
                <h1 className="mt-[34px] text-[25px] font-medium leading-[30px] text-accent-text">{titulo}</h1>
                <p className="mt-2.5 text-sm leading-[17px] text-subtle">{dica}</p>
              </header>
              {children}
            </div>
            <p className="mt-[73px] w-full max-w-[22.125rem] text-center text-sm leading-[17px] text-subtle">{t("loginCredits")}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
