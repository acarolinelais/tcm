import { useRef } from "react";
import { Button } from "@heroui/react";
import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { ApiError } from "@/shared/api/problem-details";
import { toast } from "@/shared/lib/toast";
import { useImportarRelatorioSdf } from "../../hooks/useProjetos";
import { errosDaApi, formatarErroPlanilha } from "../../utils/formatar-erro-planilha";

// Mais que isso não cabe no toast; o resto vira "e mais N".
const MAX_PROBLEMAS = 5;

/**
 * Import SDF Report do projeto aberto na General Results (spec 059, RN-03 a RN-05): importa assim que o arquivo é
 * escolhido. Só admin, gerente e KP com `form_factor.importar` veem o botão.
 */
export function AcoesGerenciaFormFactor({ projetoId, perfil }: { projetoId: string; perfil: PerfilAtual }) {
  const { t } = useTranslation();
  const admin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  const podeImportarSdf = admin || (["GERENTE", "KP"].includes(perfil.perfil_codigo ?? "") && perfil.permissoes.includes("form_factor.importar"));
  const inputSdf = useRef<HTMLInputElement>(null);
  const importacao = useImportarRelatorioSdf(projetoId);

  if (!podeImportarSdf) return null;

  const importar = (arquivo: File) => importacao.mutate(arquivo, {
    onSuccess: (result) => {
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
    <input ref={inputSdf} className="sr-only" type="file" accept=".xls,.xlsx" tabIndex={-1} aria-hidden="true" onChange={(event) => {
      const arquivo = event.target.files?.[0];
      event.target.value = "";
      if (arquivo) importar(arquivo);
    }} />
    <Button size="sm" variant="primary" isDisabled={importacao.isPending} onPress={() => inputSdf.current?.click()}>
      <Download aria-hidden="true" className="size-4 shrink-0" />{importacao.isPending ? t("importing") : t("importSdf")}
    </Button>
  </>;
}
