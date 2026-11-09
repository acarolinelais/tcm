import { tomDoToken, type TomEtiqueta } from "@/shared/lib/tom-etiqueta";

import type { StatusProjeto } from "../../model/projeto";

/** Cores das etiquetas de status do projeto na listagem de Projects. */
export const statusProjetoTons: Record<StatusProjeto, TomEtiqueta> = {
  Created: tomDoToken("projeto-created"),
  "To Do": tomDoToken("projeto-todo"),
  InProgress: tomDoToken("projeto-progress"),
  Completed: tomDoToken("projeto-completed"),
  Canceled: tomDoToken("projeto-canceled"),
};
