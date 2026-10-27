import type { RouteObject } from "react-router";

import { ConfiguracoesPage } from "./pages/ConfiguracoesPage";

export const configuracoesRoutes: RouteObject[] = [{ path: "configuracoes", element: <ConfiguracoesPage /> }];
