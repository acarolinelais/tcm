import { TONS_ETIQUETA, type TomEtiqueta } from "@/shared/ui/tag-chip";

import type { StatusCasoTeste } from "../../model/projeto";

/** Cores das etiquetas de status do Test Case (Figma TCM 2070:1476). Done e In Fixes herdam os tons de Pass e Fail. */
export const statusChipTons: Record<StatusCasoTeste, TomEtiqueta> = {
  "To-Do": { fundo: "#EDFAFF", texto: "#5B8DD4" },
  InProgress: { fundo: "#FEF2DE", texto: "#855F2E" },
  InReview: { fundo: "#F0F4FF", texto: "#6A68BE" },
  InValidation: { fundo: "#F7EFF3", texto: "#C75DA8" },
  Done: TONS_ETIQUETA.ativo,
  InFixes: { fundo: "#FDEEEE", texto: "#C2474B" },
  Cancelled: { fundo: "#F1F1F4", texto: "#5F6068" },
};
