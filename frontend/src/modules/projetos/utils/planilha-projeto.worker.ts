/// <reference lib="webworker" />
import { lerPlanilhaProjeto, PlanilhaProjetoError } from "./planilha-projeto";
import type { MensagemLeitura } from "./ler-planilha-em-segundo-plano";

// O `XLSX.read` é síncrono: rodando aqui, a tela e a barra de progresso não travam em planilhas grandes.
self.onmessage = async (event: MessageEvent<File>) => {
  const enviar = (mensagem: MensagemLeitura) => self.postMessage(mensagem);
  try {
    enviar({ tipo: "ok", previa: await lerPlanilhaProjeto(event.data, (valor) => enviar({ tipo: "progresso", valor })) });
  } catch (error) {
    if (error instanceof PlanilhaProjetoError) {
      enviar({ tipo: "erro", erros: error.errors, totalLinhas: error.totalLinhas, pessoas: error.pessoas, colunas: error.colunas });
    } else {
      enviar({ tipo: "falha" });
    }
  }
};
