export type StatusProjeto = "Created" | "To Do" | "InProgress" | "Completed" | "Canceled";
export type CategoriaCasoTeste = "A" | "B" | "C";
export type DificuldadeCasoTeste = "Low" | "Medium" | "High";
export type SituacaoCasoTeste = "To-Do" | "InProgress" | "InReview" | "Pass" | "Fail";

export interface Projeto {
  id: string;
  unidade_id: string;
  time_id: string;
  app: string;
  one_ui: string;
  nome: string;
  status: StatusProjeto;
  ativo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ModeloDispositivo {
  id: string;
  unidade_id: string;
  nome: string;
  ativo: boolean;
}

export interface CasoTeste {
  id: string;
  unidade_id: string;
  projeto_id: string;
  tc_id: string;
  category: CategoriaCasoTeste;
  difficulty: DificuldadeCasoTeste;
  situation: SituacaoCasoTeste;
  responsavel_id: string;
  backup_id: string | null;
  ativo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface LinhaFormFactor {
  tc_id: string;
  sdf_id: string;
  modelo_dispositivo_id: string;
  modelo_nome: string;
  resultado: string;
  data_reportada: string;
  one_ui: string;
}

export interface ImportacaoProjeto {
  projeto: Projeto;
  quantidade_casos: number;
}

export interface ImportacaoSdf {
  importacao_id: string;
  quantidade_execucoes: number;
  quantidade_resultados: number;
}

export interface CriarProjetoInput {
  time_id: string;
  app: string;
  one_ui: string;
  modelos_ids: string[];
}

export interface AtualizarProjetoInput {
  app: string;
  one_ui: string;
}

export interface CriarCasoTesteInput {
  tc_id: string;
  category: CategoriaCasoTeste;
  difficulty: DificuldadeCasoTeste;
  responsavel_id: string;
  backup_id: string;
}

export interface AtualizarCasoTesteInput {
  category?: CategoriaCasoTeste;
  difficulty?: DificuldadeCasoTeste;
  situation?: SituacaoCasoTeste;
  responsavel_id?: string;
  backup_id?: string | null;
}
