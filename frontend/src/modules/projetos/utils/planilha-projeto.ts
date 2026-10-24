import type { CategoriaCasoTeste, DificuldadeCasoTeste, SituacaoCasoTeste } from "../model/projeto";

type ExcelWorkbook = import("@e965/xlsx").WorkBook;

export interface CasoTestePlanilha {
  linha: number;
  tc_id: string;
  category: CategoriaCasoTeste;
  difficulty: DificuldadeCasoTeste;
  situation: SituacaoCasoTeste;
  responsavel: string;
  backup: string;
}

export interface PlanilhaProjeto {
  app: string;
  one_ui: string;
  casos: CasoTestePlanilha[];
}

export interface ErroPlanilhaProjeto {
  campo: string;
  mensagem: string;
}

export class PlanilhaProjetoError extends Error {
  constructor(readonly errors: ErroPlanilhaProjeto[]) {
    super("A planilha possui dados inválidos.");
    this.name = "PlanilhaProjetoError";
  }
}

const cabecalhosObrigatorios = ["app", "tc id", "difficulty", "category", "tc situation", "one ui", "assignees", "backup"];

function texto(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function cabecalho(value: unknown): string {
  return texto(value).toLocaleLowerCase().replaceAll("_", " ").split(/\s+/).filter(Boolean).join(" ");
}

function falha(errors: ErroPlanilhaProjeto[]): never {
  throw new PlanilhaProjetoError(errors);
}

function lerBytes(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => reader.result instanceof ArrayBuffer ? resolve(reader.result) : reject(new Error("Invalid file data"));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsArrayBuffer(file);
  });
}

export async function lerPlanilhaProjeto(file: File): Promise<PlanilhaProjeto> {
  const XLSX = await import("@e965/xlsx");
  let workbook: ExcelWorkbook;
  try {
    workbook = XLSX.read(await lerBytes(file), { type: "array", cellDates: false });
  } catch {
    return falha([{ campo: "arquivo", mensagem: "O arquivo não é uma planilha Excel válida." }]);
  }

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return falha([{ campo: "cabecalho", mensagem: "A planilha está vazia." }]);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, raw: false, defval: "", blankrows: false });
  if (!rows.length) return falha([{ campo: "cabecalho", mensagem: "A planilha está vazia." }]);
  const headers = rows[0].map(cabecalho);
  const indexes = new Map<string, number>();
  const errors: ErroPlanilhaProjeto[] = [];
  headers.forEach((name, index) => {
    if (!name) return;
    if (indexes.has(name)) errors.push({ campo: `linha.1.${name}`, mensagem: "O cabeçalho está duplicado." });
    indexes.set(name, index);
  });
  for (const name of cabecalhosObrigatorios) {
    if (!indexes.has(name)) errors.push({ campo: `linha.1.${name}`, mensagem: "Coluna obrigatória não encontrada." });
  }
  if (errors.length) return falha(errors);

  const casos: CasoTestePlanilha[] = [];
  const idsVistos = new Set<string>();
  let app = "";
  let oneUi = "";
  rows.slice(1).forEach((row, index) => {
    const lineNumber = index + 2;
    const get = (name: string) => texto(row[indexes.get(name)!]);
    if (!row.some((value) => texto(value))) return;
    const appDaLinha = get("app");
    const oneUiDaLinha = get("one ui");
    if (!app && appDaLinha) app = appDaLinha;
    if (!oneUi && oneUiDaLinha) oneUi = oneUiDaLinha;

    const tcId = get("tc id");
    const categoryValue = get("category").toUpperCase();
    const difficultyValue = get("difficulty").toLocaleLowerCase();
    const situationValue = (get("tc situation") || "To-Do").toLocaleLowerCase();
    const category = (["A", "B", "C"].includes(categoryValue) ? categoryValue : null) as CategoriaCasoTeste | null;
    const difficulty = ({ low: "Low", medium: "Medium", high: "High" } as const)[difficultyValue as "low" | "medium" | "high"];
    const situation = ({ "to-do": "To-Do", inprogress: "InProgress", inreview: "InReview", pass: "Pass", fail: "Fail" } as const)[situationValue as "to-do" | "inprogress" | "inreview" | "pass" | "fail"];
    const responsavel = get("assignees");
    const backup = get("backup");

    if (!tcId) errors.push({ campo: `linha.${lineNumber}.tc id`, mensagem: "TC ID é obrigatório." });
    else if (idsVistos.has(tcId)) errors.push({ campo: `linha.${lineNumber}.tc id`, mensagem: "TC ID duplicado na planilha." });
    else idsVistos.add(tcId);
    if (!category) errors.push({ campo: `linha.${lineNumber}.category`, mensagem: "Use A, B ou C." });
    if (!difficulty) errors.push({ campo: `linha.${lineNumber}.difficulty`, mensagem: "Use Low, Medium ou High." });
    if (!situation) errors.push({ campo: `linha.${lineNumber}.tc situation`, mensagem: "Use To-Do, InProgress, InReview, Pass ou Fail." });
    if (!responsavel) errors.push({ campo: `linha.${lineNumber}.assignees`, mensagem: "Responsável é obrigatório." });
    if (!backup) errors.push({ campo: `linha.${lineNumber}.backup`, mensagem: "Backup é obrigatório." });

    if (tcId && category && difficulty && situation && responsavel && backup) {
      casos.push({ linha: lineNumber, tc_id: tcId, category, difficulty, situation, responsavel, backup });
    }
  });

  if (!app) errors.push({ campo: "linha.1.app", mensagem: "Informe o App em pelo menos uma linha." });
  if (!oneUi) errors.push({ campo: "linha.1.one ui", mensagem: "Informe a versão One UI em pelo menos uma linha." });
  if (!casos.length) errors.push({ campo: "linha.1.tc id", mensagem: "A planilha precisa conter ao menos um Test Case válido." });
  if (errors.length) return falha(errors);
  return { app, one_ui: oneUi, casos };
}
