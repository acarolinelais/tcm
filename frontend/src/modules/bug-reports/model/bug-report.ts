import type { StatusCasoTeste } from "@/modules/projetos/model/projeto";

/** Caso + device cujo resultado mais recente no SDF é FAIL (spec 070). */
export interface FalhaAberta {
  caso_teste_id: string;
  tc_id: string;
  titulo: string | null;
  status: StatusCasoTeste;
  projeto_id: string;
  projeto_nome: string;
  time_id: string;
  modelo_dispositivo_id: string;
  modelo_nome: string;
  sdf_id: string | null;
  motivo: string | null;
  data_execucao: string;
  responsavel_id: string;
  responsavel_identificador: string | null;
  backup_id: string | null;
}

export interface FiltrosBugReport {
  projeto_id?: string;
  modelo_dispositivo_id?: string;
  responsavel?: string;
}
