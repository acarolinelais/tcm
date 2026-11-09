import { TONS_ETIQUETA, TagChip } from "@/shared/ui/tag-chip";

import { statusChipTons } from "../status/status-chip-estilos";

/** PASS e FAIL ganham as etiquetas de Done e In Fixes; outros valores do SDF (N/A, check...) ganham a neutra. */
export function ResultadoFormFactor({ valor }: { valor: string | undefined }) {
  if (!valor) return <span className="text-muted">—</span>;
  const status = /^pass$/i.test(valor) ? "Done" : /^fail$/i.test(valor) ? "InFixes" : null;
  return <TagChip tom={status ? statusChipTons[status] : TONS_ETIQUETA.neutro}>{valor}</TagChip>;
}

