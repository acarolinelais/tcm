import { Badge } from "@/shared/ui/badge";

import type { CategoriaCasoTeste, DificuldadeCasoTeste, SituacaoCasoTeste } from "../model/projeto";
import { categoriaBadgeClass, dificuldadeBadgeClass, situacaoBadgeClass } from "./atributos-caso-badge-estilos";

export function SituacaoBadge({ value, label }: { value: SituacaoCasoTeste; label: string }) {
  return <Badge variant="secondary" className={situacaoBadgeClass(value)}>{label}</Badge>;
}

export function DificuldadeBadge({ value, label }: { value: DificuldadeCasoTeste; label: string }) {
  return <Badge variant="secondary" className={dificuldadeBadgeClass(value)}>{label}</Badge>;
}

export function CategoriaBadge({ value }: { value: CategoriaCasoTeste }) {
  return <Badge variant="secondary" className={categoriaBadgeClass(value)}>{value}</Badge>;
}
