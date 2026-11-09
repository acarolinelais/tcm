import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { LanguageSelector } from "@/core/i18n/LanguageSelector";
import { ThemeToggle } from "@/core/theme/ThemeToggle";
import ilustracao from "@/shared/assets/figma/illustrations/illustration-login.svg";
import fundoDaIlustracao from "@/shared/assets/figma/illustrations/background-illustration-login.webp";
import fundoDaIlustracaoEscura from "@/shared/assets/figma/illustrations/background-illustration-login-dark.webp";
import ilustracaoEscura from "@/shared/assets/figma/illustrations/illustration-login-dark.svg";
import logo from "@/shared/assets/figma/icons/logo-tcm.svg";

/** Moldura das telas de entrada (login e troca de senha). Com `perfil`, a troca de idioma é salva na conta. */
export function AuthLayout({ titulo, dica, perfil, children }: { titulo: string; dica: string; perfil?: PerfilAtual; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    // Tema e idioma ficam numa linha acima do cartão, no fluxo da página: em janelas baixas o cartão centralizado
    // não sobe por baixo deles (spec 050). Mesma distância das bordas de antes: 80px à direita e 52px no topo.
    <main className="flex min-h-screen flex-col bg-auth-pagina p-5 sm:p-8">
      <div className="flex shrink-0 items-center justify-end gap-4 sm:px-12 sm:pt-5">
        <ThemeToggle className="border-auth-borda bg-auth-card text-auth-controle" />
        <span aria-hidden="true" className="h-[21px] w-px bg-auth-borda" />
        <LanguageSelector perfil={perfil} className="gap-1.5 text-[15px] text-auth-controle" />
      </div>

      <div className="flex flex-1 items-center justify-center py-5">
        {/* Layout do Figma (TCM, node 2191:99): card de 1042×612, ilustração à esquerda e formulário à direita. */}
        <section className="grid w-full max-w-[65.125rem] overflow-hidden rounded-[2rem] border border-auth-borda bg-auth-card lg:min-h-[38.25rem] lg:grid-cols-2 lg:rounded-[50px]">
          {/* Ilustração e fundo do protótipo, um par para cada tema (specs 055 e ajuste de 2026-11-03). Na troca de tema as
              camadas se dissolvem por opacidade (spec 049): `display` e imagem de fundo não têm transição e davam um salto.
              O fundo já vem com o "vidro" do Figma assado numa imagem (scripts/rasterizar-fundo-login.cjs): o SVG original
              tem desfoques enormes, e rasterizá-lo na troca de tema travava o clique por quase meio segundo. */}
          <aside className="relative hidden items-center justify-center overflow-hidden rounded-[50px] border border-auth-borda px-10 lg:flex">
            <div aria-hidden="true" style={{ backgroundImage: `url("${fundoDaIlustracao}")` }} className="absolute inset-0 bg-auth-fundo-claro bg-cover opacity-100 will-change-[opacity] dark:opacity-[.01]" />
            <div aria-hidden="true" style={{ backgroundImage: `url("${fundoDaIlustracaoEscura}")` }} className="absolute inset-0 bg-auth-fundo-escuro bg-cover opacity-[.01] will-change-[opacity] dark:opacity-100" />
            {/* A ilustração fica 56px abaixo do centro, como no protótipo (`top-14`). As duas ocupam o mesmo lugar. */}
            <div className="relative top-14 grid w-full max-w-[26.1875rem]">
              <img src={ilustracao} alt="" className="col-start-1 row-start-1 w-full opacity-100 will-change-[opacity] dark:opacity-[.01]" />
              <img src={ilustracaoEscura} alt="" className="col-start-1 row-start-1 w-full opacity-[.01] will-change-[opacity] dark:opacity-100" />
            </div>
          </aside>

          <div className="flex flex-col px-6 pb-[35px] pt-[55px] sm:px-12 lg:px-[5.5rem]">
            <div className="w-full max-w-[22.125rem]">
              <header>
                <img src={logo} alt="TCM" className="h-[35px] w-auto" />
                <h1 className="mt-[34px] text-[25px] font-medium leading-[30px] text-auth-titulo">{titulo}</h1>
                <p className="mt-2.5 text-sm leading-[17px] text-auth-subtitulo">{dica}</p>
              </header>
              {children}
            </div>
            <p className="mt-[73px] w-full max-w-[22.125rem] text-center text-sm leading-[17px] text-auth-subtitulo">{t("loginCredits")}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
