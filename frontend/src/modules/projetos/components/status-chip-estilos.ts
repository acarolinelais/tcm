import { TONS_ETIQUETA, type TomEtiqueta } from "@/shared/ui/tag-chip";

import type { StatusCasoTeste } from "../model/projeto";

/** Cores das etiquetas de status do Test Case (Figma TCM 2070:1476; Fail aprovado na spec 022). */
export const statusChipTons: Record<StatusCasoTeste, TomEtiqueta> = {
  "To-Do": { fundo: "#EDFAFF", texto: "#5B8DD4" },
  InProgress: { fundo: "#FEF2DE", texto: "#855F2E" },
  InReview: { fundo: "#F0F4FF", texto: "#6A68BE" },
  InValidation: { fundo: "#F7EFF3", texto: "#C75DA8" },
  Pass: TONS_ETIQUETA.ativo,
  Fail: { fundo: "#FDEEEE", texto: "#C2474B" },
};
