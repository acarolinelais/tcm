import * as XLSX from "@e965/xlsx";
import { describe, expect, it } from "vitest";

import { lerPlanilhaProjeto, PlanilhaProjetoError } from "./planilha-projeto";

function planilhaFile(rows: unknown[][]) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Test Cases");
  return new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as BlobPart], "cases.xlsx");
}

const headers = ["App", "TC ID", "Difficulty", "Category", "TC Situation", "One UI", "Assignees", "Backup"];

describe("leitura da planilha inicial de projetos", () => {
  it("lê os casos e usa o primeiro App e One UI preenchidos", async () => {
    const file = planilhaFile([
      headers,
      ["", "Clock_001", "Low", "A", "", "", "Daniel Oliveira", "Kaique Pereira"],
      ["Clock", "Clock_002", "Medium", "B", "InProgress", "9.5", "Daniel Oliveira", "Kaique Pereira"],
      ["Weather", "Clock_003", "High", "C", "InReview", "10.0", "Daniel Oliveira", "Kaique Pereira"],
    ]);

    await expect(lerPlanilhaProjeto(file)).resolves.toEqual({
      app: "Clock",
      one_ui: "9.5",
      casos: [
        { linha: 2, tc_id: "Clock_001", category: "A", difficulty: "Low", situation: "To-Do", responsavel: "Daniel Oliveira", backup: "Kaique Pereira" },
        { linha: 3, tc_id: "Clock_002", category: "B", difficulty: "Medium", situation: "InProgress", responsavel: "Daniel Oliveira", backup: "Kaique Pereira" },
        { linha: 4, tc_id: "Clock_003", category: "C", difficulty: "High", situation: "InReview", responsavel: "Daniel Oliveira", backup: "Kaique Pereira" },
      ],
    });
  });

  it("informa cabeçalhos ausentes e TC IDs duplicados com o número da linha", async () => {
    const missingHeader = planilhaFile([["App", "TC ID"]]);
    await expect(lerPlanilhaProjeto(missingHeader)).rejects.toMatchObject({
      errors: expect.arrayContaining([expect.objectContaining({ campo: "linha.1.backup" })]),
    });

    const duplicateCases = planilhaFile([
      headers,
      ["Clock", "Clock_001", "Low", "A", "To-Do", "9.5", "Daniel Oliveira", "Kaique Pereira"],
      ["", "Clock_001", "Low", "A", "To-Do", "", "Daniel Oliveira", "Kaique Pereira"],
    ]);
    await expect(lerPlanilhaProjeto(duplicateCases)).rejects.toMatchObject({
      errors: expect.arrayContaining([expect.objectContaining({ campo: "linha.3.tc id", mensagem: "TC ID duplicado na planilha." })]),
    });
  });

  it("rejeita arquivos que não podem ser lidos como Excel", async () => {
    await expect(lerPlanilhaProjeto(new File(["not excel"], "bad.xlsx"))).rejects.toBeInstanceOf(PlanilhaProjetoError);
  });

  it("identifica uma planilha Excel sem cabeçalho como vazia", async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), "Empty");
    const file = new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as BlobPart], "empty.xlsx");
    await expect(lerPlanilhaProjeto(file)).rejects.toMatchObject({
      errors: [expect.objectContaining({ campo: "cabecalho", mensagem: "A planilha está vazia." })],
    });
  });
});
