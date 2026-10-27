import type { RouteObject } from "react-router";

import { ProjetoDetalhePage } from "./pages/ProjetoDetalhePage";
import { ProjetosEntradaPage } from "./pages/ProjetosEntradaPage";
import { ResultadosGeraisPage } from "./pages/ResultadosGeraisPage";

export const projetosRoutes: RouteObject[] = [
  { path: "resultados-gerais", element: <ResultadosGeraisPage /> },
  { path: "projetos", element: <ProjetosEntradaPage /> },
  { path: "projetos/:projetoId", element: <ProjetoDetalhePage /> },
];
