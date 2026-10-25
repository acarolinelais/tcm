import type { RouteObject } from "react-router";

import { ProjetoDetalhePage } from "./ProjetoDetalhePage";
import { ProjetosEntradaPage } from "./ProjetosEntradaPage";
import { ResultadosGeraisPage } from "./ResultadosGeraisPage";

export const projetosRoutes: RouteObject[] = [
  { path: "resultados-gerais", element: <ResultadosGeraisPage /> },
  { path: "projetos", element: <ProjetosEntradaPage /> },
  { path: "projetos/:projetoId", element: <ProjetoDetalhePage /> },
];
