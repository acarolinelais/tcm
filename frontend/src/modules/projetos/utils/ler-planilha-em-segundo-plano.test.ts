import * as XLSX from "@e965/xlsx";
import { afterEach, describe, expect, it, vi } from "vitest";

import { lerPlanilhaEmSegundoPlano, type MensagemLeitura } from "./ler-planilha-em-segundo-plano";
import { PlanilhaProjetoError } from "./planilha-projeto";

function planilha(rows: unknown[][]) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Cases");
  return new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as BlobPart], "cases.xlsx");
}

const cabecalho = ["App", "TC ID", "Difficulty", "Category", "TC Situation", "One UI", "Assignees", "Backup"];

/** Worker falso: guarda a instância para o teste responder como o worker real. */
class WorkerFalso {
  static ultimo: WorkerFalso;
  onmessage: ((event: MessageEvent<MensagemLeitura>) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() { WorkerFalso.ultimo = this; }
  responder(data: MensagemLeitura) { this.onmessage?.({ data } as MessageEvent<MensagemLeitura>); }
}

describe("lerPlanilhaEmSegundoPlano", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sem Worker, lê na thread principal e informa o progresso até 100", async () => {
    const progresso: number[] = [];
    const leitura = lerPlanilhaEmSegundoPlano(planilha([cabecalho, ["Clock", "Clock_001", "Low", "A", "New", "9.5", "Ana", "Bia"]]), (valor) => progresso.push(valor));

    const previa = await leitura.promessa;

    expect(previa.casos).toHaveLength(1);
    expect(progresso.at(-1)).toBe(100);
  });

  it("recria o PlanilhaProjetoError enviado pelo worker", async () => {
    vi.stubGlobal("Worker", WorkerFalso);
    const leitura = lerPlanilhaEmSegundoPlano(new File(["x"], "a.xlsx"), () => undefined);

    WorkerFalso.ultimo.responder({ tipo: "erro", erros: [{ codigo: "sem_casos", linha: null, coluna: null, valor: null }], totalLinhas: 0, pessoas: [] });

    const erro = await leitura.promessa.catch((error: unknown) => error);
    expect(erro).toBeInstanceOf(PlanilhaProjetoError);
    expect((erro as PlanilhaProjetoError).errors[0].codigo).toBe("sem_casos");
    expect(WorkerFalso.ultimo.terminate).toHaveBeenCalled();
  });

  it("repassa o progresso do worker e encerra o worker ao cancelar", () => {
    vi.stubGlobal("Worker", WorkerFalso);
    const onProgress = vi.fn();
    const leitura = lerPlanilhaEmSegundoPlano(new File(["x"], "a.xlsx"), onProgress);

    WorkerFalso.ultimo.responder({ tipo: "progresso", valor: 42 });
    leitura.cancelar();

    expect(onProgress).toHaveBeenCalledWith(42);
    expect(WorkerFalso.ultimo.terminate).toHaveBeenCalled();
  });

  it("falha genérica do worker rejeita a leitura", async () => {
    vi.stubGlobal("Worker", WorkerFalso);
    const leitura = lerPlanilhaEmSegundoPlano(new File(["x"], "a.xlsx"), () => undefined);

    WorkerFalso.ultimo.responder({ tipo: "falha" });

    await expect(leitura.promessa).rejects.toThrow("Could not read file");
  });
});
