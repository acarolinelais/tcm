import { useState } from "react";
import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { SideDrawer } from "@/shared/ui/side-drawer";
import { ehNaoEncontrado, useCasoTeste, usePullRequestsCasoTeste } from "../../hooks/useProjetos";
import { RetryAlert } from "@/shared/ui/retry-alert";
import type { CasoTesteDetalhe, CasoTesteResumo } from "../../model/projeto";
import { PullRequestsCasoTeste } from "./PullRequestsCasoTeste";

const SECOES = [
  { rotulo: "caseTitle", campo: "title" },
  { rotulo: "casePrecondition", campo: "precondition" },
  { rotulo: "caseProcedure", campo: "procedure" },
  { rotulo: "caseExpectedResult", campo: "expected_result" },
] as const satisfies readonly { rotulo: string; campo: keyof CasoTesteDetalhe }[];

/**
 * Painel com os textos da planilha (spec 028), só de leitura, e o histórico de links de PR (spec 030), aberto pelo
 * TC ID das tabelas. Busca o detalhe ao abrir: a listagem não traz os textos.
 */
export function DetalhesCasoTesteDrawer({ caso, perfil, onFechar }: { caso: CasoTesteResumo | null; perfil?: PerfilAtual; onFechar: () => void }) {
  const { t } = useTranslation();
  // Guarda o último caso aberto: o painel continua com o conteúdo durante a animação de saída.
  const [exibido, setExibido] = useState(caso);
  if (caso && caso !== exibido) setExibido(caso);
  const detalhe = useCasoTeste(exibido?.id ?? "", perfil);
  // Busca os links junto com o detalhe, e não depois dele: a seção lê esta mesma consulta do cache.
  usePullRequestsCasoTeste(exibido?.id ?? "", perfil);

  return (
    <SideDrawer
      isOpen={Boolean(caso)}
      onOpenChange={(aberto) => { if (!aberto) onFechar(); }}
      title={exibido?.tc_id ?? ""}
      variant="card"
      // Como no Figma: Cancel e Done. O painel é só de leitura, então os dois apenas fecham.
      footer={<>
        <Button variant="tertiary" onPress={onFechar}>{t("cancel")}</Button>
        <Button variant="primary" onPress={onFechar}>{t("done")}</Button>
      </>}
    >
      <div className="px-7 pb-6 pt-1">
        {/* Os dados vêm antes do erro: uma nova busca que falha em segundo plano não apaga o texto que a pessoa está lendo. */}
        {detalhe.data ? (<>
          <dl className="space-y-8">
            {SECOES.map(({ rotulo, campo }) => (
              <div key={campo}>
                <dt className="text-[18px] font-medium leading-6 text-[#454442]">{t(rotulo)}</dt>
                <dd className="mt-3 whitespace-pre-wrap break-words text-[14px] leading-5 text-muted">{detalhe.data[campo] ?? "—"}</dd>
              </div>
            ))}
          </dl>
          {/* `key`: outro caso começa com o campo vazio; uma URL digitada e não adicionada não passa adiante. */}
          <PullRequestsCasoTeste key={detalhe.data.id} casoId={detalhe.data.id} perfil={perfil} />
        </>) : ehNaoEncontrado(detalhe.error) ? <p role="alert" className="text-[14px] leading-6 text-[#454442]">{t("caseNotFound")}</p>
          : detalhe.isError ? (
            <RetryAlert message={t("caseDetailsLoadError")} onRetry={() => void detalhe.refetch()} />
          )
          : <p role="status" className="text-[14px] leading-6 text-muted">{t("loading")}</p>}
      </div>
    </SideDrawer>
  );
}
