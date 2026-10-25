import type { CategoriaCasoTeste, DificuldadeCasoTeste, SituacaoCasoTeste } from "../model/projeto";

const badgeBase = "h-7 w-fit gap-1 rounded-full border px-2.5 py-0 text-xs font-medium shadow-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const situacaoClasses: Record<SituacaoCasoTeste, string> = {
  New: "border-blue-200 bg-blue-50 text-blue-800",
  "New Step": "border-violet-200 bg-violet-50 text-violet-800",
  "Without Changes": "border-slate-200 bg-slate-100 text-slate-700",
};

const dificuldadeClasses: Record<DificuldadeCasoTeste, string> = {
  Low: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Medium: "border-amber-200 bg-amber-50 text-amber-800",
  High: "border-rose-200 bg-rose-50 text-rose-800",
};

const categoriaClasses: Record<CategoriaCasoTeste, string> = {
  A: "border-border bg-muted text-foreground",
  B: "border-border bg-muted text-foreground",
  C: "border-border bg-muted text-foreground",
};

export function situacaoBadgeClass(value: SituacaoCasoTeste) {
  return `${badgeBase} ${situacaoClasses[value]}`;
}

export function dificuldadeBadgeClass(value: DificuldadeCasoTeste) {
  return `${badgeBase} ${dificuldadeClasses[value]}`;
}

export function categoriaBadgeClass(value: CategoriaCasoTeste) {
  return `${badgeBase} ${categoriaClasses[value]}`;
}
