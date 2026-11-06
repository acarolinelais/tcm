import type { RouteObject } from "react-router";

import { PerfisPage } from "./pages/PerfisPage";

export const perfisRoutes: RouteObject[] = [
  { path: "perfis", element: <PerfisPage /> },
  { path: "admin/perfis", element: <PerfisPage /> },
];
