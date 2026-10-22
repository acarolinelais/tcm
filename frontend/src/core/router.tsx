import { Navigate, createBrowserRouter } from "react-router";

import { AppLayout } from "@/core/layout/AppLayout";
import { usuariosRoutes } from "@/modules/usuarios";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [{ index: true, element: <Navigate to="/usuarios" replace /> }, ...usuariosRoutes],
  },
]);
