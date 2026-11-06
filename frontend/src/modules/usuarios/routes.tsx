import type { RouteObject } from "react-router";

import { UsuariosPage } from "./pages/UsuariosPage";

export const usuariosRoutes: RouteObject[] = [{ path: "usuarios", element: <UsuariosPage /> }];
