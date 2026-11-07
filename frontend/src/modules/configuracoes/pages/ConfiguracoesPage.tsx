import { Button } from "@heroui/react";
import { useState } from "react";
import { useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { TrocarSenhaDrawer } from "@/core/auth/TrocarSenhaDrawer";
import { LanguageSelector } from "@/core/i18n/LanguageSelector";
import { SeletorCorAvatar } from "../components/SeletorCorAvatar";

// Um cartão por preferência, na largura toda, como no protótipo.
const CARTAO = "flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-edge px-8 py-7";
const TITULO = "text-[15px] font-medium text-body";
const DICA = "mt-1.5 text-[12px] leading-4 text-muted-foreground";

export function ConfiguracoesPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const [trocandoSenha, setTrocandoSenha] = useState(false);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[42px] border border-edge bg-card px-7 py-8 sm:px-11 sm:py-10">
      <header className="mb-8"><h1 className="text-2xl font-medium text-accent-text">{t("settings")}</h1><p className="mt-1.5 text-[14px] leading-5 text-muted">{t("settingsDescription")}</p></header>
      <div className="flex flex-col gap-4">
        <div className={CARTAO}>
          <div>
            <h2 className={TITULO}>{t("settingsLanguageTitle")}</h2>
            <p className={DICA}>{t("settingsLanguageHint")}</p>
          </div>
          {/* Grava o idioma preferido da conta, como no cabeçalho. */}
          <LanguageSelector perfil={perfil} botao />
        </div>
        <div className={CARTAO}>
          <div>
            <h2 id="titulo-cor-avatar" className={TITULO}>{t("settingsAvatarTitle")}</h2>
            <p className={DICA}>{t("settingsAvatarHint")}</p>
          </div>
          <SeletorCorAvatar perfil={perfil} labelledBy="titulo-cor-avatar" />
        </div>
        <div className={CARTAO}>
          <div>
            <h2 className={TITULO}>{t("settingsPasswordTitle")}</h2>
            <p className={DICA}>{t("settingsPasswordHint")}</p>
          </div>
          <Button variant="outline" size="sm" onPress={() => setTrocandoSenha(true)}>{t("changePassword")}</Button>
        </div>
      </div>
      <TrocarSenhaDrawer isOpen={trocandoSenha} onFechar={() => setTrocandoSenha(false)} />
    </section>
  );
}
