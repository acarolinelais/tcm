import * as XLSX from "@e965/xlsx";
import { describe, expect, it } from "vitest";

import { lerPlanilhaProjeto, PlanilhaProjetoError } from "./planilha-projeto";

function planilhaFile(rows: unknown[][]) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Test Cases");
  return new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as BlobPart], "cases.xlsx");
}

const headers = ["App", "TC ID", "Difficulty", "Category", "TC Situation", "One UI", "Assignees", "Backup"];
const linha = (tcId: string, situation = "New", extra: Partial<Record<"app" | "oneUi" | "category" | "backup", string>> = {}) =>
  [extra.app ?? "Clock", tcId, "Low", extra.category ?? "A", situation, extra.oneUi ?? "9.5", "Daniel Oliveira", extra.backup ?? "Kaique Pereira"];

async function erros(rows: unknown[][]) {
  try {
    await lerPlanilhaProjeto(planilhaFile(rows));
  } catch (error) {
    if (error instanceof PlanilhaProjetoError) return error;
  }
  throw new Error("A planilha deveria ser inválida.");
}

describe("leitura da planilha inicial de projetos", () => {
  it("lê os casos com TC Situation, usa o primeiro App e One UI e ignora a coluna Status", async () => {
    const file = planilhaFile([
      [...headers, "Status"],
      [...linha("Clock_001", "new", { app: "", oneUi: "" }), "Pass"],
      [...linha("Clock_002", "New Step"), "Fail"],
      [],
      [...linha("Clock_003", "Without Changes", { app: "Weather", oneUi: "10.0" }), ""],
    ]);

    const planilha = await lerPlanilhaProjeto(file);

    expect(planilha).toMatchObject({ app: "Clock", one_ui: "9.5", totalLinhas: 3, colunas: { "tc situation": "TC Situation" } });
    expect(planilha.casos.map(({ linha, tc_id, situation }) => ({ linha, tc_id, situation }))).toEqual([
      { linha: 2, tc_id: "Clock_001", situation: "New" },
      { linha: 3, tc_id: "Clock_002", situation: "New Step" },
      { linha: 5, tc_id: "Clock_003", situation: "Without Changes" },
    ]);
    expect(planilha.casos[0]).not.toHaveProperty("status");
  });

  it("reporta todos os problemas da linha com coluna, valor encontrado e opções esperadas", async () => {
    const erro = await erros([headers, linha("Clock_001", "To-Do", { category: "", backup: "" })]);

    expect(erro.totalLinhas).toBe(1);
    expect(erro.errors).toEqual([
      { codigo: "valor_obrigatorio", linha: 2, coluna: "Category", valor: null },
      { codigo: "valor_invalido", linha: 2, coluna: "TC Situation", valor: "To-Do", parametros: { esperados: ["New", "New Step", "Without Changes"] } },
      { codigo: "valor_obrigatorio", linha: 2, coluna: "Backup", valor: null },
    ]);
  });

  it("exige TC Situation preenchido", async () => {
    const erro = await erros([headers, linha("Clock_001", "")]);

    expect(erro.errors).toEqual([{ codigo: "valor_obrigatorio", linha: 2, coluna: "TC Situation", valor: null }]);
  });

  it("informa a linha em que o TC ID duplicado apareceu primeiro", async () => {
    const erro = await erros([headers, linha("Clock_001"), linha("Clock_002"), linha("Clock_001")]);

    expect(erro.errors).toEqual([
      { codigo: "tc_id_duplicado", linha: 4, coluna: "TC ID", valor: "Clock_001", parametros: { primeira_linha: 2 } },
    ]);
  });

  it("reporta problemas da planilha inteira sem número de linha", async () => {
    expect((await erros([["App", "TC ID", "Difficulty", "Category", "One UI", "Assignees", "Backup"]])).errors).toEqual([
      { codigo: "coluna_obrigatoria_ausente", linha: null, coluna: "TC Situation", valor: null },
    ]);
    expect((await erros([headers])).errors).toEqual([{ codigo: "sem_casos", linha: null, coluna: null, valor: null }]);
    expect((await erros([headers, linha("Clock_001", "New", { app: "" })])).errors).toEqual([
      { codigo: "app_ausente", linha: null, coluna: "App", valor: null },
    ]);
  });

  it("rejeita arquivos que não são uma planilha de Test Cases", async () => {
    // O SheetJS lê texto puro como CSV, então o problema aparece como colunas ausentes.
    const erro = await lerPlanilhaProjeto(new File(["not excel"], "bad.xlsx")).catch((error: unknown) => error);
    expect(erro).toBeInstanceOf(PlanilhaProjetoError);
    expect((erro as PlanilhaProjetoError).errors.every((item) => item.linha === null)).toBe(true);
  });

  it("lê uma planilha com 1.000 Test Cases", async () => {
    const rows = [headers, ...Array.from({ length: 1000 }, (_, index) => linha(`Clock_${String(index).padStart(4, "0")}`))];

    const planilha = await lerPlanilhaProjeto(planilhaFile(rows));

    expect(planilha.casos).toHaveLength(1000);
    expect(planilha.totalLinhas).toBe(1000);
  });

  it("lê a planilha mesmo com um hyperlink corrompido, que faz o SheetJS descartar a aba", async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, linha("Clock_001"), linha("Clock_002")]), "Test Cases");
    const zip = XLSX.CFB.read(new Uint8Array(XLSX.write(workbook, { type: "array", bookType: "xlsx" })), { type: "array" });
    const indice = zip.FullPaths.findIndex((caminho: string) => caminho.endsWith("xl/worksheets/sheet1.xml"));
    const entrada = zip.FileIndex[indice];
    const xml = new TextDecoder().decode(entrada.content).replace(
      "</worksheet>",
      '<hyperlinks><hyperlink ref="G2" display="ok"/><hyperlink ref=":XEZ64958" display="corrompido"/></hyperlinks></worksheet>',
    );
    entrada.content = new TextEncoder().encode(xml);
    entrada.size = entrada.content.length;
    const bytes: Uint8Array = XLSX.CFB.write(zip, { type: "array", fileType: "zip" });
    expect(XLSX.read(bytes, { type: "array" }).Sheets["Test Cases"]).toBeUndefined();

    const planilha = await lerPlanilhaProjeto(new File([bytes as BlobPart], "reparada.xlsx"));

    expect(planilha.casos.map((caso) => caso.tc_id)).toEqual(["Clock_001", "Clock_002"]);
  });
});
