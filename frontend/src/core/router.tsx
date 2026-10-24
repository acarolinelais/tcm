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
import { TimeDetalhePage } from "@/modules/times/TimeDetalhePage";
import { UsuariosPage } from "@/modules/usuarios/pages/UsuariosPage";
import { projetosRoutes } from "@/modules/projetos";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: "trocar-senha", element: <AlterarSenhaPage /> },
      ...overviewRoutes,
      ...projetosRoutes,
      { path: "board", element: <EmBreve titulo="board" ilustracao="board" /> },
      { path: "timeline", element: <EmBreve titulo="timeline" ilustracao="timeline" /> },
      { path: "documentation", element: <EmBreve titulo="documentation" /> },
      ...usuariosRoutes,
      { path: "perfis", element: <PerfisPage /> },
      { path: "admin/perfis", element: <PerfisPage /> },
      { path: "admin/usuarios", element: <UsuariosPage modoAdmin /> },
      { path: "admin/setores", element: <SetoresPage /> },
      { path: "admin/times", element: <TimesPage modoAdmin /> },
      { path: "admin/times/:timeId", element: <TimeDetalhePage modoAdmin /> },
      { path: "times", element: <TimesPage /> },
      { path: "times/:timeId", element: <TimeDetalhePage /> },
    ],
  },
]);
