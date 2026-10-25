import { Badge } from "@/shared/ui/badge";

import type { CategoriaCasoTeste } from "../model/projeto";
import { atributoCasoBadgeClass } from "./atributos-caso-badge-estilos";

export function SituacaoBadge({ label }: { label: string }) {
  return <Badge variant="secondary" className={atributoCasoBadgeClass}>{label}</Badge>;
}

export function DificuldadeBadge({ label }: { label: string }) {
  return <Badge variant="secondary" className={atributoCasoBadgeClass}>{label}</Badge>;
}

export function CategoriaBadge({ value }: { value: CategoriaCasoTeste }) {
  return <Badge variant="secondary" className={atributoCasoBadgeClass}>{value}</Badge>;
}
