import type { RouteObject } from "react-router";

import { SetoresPage } from "./pages/SetoresPage";

export const setoresRoutes: RouteObject[] = [{ path: "admin/setores", element: <SetoresPage /> }];
