import { formatDate } from "@/core/i18n/format";
import { lerDiaIso } from "@/shared/lib/utils";

/** `AAAA-MM-DD` lido no fuso local: `new Date("2026-10-10")` seria meia-noite UTC e mudaria o dia a oeste de Greenwich. */
export function formatarDia(dia: string) {
  return formatDate(lerDiaIso(dia), { dateStyle: "short" });
}
