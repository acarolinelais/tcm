import type { CorAvatar } from "@/core/auth/api";
import type { AlteracaoCasoTeste } from "@/modules/projetos/model/projeto";

export type VisaoTimeline = "dia" | "semana" | "mes";

/** Dias locais à meia-noite; `fim` é o último dia do período (inclusivo). */
export interface Periodo {
  inicio: Date;
  fim: Date;
}

export interface PessoaTimeline {
  id: string;
  nome: string;
  cor_avatar: CorAvatar;
}

export interface CasoTimeline {
  id: string;
  tc_id: string;
  title: string | null;
}

/** As mudanças de um caso em um dia, com o responsável atual do caso (spec 054, RN-04). Quem fez cada uma está em `alteracoes`. */
export interface CardTimeline {
  caso_teste_id: string;
  tc_id: string;
  responsavel_id: string;
  responsavel_nome: string;
  responsavel_cor_avatar: CorAvatar;
  dia: string;
  primeira_em: string;
  alteracoes: AlteracaoCasoTeste[];
}

export interface Timeline {
  pessoas: PessoaTimeline[];
  casos: CasoTimeline[];
  cards: CardTimeline[];
}

export interface FiltrosTimeline {
  responsavelIds: string[];
  casoIds: string[];
}
