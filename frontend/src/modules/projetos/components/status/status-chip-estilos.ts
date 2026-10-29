import { tomDoToken, type TomEtiqueta } from "@/shared/lib/tom-etiqueta";
import { TONS_ETIQUETA } from "@/shared/ui/tag-chip";

import type { StatusCasoTeste } from "../../model/projeto";

/** Cores das etiquetas de status do Test Case (Figma TCM 2070:1476). Done e In Fixes herdam os tons de Pass e Fail. */
export const statusChipTons: Record<StatusCasoTeste, TomEtiqueta> = {
  "To-Do": tomDoToken("etiqueta-todo"),
  InProgress: tomDoToken("etiqueta-progress"),
  InReview: tomDoToken("etiqueta-review"),
  InValidation: tomDoToken("etiqueta-validation"),
  Done: TONS_ETIQUETA.ativo,
  InFixes: tomDoToken("etiqueta-fixes"),
  Cancelled: tomDoToken("etiqueta-cancelled"),
};
