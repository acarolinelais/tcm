import { TONS_STATUS_CASO_TESTE, type TomEtiqueta } from "@/shared/lib/tom-etiqueta";

import type { StatusCasoTeste } from "../../model/projeto";

/** Cores das etiquetas de status do Test Case: o mapa fica em `shared` desde a spec 052 (Auditoria). */
export const statusChipTons: Record<StatusCasoTeste, TomEtiqueta> = TONS_STATUS_CASO_TESTE;
