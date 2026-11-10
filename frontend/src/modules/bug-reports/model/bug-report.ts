import type { StatusCasoTeste } from "@/modules/projetos/model/projeto";

/** Um resultado do SDF que é falha: tudo que não é PASS, N/A, NA ou Check (spec 072, RN-01). */
export interface FalhaSdf {
  modelo_dispositivo_id: string;
  modelo_nome: string;
  sdf_id: string | null;
  resultado: string;
  descricao: string | null;
  data_execucao: string;
}

/** Uma linha de SDF Failures: o caso e as falhas dele, da mais recente para a mais antiga. */
export interface CasoComFalhas {
  caso_teste_id: string;
  tc_id: string;
  status: StatusCasoTeste;
  time_id: string;
  responsavel_id: string;
  responsavel_identificador: string | null;
  backup_id: string | null;
  dev_fix_id: string | null;
  dev_fix_identificador: string | null;
  falhas: FalhaSdf[];
}

export interface FiltrosBugReport {
  modelo_dispositivo_id?: string;
  responsavel?: string;
  dev_fix?: string;
  /** `AAAA-MM-DD` (dia) ou `AAAA-Www` (semana), como o Day or Week da General Results. */
  periodo?: string;
}
