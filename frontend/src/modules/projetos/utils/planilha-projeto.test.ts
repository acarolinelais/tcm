import * as XLSX from "@e965/xlsx";
import { describe, expect, it } from "vitest";

import { CABECALHOS_MODELO_PLANILHA, EXEMPLO_MODELO_PLANILHA, lerPlanilhaProjeto, PlanilhaProjetoError } from "./planilha-projeto";

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

type ColunaModelo = (typeof CABECALHOS_MODELO_PLANILHA)[number];
const cabecalhosSemNivel = CABECALHOS_MODELO_PLANILHA.filter((coluna) => coluna !== "Automation Level");

/** Linha no modelo atual: parte do exemplo do modelo e troca só o que o caso de teste muda. */
const linhaCompleta = (alteracoes: Partial<Record<ColunaModelo, unknown>> = {}, cabecalhos: readonly string[] = CABECALHOS_MODELO_PLANILHA) => {
  const valores: Record<string, unknown> = { ...EXEMPLO_MODELO_PLANILHA, "Automation Level": "", ...alteracoes };
  return cabecalhos.map((coluna) => valores[coluna]);
};

describe("Automation Level na leitura da planilha (spec 027)", () => {
  it("expõe os cabeçalhos do modelo exatamente na ordem da planilha atual", () => {
    expect([...CABECALHOS_MODELO_PLANILHA]).toEqual([
      "App", "TC ID", "Title(English)", "Test Precondition(English)", "Test Procedure(English)", "Expected Result(English)",
      "Difficulty", "Category", "Automation Level", "TC Situation", "One UI", "Assignees", "Backup", "Planned date",
    ]);
    expect(Object.keys(EXEMPLO_MODELO_PLANILHA)).toEqual([...CABECALHOS_MODELO_PLANILHA]);
  });

  it("lê o exemplo do modelo sem erro, já que quem baixa o modelo o preenche", async () => {
    const exemplo = CABECALHOS_MODELO_PLANILHA.map((coluna) => EXEMPLO_MODELO_PLANILHA[coluna]);

    const planilha = await lerPlanilhaProjeto(planilhaFile([[...CABECALHOS_MODELO_PLANILHA], exemplo]));

    expect(planilha.casos).toHaveLength(1);
    expect(planilha.casos[0].automation_level).toBe(1);
  });

  it("lê os níveis 1, 2 e 3 de cada linha", async () => {
    const planilha = await lerPlanilhaProjeto(planilhaFile([
      [...CABECALHOS_MODELO_PLANILHA],
      linhaCompleta({ "TC ID": "Clock_001", "Automation Level": 1 }),
      linhaCompleta({ "TC ID": "Clock_002", "Automation Level": 2 }),
      linhaCompleta({ "TC ID": "Clock_003", "Automation Level": 3 }),
    ]));

    expect(planilha.casos.map((caso) => caso.automation_level)).toEqual([1, 2, 3]);
  });

  it("lê pelo nome do cabeçalho: outra ordem de colunas e colunas extras não mudam o resultado", async () => {
    const invertidos = [...CABECALHOS_MODELO_PLANILHA].reverse();

    const planilha = await lerPlanilhaProjeto(planilhaFile([[...invertidos, "Status"], [...linhaCompleta({ "Automation Level": 2, Category: "B" }, invertidos), "Pass"]]));

    expect(planilha).toMatchObject({ app: "Clock", one_ui: "9.5" });
    expect(planilha.casos[0]).toMatchObject({ tc_id: "Clock_0001", category: "B", difficulty: "Low", situation: "New", automation_level: 2 });
  });

  it("importa com nível vazio quando a coluna não existe na planilha", async () => {
    const planilha = await lerPlanilhaProjeto(planilhaFile([cabecalhosSemNivel, linhaCompleta({}, cabecalhosSemNivel), linhaCompleta({ "TC ID": "Clock_002" }, cabecalhosSemNivel)]));

    expect(planilha.casos.map((caso) => caso.automation_level)).toEqual([null, null]);
  });

  it("importa a célula vazia como nível vazio sem afetar as outras linhas", async () => {
    const planilha = await lerPlanilhaProjeto(planilhaFile([
      [...CABECALHOS_MODELO_PLANILHA],
      linhaCompleta({ "TC ID": "Clock_001", "Automation Level": "" }),
      linhaCompleta({ "TC ID": "Clock_002", "Automation Level": "   " }),
      linhaCompleta({ "TC ID": "Clock_003", "Automation Level": 3 }),
    ]));

    expect(planilha.casos.map((caso) => caso.automation_level)).toEqual([null, null, 3]);
  });

  it.each([[1, 1], [2.0, 2], ["3", 3], ["1.0", 1], [" 2 ", 2], ["3.00", 3], ["02", 2]])("aceita %j do Excel como o nível %i", async (valor, esperado) => {
    const planilha = await lerPlanilhaProjeto(planilhaFile([[...CABECALHOS_MODELO_PLANILHA], linhaCompleta({ "Automation Level": valor })]));

    expect(planilha.casos[0].automation_level).toBe(esperado);
  });

  it.each([4, 0, 1.5, -1, "abc", "1,5", "1.0.0", "um", 10, "2.5", "２", "٢"])("recusa %j informando linha, coluna, valor e níveis aceitos", async (valor) => {
    const erro = await erros([
      [...CABECALHOS_MODELO_PLANILHA],
      linhaCompleta({ "TC ID": "Clock_001", "Automation Level": 1 }),
      linhaCompleta({ "TC ID": "Clock_002", "Automation Level": valor }),
    ]);

    expect(erro.errors).toEqual([{ codigo: "valor_invalido", linha: 3, coluna: "Automation Level", valor: String(valor), parametros: { esperados: ["1", "2", "3"] } }]);
  });

  it("cita o cabeçalho como está escrito na planilha", async () => {
    const cabecalhos = CABECALHOS_MODELO_PLANILHA.map((coluna) => (coluna === "Automation Level" ? "automation_level" : coluna));

    const erro = await erros([cabecalhos, linhaCompleta({ "Automation Level": 9 }, CABECALHOS_MODELO_PLANILHA)]);

    expect(erro.errors[0]).toMatchObject({ coluna: "automation_level", linha: 2 });
  });

  it("devolve o nível inválido junto com os outros erros da planilha", async () => {
    const erro = await erros([
      [...CABECALHOS_MODELO_PLANILHA],
      linhaCompleta({ "TC ID": "Clock_001", "Automation Level": 7 }),
      linhaCompleta({ "TC ID": "Clock_002", Category: "Z" }),
    ]);

    expect(erro.totalLinhas).toBe(2);
    expect(erro.errors.map(({ linha, coluna, codigo }) => ({ linha, coluna, codigo }))).toEqual([
      { linha: 2, coluna: "Automation Level", codigo: "valor_invalido" },
      { linha: 3, coluna: "Category", codigo: "valor_invalido" },
    ]);
  });
});

const colunasDeTexto = ["Title(English)", "Test Precondition(English)", "Test Procedure(English)", "Expected Result(English)"] as const;
const textosDoCaso = ({ title, precondition, procedure, expected_result }: { title: string | null; precondition: string | null; procedure: string | null; expected_result: string | null }) =>
  [title, precondition, procedure, expected_result];

describe("Textos do Test Case na leitura da planilha (spec 028)", () => {
  it("lê os quatro textos sem os espaços das pontas e com as quebras de linha, em qualquer ordem e caixa", async () => {
    const cabecalhos = CABECALHOS_MODELO_PLANILHA.map((coluna) => (colunasDeTexto as readonly string[]).includes(coluna) ? coluna.toUpperCase() : coluna).reverse();
    const linha = linhaCompleta({ "Title(English)": "  Check Writing style  ", "Test Precondition(English)": "1. Settings", "Test Procedure(English)": "1. Messages > Compose\n2-1. Select Shorten", "Expected Result(English)": "2-3. Should work normally" }).reverse();

    const planilha = await lerPlanilhaProjeto(planilhaFile([cabecalhos, linha]));

    expect(textosDoCaso(planilha.casos[0])).toEqual(["Check Writing style", "1. Settings", "1. Messages > Compose\n2-1. Select Shorten", "2-3. Should work normally"]);
  });

  it("reconhece o cabeçalho de texto com espaço antes dos parênteses, como o backend", async () => {
    const cabecalhos = CABECALHOS_MODELO_PLANILHA.map((coluna) => coluna === "Title(English)" ? "Title (English)" : coluna);

    const planilha = await lerPlanilhaProjeto(planilhaFile([cabecalhos, linhaCompleta({ "Title(English)": "Check Writing style" })]));

    expect(planilha.casos[0].title).toBe("Check Writing style");
  });

  it("importa sem textos quando as colunas faltam ou as células estão vazias, sem erro", async () => {
    const semTextos = CABECALHOS_MODELO_PLANILHA.filter((coluna) => !(colunasDeTexto as readonly string[]).includes(coluna));
    const vazias = Object.fromEntries(colunasDeTexto.map((coluna) => [coluna, "   "]));

    const sem = await lerPlanilhaProjeto(planilhaFile([semTextos, linhaCompleta({}, semTextos)]));
    const comVazias = await lerPlanilhaProjeto(planilhaFile([[...CABECALHOS_MODELO_PLANILHA], linhaCompleta(vazias)]));

    expect(textosDoCaso(sem.casos[0])).toEqual([null, null, null, null]);
    expect(textosDoCaso(comVazias.casos[0])).toEqual([null, null, null, null]);
  });

  it("aceita os textos no limite, contando um emoji como um caractere como o backend", async () => {
    const planilha = await lerPlanilhaProjeto(planilhaFile([[...CABECALHOS_MODELO_PLANILHA], linhaCompleta({ "Title(English)": "😀".repeat(500), "Test Procedure(English)": "a".repeat(10_000) })]));

    expect([...planilha.casos[0].title!]).toHaveLength(500);
    expect(planilha.casos[0].procedure).toHaveLength(10_000);
  });

  it("recusa o Title acima do limite com linha, coluna, trecho e máximo", async () => {
    const erro = await erros([
      [...CABECALHOS_MODELO_PLANILHA],
      linhaCompleta({ "TC ID": "Clock_001" }),
      linhaCompleta({ "TC ID": "Clock_002" }),
      linhaCompleta({ "TC ID": "Clock_003", "Title(English)": "b".repeat(501) }),
    ]);

    expect(erro.errors).toEqual([{ codigo: "texto_muito_longo", linha: 4, coluna: "Title(English)", valor: "b".repeat(40) + "…", parametros: { maximo: 500 } }]);
  });

  it("devolve o texto longo junto com os outros erros da planilha", async () => {
    const erro = await erros([
      [...CABECALHOS_MODELO_PLANILHA],
      linhaCompleta({ "TC ID": "Clock_001", "Expected Result(English)": "c".repeat(10_001) }),
      linhaCompleta({ "TC ID": "Clock_002", Category: "Z" }),
    ]);

    expect(erro.errors.map(({ linha, coluna, codigo, parametros }) => ({ linha, coluna, codigo, parametros }))).toEqual([
      { linha: 2, coluna: "Expected Result(English)", codigo: "texto_muito_longo", parametros: { maximo: 10_000 } },
      { linha: 3, coluna: "Category", codigo: "valor_invalido", parametros: { esperados: ["A", "B", "C"] } },
    ]);
  });
});

// Spec 075: a Planned date do projeto, com as mesmas regras do validador do backend.
describe("Planned date na planilha", () => {
  const diaDaqui = (dias: number) => { const data = new Date(); data.setHours(12, 0, 0, 0); data.setDate(data.getDate() + dias); return data; };
  const iso = (data: Date) => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
  const br = (data: Date) => iso(data).split("-").reverse().join("/");
  const comData = (...datas: unknown[]) => [[...headers, "Planned date"], ...datas.map((data, indice) => [...linha(`Clock_00${indice + 1}`), data])];

  it("lê a célula de data e o texto dd/mm/aaaa como a mesma data do projeto, ignorando linhas vazias", async () => {
    const data = diaDaqui(30);
    const planilha = await lerPlanilhaProjeto(planilhaFile(comData(data, br(data), "")));

    expect(planilha.data_planejada).toBe(iso(data));
  });

  it("sem a coluna, o projeto fica sem data planejada", async () => {
    const planilha = await lerPlanilhaProjeto(planilhaFile([headers, linha("Clock_001")]));

    expect(planilha.data_planejada).toBeNull();
  });

  it("falha: datas diferentes entre as linhas apontam a linha da primeira", async () => {
    const erro = await erros(comData(br(diaDaqui(30)), br(diaDaqui(31))));

    expect(erro.errors).toEqual([{ codigo: "data_planejada_divergente", linha: 3, coluna: "Planned date", valor: br(diaDaqui(31)), parametros: { primeira_linha: 2 } }]);
  });

  it.each([
    ["amanhã", "data_planejada_invalida"], ["31/02/2026", "data_planejada_invalida"],
    [br(diaDaqui(-1)), "data_planejada_fora_do_intervalo"], [br(diaDaqui(731)), "data_planejada_fora_do_intervalo"],
  ])("falha: %s não é uma data planejada aceita (%s)", async (valor, codigo) => {
    const erro = await erros(comData(valor));

    expect(erro.errors.map(({ codigo: lido, linha: numero, coluna }) => ({ codigo: lido, numero, coluna }))).toEqual([{ codigo, numero: 2, coluna: "Planned date" }]);
  });

  it("lê a célula de data certa quando a aba não começa em A1", async () => {
    const data = diaDaqui(30);
    const workbook = XLSX.utils.book_new();
    // Coluna A vazia: a área usada da aba começa em B1.
    const linhas = comData(data, data);
    const aba: XLSX.WorkSheet = {};
    XLSX.utils.sheet_add_aoa(aba, linhas, { origin: "B1" });
    // Como o Excel grava quando a coluna A fica vazia: a área usada começa em B1.
    aba["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 1 }, e: { r: linhas.length - 1, c: linhas[0].length } });
    XLSX.utils.book_append_sheet(workbook, aba, "Test Cases");
    const arquivo = new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as BlobPart], "deslocada.xlsx");

    expect((await lerPlanilhaProjeto(arquivo)).data_planejada).toBe(iso(data));
  });
});
