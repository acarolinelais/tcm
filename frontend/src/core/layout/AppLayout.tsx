import { Navigate, Outlet, useLocation } from "react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { ApiError } from "@/shared/api/problem-details";
import { clearTokens, getAccessToken } from "@/core/auth/session";
import { renovarSessao } from "@/core/api/http-client";
import { usePerfilAtual } from "@/core/auth/usePerfilAtual";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { languageCode, TEMP_LANGUAGE_KEY } from "@/core/i18n";
import { Skeleton } from "@heroui/react";
import { PageSkeleton } from "@/shared/ui/page-skeleton";

export function AppLayout() {
  // Abaixo de 1024px a Sidebar abre recolhida: aberta, deixava ~420px para o conteúdo num tablet. A pessoa ainda a abre.
  const [sidebarRecolhida, setSidebarRecolhida] = useState(() =>
    typeof window.matchMedia === "function" && window.matchMedia("(max-width: 63.999rem)").matches,
  );
  const location = useLocation();
  const [renovando, setRenovando] = useState(() => !getAccessToken());
  useEffect(() => {
    if (!renovando) return;
    renovarSessao()
      .catch(() => false)
      .finally(() => setRenovando(false));
  }, [renovando]);
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
  if (renovando) return <AppSkeleton label={i18n.t("loadingProfile")} />;
  if (!token) return <Navigate to="/login" replace />;
  if (perfil.isLoading || sincronizandoIdioma) return <AppSkeleton label={i18n.t("loadingProfile")} />;
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
    <div className={`box-border grid h-dvh min-h-0 overflow-hidden transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${sidebarRecolhida ? "grid-cols-[4.5rem_minmax(0,1fr)] max-sm:gap-x-3" : "grid-cols-[clamp(17.5rem,20vw,18.3125rem)_minmax(0,1fr)] max-sm:grid-cols-[minmax(9rem,35vw)_minmax(0,1fr)]"} grid-rows-[2rem_minmax(0,1fr)] gap-x-[clamp(1rem,5.5vw,2.75rem)] gap-y-4 bg-page p-[clamp(0.5rem,1.25vw,1rem)]`}>
      <Sidebar perfil={perfil.data} recolhida={sidebarRecolhida} onToggle={() => setSidebarRecolhida((recolhida) => !recolhida)} />
      <Navbar perfil={perfil.data} />
      <main className="col-start-2 row-start-2 min-h-0 min-w-0">
        <Outlet context={perfil.data} />
      </main>
    </div>
  );
}

// Esqueleto da casca do app enquanto o perfil carrega: sidebar, barra do topo e o cartão da página.
function AppSkeleton({ label }: { label: string }) {
  return (
    <div className="box-border grid h-dvh min-h-0 grid-cols-[clamp(17.5rem,20vw,18.3125rem)_minmax(0,1fr)] grid-rows-[2rem_minmax(0,1fr)] gap-x-[clamp(1rem,5.5vw,2.75rem)] gap-y-4 overflow-hidden bg-page p-[clamp(0.5rem,1.25vw,1rem)] max-sm:grid-cols-[minmax(9rem,35vw)_minmax(0,1fr)]">
      <div aria-hidden="true" className="col-start-1 row-span-2 row-start-1 space-y-2 rounded-[2rem] border border-edge bg-card p-3">
        <Skeleton className="h-7 w-20" />
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-9 w-full rounded-xl" />)}
      </div>
      <div aria-hidden="true" className="col-start-2 row-start-1 flex items-center justify-end gap-5">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
      </div>
      <main className="col-start-2 row-start-2 min-h-0 min-w-0">
        <PageSkeleton label={label} />
      </main>
    </div>
  );
}
