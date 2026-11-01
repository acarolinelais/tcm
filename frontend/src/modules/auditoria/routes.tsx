import type { RouteObject } from "react-router";

import { AuditoriaPage } from "./pages/AuditoriaPage";

export const auditoriaRoutes: RouteObject[] = [{ path: "admin/auditoria", element: <AuditoriaPage /> }];
