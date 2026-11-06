import { z } from "zod";

// Espelha o ModeloDispositivoResponse do backend (ADR 0007).
export interface ModeloDispositivo {
  id: string;
  unidade_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ModeloDispositivoFiltros {
  busca?: string;
  ativo?: boolean;
}

export const NOME_MAX_LENGTH = 100;
export const DESCRICAO_MAX_LENGTH = 100;

export const createModeloDispositivoFormSchema = (t: (key: string) => string) => z.object({
  nome: z.string().trim().min(1, t("requiredField")).max(NOME_MAX_LENGTH, t("deviceModelNameMax")),
  descricao: z.string().trim().max(DESCRICAO_MAX_LENGTH, t("deviceModelDescriptionMax")),
});

export type ModeloDispositivoFormValues = z.infer<ReturnType<typeof createModeloDispositivoFormSchema>>;
