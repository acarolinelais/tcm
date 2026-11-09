/** Par de cores de uma etiqueta do Figma: fundo claro e texto na cor forte. */
export interface TomEtiqueta {
  fundo: string;
  texto: string;
}

/** Tons definidos no `global.css`; um nome fora da lista viraria um `var()` inexistente e o chip ficaria sem cor. */
export type NomeTom =
  | `etiqueta-${"todo" | "progress" | "review" | "validation" | "fixes" | "cancelled" | "ativo" | "neutro"}`
  | `projeto-${"created" | "todo" | "progress" | "completed" | "canceled"}`;

/** Par de tokens `--<nome>-bg`/`--<nome>-fg` do `global.css`, com valor nos dois temas (ADR 0041). */
export function tomDoToken(nome: NomeTom): TomEtiqueta {
  return { fundo: `var(--${nome}-bg)`, texto: `var(--${nome}-fg)` };
}

/**
 * Status do Test Case (Figma TCM 2070:1476). Done e In Fixes herdam os tons de Pass e Fail. Fica aqui, e não só
 * no módulo de projetos, porque a Auditoria (spec 052) também mostra o Status.
 */
export const TONS_STATUS_CASO_TESTE: Record<string, TomEtiqueta> = {
  "To-Do": tomDoToken("etiqueta-todo"),
  InProgress: tomDoToken("etiqueta-progress"),
  InReview: tomDoToken("etiqueta-review"),
  InValidation: tomDoToken("etiqueta-validation"),
  Done: tomDoToken("etiqueta-ativo"),
  InFixes: tomDoToken("etiqueta-fixes"),
  Cancelled: tomDoToken("etiqueta-cancelled"),
};
