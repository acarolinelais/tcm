import type { TomEtiqueta } from "@/shared/ui/tag-chip";

import type { StatusProjeto } from "../../model/projeto";

/** Cores das etiquetas de status do projeto na listagem de Projects. */
export const statusProjetoTons: Record<StatusProjeto, TomEtiqueta> = {
  Created: { fundo: "#E6EFFF", texto: "#3672F2" },
  "To Do": { fundo: "#EFF0F2", texto: "#686B70" },
  InProgress: { fundo: "#FFF1DD", texto: "#A36012" },
  Completed: { fundo: "#E3F6E9", texto: "#278A4C" },
  Canceled: { fundo: "#FDE8E8", texto: "#B64646" },
};
