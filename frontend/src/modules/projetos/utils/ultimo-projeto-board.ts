/** Último Kanban aberto pelo Board, por pessoa (spec 037, RN-14). Só conveniência: sem storage, o Board abre o primeiro projeto. */
const chave = (usuarioId: string) => `tcm.board.ultimo-projeto.${usuarioId}`;

export function lerUltimoProjetoBoard(usuarioId: string): string | null {
  try {
    return localStorage.getItem(chave(usuarioId));
  } catch {
    return null;
  }
}

export function salvarUltimoProjetoBoard(usuarioId: string, projetoId: string) {
  try {
    localStorage.setItem(chave(usuarioId), projetoId);
  } catch {
    // Storage bloqueado (janela anônima, política do navegador): o Board volta a abrir o primeiro projeto.
  }
}
