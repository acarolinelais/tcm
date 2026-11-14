import { formatDate } from "@/core/i18n/format";

/** Data gravada pelo sistema (specs 065 e 073): só o dia na célula; dia e hora no `title`. */
export function DataDoSistema({ valor }: { valor?: string | null }) {
  if (!valor) return <span className="block text-center">—</span>;
  return <time className="block text-center" dateTime={valor} title={formatDate(valor, { dateStyle: "medium", timeStyle: "short" })}>{formatDate(valor, { dateStyle: "medium" })}</time>;
}
