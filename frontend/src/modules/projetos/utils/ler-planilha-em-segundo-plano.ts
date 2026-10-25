import type { ErroPlanilha } from "../model/projeto";
import { FALHA_LEITURA, lerPlanilhaProjeto, PlanilhaProjetoError, type PessoasDaLinha, type PlanilhaProjeto } from "./planilha-projeto";

/** Mensagens do worker. O `PlanilhaProjetoError` viaja pelos seus campos e é recriado aqui. */
export type MensagemLeitura =
  | { tipo: "progresso"; valor: number }
  | { tipo: "ok"; previa: PlanilhaProjeto }
  | { tipo: "erro"; erros: ErroPlanilha[]; totalLinhas?: number; pessoas: PessoasDaLinha[]; colunas?: PlanilhaProjeto["colunas"] }
  | { tipo: "falha" };

export interface LeituraEmAndamento {
  promessa: Promise<PlanilhaProjeto>;
  /** Encerra a leitura. Sem worker não há como interromper: quem chama descarta o resultado. */
  cancelar: () => void;
}

export function lerPlanilhaEmSegundoPlano(file: File, onProgress: (valor: number) => void): LeituraEmAndamento {
  // jsdom (testes) não tem Worker: a leitura roda na thread principal, com o mesmo contrato.
  if (typeof Worker === "undefined") return { promessa: lerPlanilhaProjeto(file, onProgress), cancelar: () => undefined };

  const worker = new Worker(new URL("./planilha-projeto.worker.ts", import.meta.url), { type: "module" });
  const promessa = new Promise<PlanilhaProjeto>((resolve, reject) => {
    worker.onmessage = ({ data }: MessageEvent<MensagemLeitura>) => {
      if (data.tipo === "progresso") return onProgress(data.valor);
      worker.terminate();
      if (data.tipo === "ok") resolve(data.previa);
      else if (data.tipo === "erro") reject(new PlanilhaProjetoError(data.erros, data.totalLinhas, data.pessoas, data.colunas));
      else reject(new Error(FALHA_LEITURA));
    };
    // Erro no worker ou resultado que não pôde ser desserializado: a leitura falha em vez de ficar parada.
    worker.onerror = worker.onmessageerror = () => { worker.terminate(); reject(new Error(FALHA_LEITURA)); };
  });
  worker.postMessage(file);
  return { promessa, cancelar: () => worker.terminate() };
}
