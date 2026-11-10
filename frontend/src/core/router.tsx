import { Navigate, createBrowserRouter } from "react-router";

import { AppLayout } from "@/core/layout/AppLayout";
import { LoginPage } from "@/core/auth/LoginPage";
import { AlterarSenhaPage } from "@/core/auth/AlterarSenhaPage";
import { auditoriaRoutes } from "@/modules/auditoria";
import { bugReportsRoutes } from "@/modules/bug-reports";
import { configuracoesRoutes } from "@/modules/configuracoes";
import { documentacaoRoutes } from "@/modules/documentacao";
import { modelosDispositivoRoutes } from "@/modules/modelos-dispositivo";
import { overviewRoutes } from "@/modules/overview";
import { perfisRoutes } from "@/modules/perfis";
import { projetosRoutes } from "@/modules/projetos";
import { setoresRoutes } from "@/modules/setores";
import { timelineRoutes } from "@/modules/timeline";
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
      ...timelineRoutes,
      ...documentacaoRoutes,
      ...configuracoesRoutes,
      ...usuariosRoutes,
      ...perfisRoutes,
      ...setoresRoutes,
      ...timesRoutes,
      ...auditoriaRoutes,
      ...bugReportsRoutes,
    ],
  },
]);
