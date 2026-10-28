import { useState } from "react";
import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { SideDrawer } from "@/shared/ui/side-drawer";
import { ehNaoEncontrado, useCasoTeste } from "../../hooks/useProjetos";
import type { CasoTeste, CasoTesteDetalhe } from "../../model/projeto";

const SECOES = [
  { rotulo: "caseTitle", campo: "title" },
  { rotulo: "casePrecondition", campo: "precondition" },
  { rotulo: "caseProcedure", campo: "procedure" },
  { rotulo: "caseExpectedResult", campo: "expected_result" },
] as const satisfies readonly { rotulo: string; campo: keyof CasoTesteDetalhe }[];

/**
 * Painel só de leitura com os textos da planilha (spec 028), aberto pelo TC ID da tabela. Busca o detalhe ao abrir:
 * a listagem não traz os textos.
 */
export function DetalhesCasoTesteDrawer({ caso, perfil, onFechar }: { caso: CasoTeste | null; perfil?: PerfilAtual; onFechar: () => void }) {
  const { t } = useTranslation();
  // Guarda o último caso aberto: o painel continua com o conteúdo durante a animação de saída.
  const [exibido, setExibido] = useState(caso);
  if (caso && caso !== exibido) setExibido(caso);
  const detalhe = useCasoTeste(exibido?.id ?? "", perfil);

  return (
    <SideDrawer
      isOpen={Boolean(caso)}
      onOpenChange={(aberto) => { if (!aberto) onFechar(); }}
      title={exibido?.tc_id ?? ""}
      footer={<Button variant="secondary" onPress={onFechar}>{t("close")}</Button>}
    >
      <div className="px-7 py-6">
        {/* Os dados vêm antes do erro: uma nova busca que falha em segundo plano não apaga o texto que a pessoa está lendo. */}
        {detalhe.data ? (
          <dl className="space-y-6">
            {SECOES.map(({ rotulo, campo }) => (
              <div key={campo}>
                <dt className="text-[14px] font-semibold leading-5 text-[#454442]">{t(rotulo)}</dt>
                <dd className="mt-2 whitespace-pre-wrap break-words text-[14px] leading-6 text-[#454442]">{detalhe.data[campo] ?? "—"}</dd>
              </div>
            ))}
          </dl>
        ) : ehNaoEncontrado(detalhe.error) ? <p role="alert" className="text-[14px] leading-6 text-[#454442]">{t("caseNotFound")}</p>
          : detalhe.isError ? (
            <div role="alert" className="flex flex-col items-start gap-3 text-[14px] leading-6 text-[#454442]">
              <p>{t("caseDetailsLoadError")}</p>
              <Button variant="outline" onPress={() => void detalhe.refetch()}>{t("retryQuery")}</Button>
            </div>
          )
          : <p role="status" className="text-[14px] leading-6 text-muted">{t("loading")}</p>}
      </div>
    </SideDrawer>
  );
}
