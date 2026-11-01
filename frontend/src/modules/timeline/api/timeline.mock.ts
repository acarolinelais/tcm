import { formatarDiaIso, lerDiaIso } from "@/shared/lib/utils";

import type { CardTimeline, FiltrosTimeline, PessoaTimeline, Timeline } from "../model/timeline";

const PESSOAS: PessoaTimeline[] = [
  { id: "mock-ana", nome: "Ana Souza", cor_avatar: "roxo" },
  { id: "mock-bia", nome: "Bia Lima", cor_avatar: "vermelho" },
  { id: "mock-caio", nome: "Caio Pereira", cor_avatar: "azul" },
  { id: "mock-dani", nome: "Dani Rocha", cor_avatar: "verde" },
];
const CASOS = [
  ["Clock_00001", "Criar alarme"],
  ["Clock_00046", "Soneca do alarme"],
  ["Clock_00050", "Cronômetro em segundo plano"],
  ["Clock_00072", "Fuso horário mundial"],
].map(([tc_id, title]) => ({ id: `mock-${tc_id}`, tc_id, title }));
const STATUS = ["To-Do", "InProgress", "InReview", "Done"];

/**
 * Modo de demonstração (spec 010): cards de exemplo em cada dia do período, como a Overview faz (spec
 * 039). O histórico real só existe na API (spec 038).
 */
export function timelineMock(inicio: string, fim: string, filtros: FiltrosTimeline): Timeline {
  const cards: CardTimeline[] = [];
  for (let data = lerDiaIso(inicio); formatarDiaIso(data) <= fim; data.setDate(data.getDate() + 1)) {
    const semente = data.getDate();
    // Dois a três cards por dia útil; o fim de semana fica vazio.
    if (data.getDay() === 0 || data.getDay() === 6) continue;
    for (let i = 0; i < 2 + (semente % 2); i++) {
      const pessoa = PESSOAS[(semente + i) % PESSOAS.length];
      const caso = CASOS[(semente * 3 + i) % CASOS.length];
      const quando = new Date(data.getFullYear(), data.getMonth(), data.getDate(), 9 + i * 3, 15);
      const mudancas = 1 + ((semente + i) % 3);
      cards.push({
        caso_teste_id: caso.id,
        tc_id: caso.tc_id,
        responsavel_id: pessoa.id,
        responsavel_nome: pessoa.nome,
        responsavel_cor_avatar: pessoa.cor_avatar,
        dia: formatarDiaIso(data),
        primeira_em: quando.toISOString(),
        alteracoes: Array.from({ length: mudancas }, (_, n) => ({
          campo: "status",
          valor_anterior: STATUS[n % STATUS.length],
          valor_novo: STATUS[(n + 1) % STATUS.length],
          usuario_nome: pessoa.nome,
          usuario_perfil: "Key Person",
          origem: "api",
          alterado_em: new Date(quando.getTime() + n * 600_000).toISOString(),
        })).reverse(),
      });
    }
  }
  const presentes = new Set(cards.map((card) => card.responsavel_id));
  const comCaso = new Set(cards.map((card) => card.caso_teste_id));
  return {
    pessoas: PESSOAS.filter((pessoa) => presentes.has(pessoa.id)),
    casos: CASOS.filter((caso) => comCaso.has(caso.id)),
    cards: cards.filter(
      (card) =>
        (!filtros.responsavelIds.length || filtros.responsavelIds.includes(card.responsavel_id)) &&
        (!filtros.casoIds.length || filtros.casoIds.includes(card.caso_teste_id)),
    ),
  };
}
