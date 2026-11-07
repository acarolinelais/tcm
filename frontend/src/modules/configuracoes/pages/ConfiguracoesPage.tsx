import { Button } from "@heroui/react";
import { useState } from "react";
import { useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { TrocarSenhaDrawer } from "@/core/auth/TrocarSenhaDrawer";
import { LanguageSelector } from "@/core/i18n/LanguageSelector";
import { SeletorCorAvatar } from "../components/SeletorCorAvatar";

export function ConfiguracoesPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const [trocandoSenha, setTrocandoSenha] = useState(false);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[42px] border border-edge bg-card px-7 py-8 sm:px-11 sm:py-10">
      <header className="mb-8"><h1 className="text-2xl font-medium text-accent-text">{t("settings")}</h1><p className="mt-1.5 text-[14px] leading-5 text-muted">{t("settingsDescription")}</p></header>
      <div className="max-w-3xl rounded-2xl border border-border">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <h2 className="text-[15px] font-medium text-body">{t("settingsLanguageTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("settingsLanguageHint")}</p>
          </div>
          {/* Grava o idioma preferido da conta, como no cabeçalho. */}
          <LanguageSelector perfil={perfil} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-5">
          <div>
            <h2 id="titulo-cor-avatar" className="text-[15px] font-medium text-body">{t("settingsAvatarTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("settingsAvatarHint")}</p>
          </div>
          <SeletorCorAvatar perfil={perfil} labelledBy="titulo-cor-avatar" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-5">
          <div>
            <h2 className="text-[15px] font-medium text-body">{t("settingsPasswordTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("settingsPasswordHint")}</p>
          </div>
          <Button variant="outline" size="sm" onPress={() => setTrocandoSenha(true)}>{t("changePassword")}</Button>
        </div>
      </div>
      <TrocarSenhaDrawer isOpen={trocandoSenha} onFechar={() => setTrocandoSenha(false)} />
    </section>
  );
}
