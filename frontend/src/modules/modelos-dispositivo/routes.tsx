import type { RouteObject } from "react-router";

import { ModelosDispositivoPage } from "./pages/ModelosDispositivoPage";

export const modelosDispositivoRoutes: RouteObject[] = [{ path: "admin/modelos-dispositivo", element: <ModelosDispositivoPage /> }];
