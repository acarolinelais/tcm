import { CATEGORIAS_CASO_TESTE, DIFICULDADES_CASO_TESTE, SITUACOES_CASO_TESTE, type CategoriaCasoTeste, type DificuldadeCasoTeste, type ErroPlanilha, type SituacaoCasoTeste } from "../model/projeto";

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

type CabecalhoObrigatorio = "app" | "tc id" | "difficulty" | "category" | "tc situation" | "one ui" | "assignees" | "backup";

export interface PlanilhaProjeto {
  app: string;
  one_ui: string;
  casos: CasoTestePlanilha[];
  totalLinhas: number;
  /** Cabeçalho normalizado → texto como está na planilha, para as mensagens. */
  colunas: Record<CabecalhoObrigatorio, string>;
}

export interface PessoasDaLinha {
  linha: number;
  responsavel: string;
  backup: string;
}

export const FALHA_LEITURA = "Could not read file";

export class PlanilhaProjetoError extends Error {
  /** `pessoas` e `colunas` permitem conferir responsável e backup mesmo com a planilha inválida. */
  constructor(readonly errors: ErroPlanilha[], readonly totalLinhas?: number, readonly pessoas: PessoasDaLinha[] = [], readonly colunas?: PlanilhaProjeto["colunas"]) {
    super("A planilha possui dados inválidos.");
    this.name = "PlanilhaProjetoError";
  }
}

// Mesmas regras e códigos do validador do backend (ADR 0033).
const cabecalhosObrigatorios: Record<CabecalhoObrigatorio, string> = {
  app: "App", "tc id": "TC ID", difficulty: "Difficulty", category: "Category",
  "tc situation": "TC Situation", "one ui": "One UI", assignees: "Assignees", backup: "Backup",
};
const opcoes: Record<"category" | "difficulty" | "tc situation", readonly string[]> = {
  category: CATEGORIAS_CASO_TESTE,
  difficulty: DIFICULDADES_CASO_TESTE,
  "tc situation": SITUACOES_CASO_TESTE,
};

function texto(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function cabecalho(value: unknown): string {
  return texto(value).toLocaleLowerCase().replaceAll("_", " ").split(/\s+/).filter(Boolean).join(" ");
}

function geral(codigo: ErroPlanilha["codigo"], coluna: string | null = null): ErroPlanilha {
  return { codigo, linha: null, coluna, valor: null };
}

function falha(errors: ErroPlanilha[], totalLinhas?: number, pessoas?: PessoasDaLinha[], colunas?: PlanilhaProjeto["colunas"]): never {
  throw new PlanilhaProjetoError(errors, totalLinhas, pessoas, colunas);
}

function lerBytes(file: File, onProgress?: (progress: number) => void): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(Math.min(90, Math.floor((event.loaded / event.total) * 90)));
    };
    reader.onload = () => {
      onProgress?.(90);
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error(FALHA_LEITURA));
    };
    reader.onerror = () => reject(reader.error ?? new Error(FALHA_LEITURA));
    reader.readAsArrayBuffer(file);
  });
}

type SheetJs = typeof import("@e965/xlsx");

/**
 * Um hyperlink com referência corrompida (o Excel "repara" esses arquivos ao abrir) faz o SheetJS
 * descartar a aba inteira sem erro. Os links não importam para a importação: removemos e relemos.
 */
function semHyperlinks(XLSX: SheetJs, bytes: ArrayBuffer): Uint8Array {
  const zip = XLSX.CFB.read(new Uint8Array(bytes), { type: "array" });
  zip.FileIndex.forEach((entry: { content?: Uint8Array; size: number }, index: number) => {
    if (!entry.content || !/\/xl\/worksheets\/[^/]+\.xml$/i.test(zip.FullPaths[index])) return;
    const xml = new TextDecoder().decode(entry.content);
    const limpo = xml.replace(/<hyperlinks>[\s\S]*?<\/hyperlinks>/, "");
    if (limpo === xml) return;
    entry.content = new TextEncoder().encode(limpo);
    entry.size = entry.content.length;
  });
  return XLSX.CFB.write(zip, { type: "array", fileType: "zip" });
}

export async function lerPlanilhaProjeto(file: File, onProgress?: (progress: number) => void): Promise<PlanilhaProjeto> {
  const XLSX = await import("@e965/xlsx");
  let workbook: ExcelWorkbook;
  try {
    const bytes = await lerBytes(file, onProgress);
    workbook = XLSX.read(bytes, { type: "array", cellDates: false });
    if (workbook.SheetNames.length && !workbook.Sheets[workbook.SheetNames[0]]) {
      workbook = XLSX.read(semHyperlinks(XLSX, bytes), { type: "array", cellDates: false });
    }
  } catch {
    return falha([geral("arquivo_invalido")]);
  }
  onProgress?.(96);

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return falha([geral("planilha_vazia")]);
  // blankrows mantém as linhas vazias para o número da linha bater com o editor de planilhas.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, raw: false, defval: "", blankrows: true });
  if (!rows.length) return falha([geral("planilha_vazia")]);
  onProgress?.(99);
  const indexes = new Map<string, number>();
  const colunas: Record<string, string> = { ...cabecalhosObrigatorios };
  const errors: ErroPlanilha[] = [];
  rows[0].forEach((value, index) => {
    const name = cabecalho(value);
    if (!name) return;
    if (indexes.has(name)) errors.push(geral("cabecalho_duplicado", texto(value)));
    indexes.set(name, index);
    colunas[name] = texto(value);
  });
  for (const [name, exibido] of Object.entries(cabecalhosObrigatorios)) {
    if (!indexes.has(name)) errors.push(geral("coluna_obrigatoria_ausente", exibido));
  }
  if (errors.length) return falha(errors);

  const casos: CasoTestePlanilha[] = [];
  const primeiraLinhaPorTcId = new Map<string, number>();
  let app = "";
  let oneUi = "";
  let totalLinhas = 0;
  const pessoas: PessoasDaLinha[] = [];
  rows.slice(1).forEach((row, index) => {
    const linha = index + 2;
    const get = (name: CabecalhoObrigatorio) => texto(row[indexes.get(name)!]);
    if (!row.some((value) => texto(value))) return;
    totalLinhas += 1;
    if (!app) app = get("app");
    if (!oneUi) oneUi = get("one ui");

    const erro = (name: CabecalhoObrigatorio, codigo: ErroPlanilha["codigo"], valor = "", parametros?: ErroPlanilha["parametros"]) =>
      errors.push({ codigo, linha, coluna: colunas[name], valor: valor || null, ...(parametros && { parametros }) });
    const opcao = <T extends string>(name: keyof typeof opcoes): T | null => {
      const valor = get(name);
      if (!valor) { erro(name, "valor_obrigatorio"); return null; }
      const encontrada = opcoes[name].find((item) => item.toLocaleLowerCase() === valor.toLocaleLowerCase());
      if (!encontrada) erro(name, "valor_invalido", valor, { esperados: [...opcoes[name]] });
      return (encontrada ?? null) as T | null;
    };

    const tcId = get("tc id");
    if (!tcId) erro("tc id", "valor_obrigatorio");
    else if (primeiraLinhaPorTcId.has(tcId)) erro("tc id", "tc_id_duplicado", tcId, { primeira_linha: primeiraLinhaPorTcId.get(tcId) });
    else primeiraLinhaPorTcId.set(tcId, linha);
    const category = opcao<CategoriaCasoTeste>("category");
    const difficulty = opcao<DificuldadeCasoTeste>("difficulty");
    const situation = opcao<SituacaoCasoTeste>("tc situation");
    const responsavel = get("assignees");
    const backup = get("backup");
    pessoas.push({ linha, responsavel, backup });
    if (!responsavel) erro("assignees", "valor_obrigatorio");
    if (!backup) erro("backup", "valor_obrigatorio");

    if (tcId && category && difficulty && situation && responsavel && backup) {
      casos.push({ linha, tc_id: tcId, category, difficulty, situation, responsavel, backup });
    }
  });

  if (!totalLinhas) errors.push(geral("sem_casos"));
  else {
    if (!app) errors.push(geral("app_ausente", colunas.app));
    if (!oneUi) errors.push(geral("one_ui_ausente", colunas["one ui"]));
  }
  if (errors.length) return falha(errors, totalLinhas, pessoas, colunas as PlanilhaProjeto["colunas"]);
  // Só a leitura bem-sucedida chega a 100: com problemas, a barra para onde estava (spec 016, RN-18).
  onProgress?.(100);
  return { app, one_ui: oneUi, casos, totalLinhas, colunas: colunas as PlanilhaProjeto["colunas"] };
}
