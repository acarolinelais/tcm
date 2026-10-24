import type { RouteObject } from "react-router";

import { ModelosDispositivoPage } from "./ModelosDispositivoPage";
import { ProjetoDetalhePage } from "./ProjetoDetalhePage";
import { ProjetosEntradaPage } from "./ProjetosEntradaPage";

export const projetosRoutes: RouteObject[] = [
  { path: "projetos", element: <ProjetosEntradaPage /> },
  { path: "projetos/:projetoId", element: <ProjetoDetalhePage /> },
  { path: "modelos-dispositivo", element: <ModelosDispositivoPage /> },
];
