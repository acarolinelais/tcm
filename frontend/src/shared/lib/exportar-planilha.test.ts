import * as XLSX from "@e965/xlsx";
import { describe, expect, it, vi } from "vitest";

import { TAMANHO_PAGINA_EXPORTACAO, buscarTodasAsPaginas, montarPlanilha, nomeArquivoExportacao, type ColunaExportacao } from "./exportar-planilha";

interface Item { id: number; nome: string; ativo: boolean }

const colunas: ColunaExportacao<Item>[] = [
  { titulo: "Name", valor: (item) => item.nome },
  { titulo: "Status", valor: (item) => (item.ativo ? "Active" : "Inactive") },
  { titulo: "Code", valor: (item) => item.id },
];

function lerLinhas(bytes: ArrayBuffer) {
  const workbook = XLSX.read(bytes, { type: "array" });
  return { abas: workbook.SheetNames, linhas: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }) };
}

function paginas(total: number) {
  const todos = Array.from({ length: total }, (_, i) => ({ id: i + 1, nome: `Item ${i + 1}`, ativo: true }));
  return vi.fn(async (page: number, pageSize: number) => ({ items: todos.slice((page - 1) * pageSize, page * pageSize), page, page_size: pageSize, total_count: total }));
}

describe("montarPlanilha", () => {
  it("gera uma aba com os títulos e uma linha por item, na ordem recebida", async () => {
    const itens = [{ id: 2, nome: "Beta", ativo: false }, { id: 1, nome: "Alfa", ativo: true }];

    const { abas, linhas } = lerLinhas(await montarPlanilha(colunas, itens));

    expect(abas).toHaveLength(1);
    expect(linhas).toEqual([["Name", "Status", "Code"], ["Beta", "Inactive", 2], ["Alfa", "Active", 1]]);
  });

  it("valor ausente vira célula vazia e lista vazia gera só o cabeçalho", async () => {
    const semValor: ColunaExportacao<Item>[] = [{ titulo: "Name", valor: (item) => item.nome }, { titulo: "Owner", valor: () => null }];

    expect(lerLinhas(await montarPlanilha(semValor, [{ id: 1, nome: "Alfa", ativo: true }])).linhas).toEqual([["Name", "Owner"], ["Alfa", ""]]);
    expect(lerLinhas(await montarPlanilha(semValor, [])).linhas).toEqual([["Name", "Owner"]]);
  });
});

describe("nomeArquivoExportacao", () => {
  it("usa a listagem e a data local no formato AAAA-MM-DD", () => {
    expect(nomeArquivoExportacao("usuarios", new Date(2026, 9, 29, 23, 30))).toBe("usuarios_2026-10-29.xlsx");
    expect(nomeArquivoExportacao("setores", new Date(2026, 0, 5))).toBe("setores_2026-01-05.xlsx");
  });
});

describe("buscarTodasAsPaginas", () => {
  it("busca de 100 em 100 até completar o total", async () => {
    const buscar = paginas(245);

    const itens = await buscarTodasAsPaginas(buscar);

    expect(itens).toHaveLength(245);
    expect(itens.at(-1)?.id).toBe(245);
    expect(buscar.mock.calls).toEqual([[1, TAMANHO_PAGINA_EXPORTACAO], [2, TAMANHO_PAGINA_EXPORTACAO], [3, TAMANHO_PAGINA_EXPORTACAO]]);
  });

  it("listagem vazia faz uma chamada só", async () => {
    const buscar = paginas(0);

    expect(await buscarTodasAsPaginas(buscar)).toEqual([]);
    expect(buscar).toHaveBeenCalledTimes(1);
  });

  it("para quando uma página volta vazia antes do total", async () => {
    const buscar = vi.fn(async (page: number) => ({ items: page === 1 ? [{ id: 1, nome: "A", ativo: true }] : [], page, page_size: 100, total_count: 500 }));

    expect(await buscarTodasAsPaginas(buscar)).toHaveLength(1);
    expect(buscar).toHaveBeenCalledTimes(2);
  });

  it("rejeita quando uma das páginas falha", async () => {
    const buscar = paginas(245);
    const falhaNaSegunda = vi.fn(async (page: number, pageSize: number) => {
      if (page === 2) throw new Error("falha de rede");
      return buscar(page, pageSize);
    });

    await expect(buscarTodasAsPaginas(falhaNaSegunda)).rejects.toThrow("falha de rede");
    expect(falhaNaSegunda).toHaveBeenCalledTimes(2);
  });
});
