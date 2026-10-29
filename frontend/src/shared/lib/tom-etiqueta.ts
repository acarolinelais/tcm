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
