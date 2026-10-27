import { TagChip } from "@/shared/ui/tag-chip";

import { statusChipTons } from "../status/status-chip-estilos";

/** Pass e Fail ganham a etiqueta do Status; outros valores do SDF aparecem como texto, sem alteração. */
export function ResultadoFormFactor({ valor }: { valor: string | undefined }) {
  if (!valor) return <span className="text-muted">—</span>;
  const status = /^pass$/i.test(valor) ? "Pass" : /^fail$/i.test(valor) ? "Fail" : null;
  if (!status) return <>{valor}</>;
  return <TagChip tom={statusChipTons[status]}>{valor}</TagChip>;
}

