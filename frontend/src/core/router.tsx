import { Navigate, createBrowserRouter } from "react-router";

import { AppLayout } from "@/core/layout/AppLayout";
import { EmBreve } from "@/core/layout/EmBreve";
import { overviewRoutes } from "@/modules/overview";
import { usuariosRoutes } from "@/modules/usuarios";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      ...overviewRoutes,
      { path: "board", element: <EmBreve titulo="Board" /> },
      { path: "timeline", element: <EmBreve titulo="Timeline" /> },
      ...usuariosRoutes,
    ],
  },
]);
