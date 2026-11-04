import { useRef, useState } from "react";
import { Button } from "@heroui/react";
import { Download, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { ApiError } from "@/shared/api/problem-details";
import { toast } from "@/shared/lib/toast";
import { useCriarRodadaFormFactor, useImportarRelatorioSdf } from "../../hooks/useProjetos";
import { errosDaApi, formatarErroPlanilha } from "../../utils/formatar-erro-planilha";
import { FormFactorCriarRodadaDialog } from "./FormFactorCriarRodadaDialog";

// Mais que isso não cabe no toast; o resto vira "e mais N".
const MAX_PROBLEMAS = 5;

/**
 * Import SDF Report e Create test round do projeto aberto na General Results (spec 059, RN-03 a RN-05).
 * Só admin, gerente e KP com a permissão de cada botão os veem: o dev também tem `form_factor.registrar`, mas para
 * lançar o resultado dos próprios casos, não para criar rodada.
 */
export function AcoesGerenciaFormFactor({ projetoId, perfil }: { projetoId: string; perfil: PerfilAtual }) {
  const { t } = useTranslation();
  const admin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  const perfilGestao = admin || ["GERENTE", "KP"].includes(perfil.perfil_codigo ?? "");
  const podeCriarRodada = perfilGestao && (admin || perfil.permissoes.includes("form_factor.registrar"));
  const podeImportarSdf = perfilGestao && (admin || perfil.permissoes.includes("form_factor.importar"));
  const [abrirCriacaoRodada, setAbrirCriacaoRodada] = useState(false);
  const [arquivoSdf, setArquivoSdf] = useState<File | null>(null);
  const inputSdf = useRef<HTMLInputElement>(null);
  const criarRodada = useCriarRodadaFormFactor(projetoId);
  const importacao = useImportarRelatorioSdf(projetoId);

  if (!podeCriarRodada && !podeImportarSdf) return null;

  const importar = (arquivo: File) => importacao.mutate(arquivo, {
    onSuccess: (result) => {
      setArquivoSdf(null);
      toast.success(t("sdfImportSuccess", { rows: result.quantidade_execucoes, results: result.quantidade_resultados }));
    },
    onError: (error) => {
      // Relatório recusado (422, ADR 0033): os problemas vêm com código e viram texto no idioma da tela.
      const problemas = error instanceof ApiError && error.problem.status === 422 ? errosDaApi(error.problem) : [];
      if (!problemas.length) return toast.error(error instanceof Error ? error.message : t("sdfImportError"));
      toast.error(t("sdfImportError"), {
        // Uma lista de problemas não se lê nos 4 s padrão: fica aberta até a pessoa fechar.
        timeout: 0,
        description: <ul className="list-disc space-y-0.5 ps-4">
          {problemas.slice(0, MAX_PROBLEMAS).map((problema, indice) => <li key={indice}>
            {problema.linha ? `${t("spreadsheetRow", { linha: problema.linha })}: ` : ""}{formatarErroPlanilha(t, problema)}
          </li>)}
          {problemas.length > MAX_PROBLEMAS && <li>{t("moreProblems", { count: problemas.length - MAX_PROBLEMAS })}</li>}
        </ul>,
      });
    },
  });

  return <>
    {podeImportarSdf && <>
      <input ref={inputSdf} className="sr-only" type="file" accept=".xls,.xlsx" tabIndex={-1} aria-hidden="true" onChange={(event) => { setArquivoSdf(event.target.files?.[0] ?? null); event.target.value = ""; }} />
      <Button size="sm" variant="primary" className="h-auto min-h-8 whitespace-normal text-left leading-tight" onPress={() => inputSdf.current?.click()}>
        <Download aria-hidden="true" className="size-4 shrink-0" />{arquivoSdf?.name ?? t("importSdf")}
      </Button>
      {arquivoSdf && <Button size="sm" variant="primary" isDisabled={importacao.isPending} onPress={() => importar(arquivoSdf)}>{importacao.isPending ? t("saving") : t("import")}</Button>}
    </>}
    {podeCriarRodada && <Button size="sm" variant="outline" onPress={() => setAbrirCriacaoRodada(true)}>
      <Plus aria-hidden="true" className="size-4" />{t("createTestRound")}
    </Button>}
    <FormFactorCriarRodadaDialog
      aberto={abrirCriacaoRodada}
      onAbertoChange={setAbrirCriacaoRodada}
      salvando={criarRodada.isPending}
      onCriar={(sdfId) => criarRodada.mutate({ sdf_id: sdfId }, {
        onSuccess: () => { setAbrirCriacaoRodada(false); toast.success(t("testRoundCreated")); },
        // Erros no toast, com o modal aberto para corrigir; o SDF ID repetido usa a mensagem traduzida.
        onError: (error) => toast.error(error instanceof ApiError && error.problem.errors?.some((erro) => erro.campo === "sdf_id")
          ? t("sdfIdAlreadyUsed")
          : error instanceof Error ? error.message : t("roundCreateError")),
      })}
    />
  </>;
}
