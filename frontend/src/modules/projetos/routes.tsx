import type { RouteObject } from "react-router";

import { BoardKanbanPage } from "./pages/BoardKanbanPage";
import { BoardPage } from "./pages/BoardPage";
import { ProjetoDetalhePage } from "./pages/ProjetoDetalhePage";
import { ProjetosEntradaPage } from "./pages/ProjetosEntradaPage";
import { ResultadosGeraisPage } from "./pages/ResultadosGeraisPage";

export const projetosRoutes: RouteObject[] = [
  { path: "board", element: <BoardPage /> },
  { path: "board/:projetoId", element: <BoardKanbanPage /> },
  { path: "resultados-gerais", element: <ResultadosGeraisPage /> },
  { path: "projetos", element: <ProjetosEntradaPage /> },
  { path: "projetos/:projetoId", element: <ProjetoDetalhePage /> },
];
