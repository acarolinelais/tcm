import { Navigate, createBrowserRouter } from "react-router";

import { AppLayout } from "@/core/layout/AppLayout";
import { EmBreve } from "@/core/layout/EmBreve";
import { LoginPage } from "@/core/auth/LoginPage";
import { AlterarSenhaPage } from "@/core/auth/AlterarSenhaPage";
import { configuracoesRoutes } from "@/modules/configuracoes";
import { modelosDispositivoRoutes } from "@/modules/modelos-dispositivo";
import { overviewRoutes } from "@/modules/overview";
import { perfisRoutes } from "@/modules/perfis";
import { projetosRoutes } from "@/modules/projetos";
import { setoresRoutes } from "@/modules/setores";
import { timesRoutes } from "@/modules/times";
import { usuariosRoutes } from "@/modules/usuarios";

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
      ...modelosDispositivoRoutes,
      { path: "timeline", element: <EmBreve titulo="timeline" ilustracao="timeline" /> },
      { path: "documentation", element: <EmBreve titulo="documentation" /> },
      ...configuracoesRoutes,
      ...usuariosRoutes,
      ...perfisRoutes,
      ...setoresRoutes,
      ...timesRoutes,
    ],
  },
]);
