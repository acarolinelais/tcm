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
    <div className="flex min-h-screen gap-4 bg-[#FBFBFB] p-4">
      <Sidebar perfil={perfil.data} />
      <div className="flex flex-1 flex-col gap-4">
        <Navbar perfil={perfil.data} />
        <main className="flex-1">
          <Outlet context={perfil.data} />
        </main>
      </div>
    </div>
  );
}
