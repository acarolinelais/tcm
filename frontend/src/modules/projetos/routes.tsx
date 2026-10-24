import type { RouteObject } from "react-router";

import { ModelosDispositivoPage } from "./ModelosDispositivoPage";
import { ProjetoDetalhePage } from "./ProjetoDetalhePage";
import { ProjetosPage } from "./ProjetosPage";

export const projetosRoutes: RouteObject[] = [
  { path: "projetos", element: <ProjetosPage /> },
  { path: "projetos/:projetoId", element: <ProjetoDetalhePage /> },
  { path: "modelos-dispositivo", element: <ModelosDispositivoPage /> },
];
