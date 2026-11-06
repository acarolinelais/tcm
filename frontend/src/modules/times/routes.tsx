import type { RouteObject } from "react-router";

import { TimeDetalhePage } from "./pages/TimeDetalhePage";
import { TimesPage } from "./pages/TimesPage";

export const timesRoutes: RouteObject[] = [
  { path: "admin/times", element: <TimesPage modoAdmin /> },
  { path: "admin/times/:timeId", element: <TimeDetalhePage modoAdmin /> },
  { path: "times", element: <TimesPage /> },
  { path: "times/:timeId", element: <TimeDetalhePage /> },
];
