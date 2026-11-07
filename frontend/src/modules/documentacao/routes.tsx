import type { RouteObject } from "react-router";

import { DocumentacaoPage } from "./pages/DocumentacaoPage";
import { GuiaPage } from "./pages/GuiaPage";

export const documentacaoRoutes: RouteObject[] = [
  { path: "documentation", element: <DocumentacaoPage /> },
  { path: "documentation/:slug", element: <GuiaPage /> },
];
