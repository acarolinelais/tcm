import { Badge } from "@/shared/ui/badge";

import type { StatusCasoTeste } from "../model/projeto";
import { statusBadgeBase, statusBadges } from "./status-badge-estilos";

export function StatusBadgeContent({ status, label }: { status: StatusCasoTeste; label: string }) {
  const { icon, Icon } = statusBadges[status];
  return <span className="inline-flex items-center gap-1.5">
    <span aria-hidden="true" className={`flex size-4 shrink-0 items-center justify-center rounded-full text-white ${icon}`}><Icon className="size-2.5 stroke-[3]" /></span>
    <span>{label}</span>
  </span>;
}

/** Pill de leitura do Status; quem pode editar usa as mesmas classes no `SelectTrigger`. */
export function StatusPill({ status, label }: { status: StatusCasoTeste; label: string }) {
  return <Badge variant="secondary" className={`${statusBadgeBase} ${statusBadges[status].badge}`}><StatusBadgeContent status={status} label={label} /></Badge>;
}
