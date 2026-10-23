import { Navigate, Outlet, useLocation } from "react-router";

import { ApiError } from "@/shared/api/problem-details";
import { clearTokens, getAccessToken } from "@/core/auth/session";
import { usePerfilAtual } from "@/core/auth/usePerfilAtual";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const location = useLocation();
  const token = getAccessToken();
  const perfil = usePerfilAtual(Boolean(token));
  if (!token) return <Navigate to="/login" replace />;
  if (perfil.isLoading) return <div className="p-8 text-sm text-muted-foreground">Carregando perfil...</div>;
  if (perfil.error instanceof ApiError && perfil.error.problem.status === 401) {
    clearTokens();
    return <Navigate to="/login" replace />;
  }
  if (!perfil.data) return <div role="alert" className="p-8 text-sm">Não foi possível carregar seu perfil.</div>;
  if (perfil.data.senha_alteracao_obrigatoria) {
    return location.pathname === "/trocar-senha"
      ? <Outlet context={perfil.data} />
      : <Navigate to="/trocar-senha" replace />;
  }
  if (location.pathname === "/trocar-senha") return <Navigate to="/overview" replace />;

  return (
    <div className="box-border grid min-h-screen grid-cols-[clamp(8.75rem,18vw,15rem)_minmax(0,1fr)] grid-rows-[2rem_minmax(0,1fr)] gap-x-[clamp(1rem,5.5vw,2.75rem)] gap-y-4 bg-[#FBFBFB] p-[clamp(0.5rem,1.25vw,1rem)] max-sm:grid-cols-[3.5rem_minmax(0,1fr)]">
      <Sidebar perfil={perfil.data} />
      <Navbar perfil={perfil.data} />
      <main className="col-start-2 row-start-2 min-h-0 min-w-0">
        <Outlet context={perfil.data} />
      </main>
    </div>
  );
}
