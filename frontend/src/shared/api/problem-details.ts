export interface ProblemDetailsError {
  campo: string;
  mensagem: string;
  /** Membros de extensão dos erros de planilha (ADR 0033). */
  codigo?: string;
  linha?: number | null;
  coluna?: string | null;
  valor?: string | null;
  parametros?: Record<string, unknown> | null;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  errors?: ProblemDetailsError[];
  total_linhas?: number;
}

export class ApiError extends Error {
  constructor(public readonly problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
  }
}
