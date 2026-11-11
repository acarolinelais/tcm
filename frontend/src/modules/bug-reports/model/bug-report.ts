// Os tipos da linha ficam no módulo projetos, que também os usa na My Fixes (spec 073, ADR 0009).
export type { CasoComFalhas, FalhaSdf } from "@/modules/projetos/model/projeto";

export interface FiltrosBugReport {
  modelo_dispositivo_id?: string;
  responsavel?: string;
  dev_fix?: string;
  /** `AAAA-MM-DD` (dia) ou `AAAA-Www` (semana), como o Day or Week da General Results. */
  periodo?: string;
  /** Spec 073: só os casos a partir da segunda tentativa de correção. */
  reincidentes?: boolean;
}
