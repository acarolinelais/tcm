/** Lista de opções de filtro precedida de "Todos" (valor vazio), como pede docs/tables-rules.md. */
export function comOpcaoTodos<O extends { value: string; label: string }>(rotuloTodos: string, opcoes: readonly O[]) {
  return [{ value: "", label: rotuloTodos }, ...opcoes];
}
