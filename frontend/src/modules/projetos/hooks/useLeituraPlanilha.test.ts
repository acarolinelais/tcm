import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { lerPlanilhaEmSegundoPlano } from "../utils/ler-planilha-em-segundo-plano";
import { PlanilhaProjetoError, type PlanilhaProjeto } from "../utils/planilha-projeto";
import { DURACAO_BARRA_MS, TAMANHO_MAXIMO_PLANILHA, useLeituraPlanilha } from "./useLeituraPlanilha";

vi.mock("../utils/ler-planilha-em-segundo-plano", () => ({ lerPlanilhaEmSegundoPlano: vi.fn() }));

interface LeituraControlada {
  progresso: (valor: number) => void;
  resolver: (previa: PlanilhaProjeto) => void;
  rejeitar: (erro: unknown) => void;
  cancelar: ReturnType<typeof vi.fn>;
}

const leituras: LeituraControlada[] = [];
const previa = (app: string): PlanilhaProjeto => ({ app, one_ui: "9.5", casos: [], totalLinhas: 1, colunas: {} as PlanilhaProjeto["colunas"] });
const xlsx = (nome = "cases.xlsx", tamanho = 10) => new File(["x".repeat(tamanho)], nome);

async function terminar(acao: () => void) {
  await act(async () => { acao(); await Promise.resolve(); });
  await act(async () => { vi.advanceTimersByTime(DURACAO_BARRA_MS); });
}

describe("useLeituraPlanilha", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    leituras.length = 0;
    vi.mocked(lerPlanilhaEmSegundoPlano).mockImplementation((_file, onProgress) => {
      let resolver!: LeituraControlada["resolver"];
      let rejeitar!: LeituraControlada["rejeitar"];
      const promessa = new Promise<PlanilhaProjeto>((res, rej) => { resolver = res; rejeitar = rej; });
      const cancelar = vi.fn();
      leituras.push({ progresso: onProgress, resolver, rejeitar, cancelar });
      return { promessa, cancelar };
    });
  });
  afterEach(() => vi.useRealTimers());

  it("o progresso só sobe e a prévia só aparece depois de a barra encher", async () => {
    const { result } = renderHook(() => useLeituraPlanilha("falhou"));

    act(() => { result.current.selecionar(xlsx()); });
    act(() => { leituras[0].progresso(60); leituras[0].progresso(40); });
    expect(result.current).toMatchObject({ fase: "lendo", progresso: 60 });

    await act(async () => { leituras[0].resolver(previa("Clock")); await Promise.resolve(); });
    expect(result.current).toMatchObject({ fase: "lendo", progresso: 100, previa: null });

    await act(async () => { vi.advanceTimersByTime(DURACAO_BARRA_MS); });
    expect(result.current.fase).toBe("concluida");
    expect(result.current.previa?.app).toBe("Clock");
  });

  it("trocar de arquivo cancela a leitura anterior e descarta o resultado dela", async () => {
    const { result } = renderHook(() => useLeituraPlanilha("falhou"));

    act(() => { result.current.selecionar(xlsx("a.xlsx")); });
    act(() => { leituras[0].progresso(70); });
    act(() => { result.current.selecionar(xlsx("b.xlsx")); });
    expect(leituras[0].cancelar).toHaveBeenCalled();
    expect(result.current).toMatchObject({ progresso: 0, fase: "lendo" });

    await terminar(() => leituras[1].resolver(previa("B")));
    await terminar(() => leituras[0].resolver(previa("A")));

    expect(result.current.arquivo?.name).toBe("b.xlsx");
    expect(result.current.previa?.app).toBe("B");
  });

  it.each([
    ["formato", xlsx("casos.csv")],
    ["tamanho", xlsx("grande.xlsx", TAMANHO_MAXIMO_PLANILHA + 1)],
  ])("recusa por %s sem mudar o estado nem iniciar leitura", async (motivo, arquivo) => {
    const { result } = renderHook(() => useLeituraPlanilha("falhou"));
    act(() => { result.current.selecionar(xlsx("atual.xlsx")); });

    let recusa: string | null = null;
    act(() => { recusa = result.current.selecionar(arquivo); });

    expect(recusa).toBe(motivo);
    expect(result.current.arquivo?.name).toBe("atual.xlsx");
    expect(leituras).toHaveLength(1);
  });

  it("erro de leitura vai para a fase de erro com a barra parada onde estava", async () => {
    const { result } = renderHook(() => useLeituraPlanilha("falhou"));
    act(() => { result.current.selecionar(xlsx()); });
    act(() => { leituras[0].progresso(45); });

    await act(async () => { leituras[0].rejeitar(new PlanilhaProjetoError([{ codigo: "sem_casos", linha: null, coluna: null, valor: null }], 0)); await Promise.resolve(); });

    expect(result.current).toMatchObject({ fase: "erro", progresso: 45, totalLinhasComErro: 0 });
    expect(result.current.erros[0].codigo).toBe("sem_casos");
  });

  it("falha inesperada vira um problema com a mensagem informada", async () => {
    const { result } = renderHook(() => useLeituraPlanilha("Não foi possível ler"));
    act(() => { result.current.selecionar(xlsx()); });

    await act(async () => { leituras[0].rejeitar(new Error("boom")); await Promise.resolve(); });

    expect(result.current.erros).toEqual([{ codigo: null, mensagem: "Não foi possível ler", linha: null, coluna: null, valor: null }]);
  });

  it("limpar durante a leitura cancela a leitura e nenhum resultado aparece depois", async () => {
    const { result } = renderHook(() => useLeituraPlanilha("falhou"));
    act(() => { result.current.selecionar(xlsx()); });

    act(() => { result.current.limpar(); });
    await terminar(() => leituras[0].resolver(previa("Clock")));

    expect(leituras[0].cancelar).toHaveBeenCalled();
    expect(result.current).toMatchObject({ fase: "vazio", arquivo: null, previa: null });
  });

  it("problemas devolvidos pelo servidor levam a leitura concluída ao estado de erro", async () => {
    const { result } = renderHook(() => useLeituraPlanilha("falhou"));
    act(() => { result.current.selecionar(xlsx()); });
    await terminar(() => leituras[0].resolver(previa("Clock")));

    act(() => { result.current.definirErrosDoServidor([{ codigo: "pessoa_nao_encontrada", linha: 2, coluna: "Assignees", valor: "Zé" }], 1); });

    expect(result.current).toMatchObject({ fase: "erro", totalLinhasComErro: 1 });
    expect(result.current.previa?.app).toBe("Clock");
  });
});
