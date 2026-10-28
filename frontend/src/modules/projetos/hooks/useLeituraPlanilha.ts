import { useCallback, useEffect, useRef, useState } from "react";

import type { ErroPlanilhaExibivel } from "../utils/formatar-erro-planilha";
import { lerPlanilhaEmSegundoPlano, type LeituraEmAndamento } from "../utils/ler-planilha-em-segundo-plano";
import { PlanilhaProjetoError, type PlanilhaProjeto } from "../utils/planilha-projeto";

export const TAMANHO_MAXIMO_PLANILHA = 25 * 1024 * 1024;
/** Tempo para a barra terminar de encher antes de a prévia aparecer (spec 016, RN-12). */
export const DURACAO_BARRA_MS = 300;

export type FaseLeitura = "vazio" | "lendo" | "concluida" | "erro";
export type MotivoRecusa = "formato" | "tamanho";

interface EstadoLeitura {
  arquivo: File | null;
  fase: FaseLeitura;
  progresso: number;
  previa: PlanilhaProjeto | null;
  erros: ErroPlanilhaExibivel[];
  totalLinhasComErro?: number;
}

const inicial: EstadoLeitura = { arquivo: null, fase: "vazio", progresso: 0, previa: null, erros: [] };

const movimentoReduzido = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Ciclo de vida da leitura da planilha: progresso, troca, remoção e falhas (spec 016). */
export function useLeituraPlanilha(mensagemFalhaLeitura: string) {
  const [estado, setEstado] = useState<EstadoLeitura>(inicial);
  // Fica aqui, e não no componente da área de soltar, para sobreviver à troca entre importar e cadastrar à mão.
  const [recusa, setRecusa] = useState<MotivoRecusa | null>(null);
  // Cada leitura tem uma geração: progresso e resultado de uma geração antiga são descartados (RN-15).
  const geracao = useRef(0);
  const leitura = useRef<LeituraEmAndamento | null>(null);
  const revelar = useRef<number | undefined>(undefined);

  const interromper = useCallback(() => {
    geracao.current += 1;
    leitura.current?.cancelar();
    leitura.current = null;
    window.clearTimeout(revelar.current);
  }, []);
  useEffect(() => interromper, [interromper]);

  const selecionar = useCallback((file: File): MotivoRecusa | null => {
    const motivo: MotivoRecusa | null = !/\.xlsx?$/i.test(file.name) ? "formato" : file.size > TAMANHO_MAXIMO_PLANILHA ? "tamanho" : null;
    setRecusa(motivo);
    if (motivo) return motivo;
    interromper();
    const atual = geracao.current;
    const vigente = () => atual === geracao.current;
    // O progresso volta a 0 e a barra recua animada de onde estava (RN-15).
    setEstado({ ...inicial, arquivo: file, fase: "lendo" });
    const concluir = (resultado: Partial<EstadoLeitura>) => {
      if (!vigente()) return;
      setEstado((anterior) => ({ ...anterior, progresso: 100 }));
      // A prévia só aparece depois de a barra terminar de encher (RN-12).
      revelar.current = window.setTimeout(() => {
        if (vigente()) setEstado((anterior) => ({ ...anterior, ...resultado }));
      }, movimentoReduzido() ? 0 : DURACAO_BARRA_MS);
    };
    leitura.current = lerPlanilhaEmSegundoPlano(file, (valor) => {
      // A barra nunca volta atrás dentro de uma leitura (RN-12).
      if (vigente()) setEstado((anterior) => (anterior.progresso >= valor ? anterior : { ...anterior, progresso: valor }));
    });
    leitura.current.promessa.then(
      (previa) => concluir({ fase: "concluida", previa }),
      (error: unknown) => {
        if (!vigente()) return;
        // Em erro, a barra para onde estava (RN-18): não passa por concluir().
        setEstado((anterior) => ({
          ...anterior,
          fase: "erro",
          ...(error instanceof PlanilhaProjetoError
            ? { erros: error.errors, totalLinhasComErro: error.totalLinhas }
            : { erros: [{ codigo: null, mensagem: mensagemFalhaLeitura, linha: null, coluna: null, valor: null }] }),
        }));
      },
    );
    return null;
  }, [interromper, mensagemFalhaLeitura]);

  /** Remove o arquivo (ou limpa o formulário): cancela a leitura em andamento e volta ao início. */
  const limpar = useCallback(() => { interromper(); setEstado(inicial); setRecusa(null); }, [interromper]);
  /** Problemas devolvidos pelo servidor ao conferir a planilha (spec 011, CA-26). */
  const definirErrosDoServidor = useCallback((erros: ErroPlanilhaExibivel[], totalLinhasComErro?: number) => {
    // Com problemas do servidor o card sai do estado concluído e a área reabre (RN-18).
    setEstado((anterior) => ({ ...anterior, erros, totalLinhasComErro, fase: erros.length ? "erro" : anterior.fase }));
  }, []);

  return { ...estado, recusa, selecionar, limpar, definirErrosDoServidor };
}
