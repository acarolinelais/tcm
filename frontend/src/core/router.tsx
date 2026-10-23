import { Navigate, createBrowserRouter } from "react-router";

import { AppLayout } from "@/core/layout/AppLayout";
import { EmBreve } from "@/core/layout/EmBreve";
import { overviewRoutes } from "@/modules/overview";
import { usuariosRoutes } from "@/modules/usuarios";
import { LoginPage } from "@/core/auth/LoginPage";
import { AlterarSenhaPage } from "@/core/auth/AlterarSenhaPage";
import { PerfisPage } from "@/modules/perfis/PerfisPage";
import { SetoresPage } from "@/modules/setores/SetoresPage";
import { TimesPage } from "@/modules/times/TimesPage";
import { UsuariosPage } from "@/modules/usuarios/pages/UsuariosPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: "trocar-senha", element: <AlterarSenhaPage /> },
      ...overviewRoutes,
      { path: "board", element: <EmBreve titulo="Board" /> },
      { path: "timeline", element: <EmBreve titulo="Timeline" /> },
      ...usuariosRoutes,
      { path: "perfis", element: <PerfisPage /> },
      { path: "admin/perfis", element: <PerfisPage /> },
      { path: "admin/usuarios", element: <UsuariosPage modoAdmin /> },
      { path: "admin/setores", element: <SetoresPage /> },
      { path: "admin/times", element: <TimesPage modoAdmin /> },
      { path: "times", element: <TimesPage /> },
    ],
  },
]);
