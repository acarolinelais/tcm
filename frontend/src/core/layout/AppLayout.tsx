import { Navigate, Outlet, useLocation } from "react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { ApiError } from "@/shared/api/problem-details";
import { clearTokens, getAccessToken } from "@/core/auth/session";
import { usePerfilAtual } from "@/core/auth/usePerfilAtual";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { languageCode, TEMP_LANGUAGE_KEY } from "@/core/i18n";

export function AppLayout() {
  const [sidebarRecolhida, setSidebarRecolhida] = useState(false);
  const location = useLocation();
  const token = getAccessToken();
  const perfil = usePerfilAtual(Boolean(token));
  const { i18n } = useTranslation();
  const idiomaConta = perfil.data ? languageCode(perfil.data.idioma_preferido) : undefined;
  const sincronizandoIdioma = Boolean(idiomaConta && i18n.resolvedLanguage !== idiomaConta);
  useEffect(() => {
    if (!perfil.data) return;
    const idioma = languageCode(perfil.data.idioma_preferido);
    window.sessionStorage.removeItem(TEMP_LANGUAGE_KEY);
    if (i18n.resolvedLanguage !== idioma) void i18n.changeLanguage(idioma);
  }, [i18n, perfil.data]);
  if (!token) return <Navigate to="/login" replace />;
  if (perfil.isLoading) return <div className="p-8 text-sm text-muted-foreground">{i18n.t("loadingProfile")}</div>;
  if (sincronizandoIdioma) return <div className="p-8 text-sm text-muted-foreground">{i18n.t("loadingProfile")}</div>;
  if (perfil.error instanceof ApiError && perfil.error.problem.status === 401) {
    clearTokens();
    return <Navigate to="/login" replace />;
  }
  if (!perfil.data) return <div role="alert" className="p-8 text-sm">{i18n.t("profileLoadError")}</div>;
  if (perfil.data.senha_alteracao_obrigatoria) {
    return location.pathname === "/trocar-senha"
      ? <Outlet context={perfil.data} />
      : <Navigate to="/trocar-senha" replace />;
  }
  if (location.pathname === "/trocar-senha") return <Navigate to="/overview" replace />;

  return (
    <div className={`box-border grid h-dvh min-h-0 overflow-hidden transition-[grid-template-columns] ${sidebarRecolhida ? "duration-[550ms]" : "duration-300"} ease-in-out motion-reduce:transition-none ${sidebarRecolhida ? "grid-cols-[4rem_minmax(0,1fr)]" : "grid-cols-[clamp(8.75rem,18vw,15rem)_minmax(0,1fr)] max-sm:grid-cols-[minmax(9rem,35vw)_minmax(0,1fr)]"} grid-rows-[2rem_minmax(0,1fr)] gap-x-[clamp(1rem,5.5vw,2.75rem)] gap-y-4 bg-[#FBFBFB] p-[clamp(0.5rem,1.25vw,1rem)]`}>
      <Sidebar perfil={perfil.data} recolhida={sidebarRecolhida} onToggle={() => setSidebarRecolhida((recolhida) => !recolhida)} />
      <Navbar perfil={perfil.data} />
      <main className="col-start-2 row-start-2 min-h-0 min-w-0">
        <Outlet context={perfil.data} />
      </main>
    </div>
  );
}
