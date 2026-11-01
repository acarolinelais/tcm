import { useTranslation } from "react-i18next";

import { formatDate } from "@/core/i18n/format";
import { ComparacaoAlteracao } from "@/modules/auditoria/components/ComparacaoAlteracao";

import type { AlteracaoCasoTeste } from "../../model/projeto";

/** Uma mudança do histórico do Test Case: a comparação da auditoria (spec 052), o autor e quando (specs 038 e 054). */
export function AlteracaoCasoTesteItem({ alteracao }: { alteracao: AlteracaoCasoTeste }) {
  const { t } = useTranslation();
  const autor = alteracao.usuario_nome
    ? alteracao.usuario_perfil ? `${alteracao.usuario_nome} (${alteracao.usuario_perfil})` : alteracao.usuario_nome
    : t("system");

  return <li className="grid gap-1.5 py-3">
    <ComparacaoAlteracao alteracao={alteracao} />
    <p className="text-[12px] leading-4 text-muted">
      {autor}
      {alteracao.origem === "form_factor" && <> · {t("formFactor")}</>}
      {" · "}
      <time dateTime={alteracao.alterado_em}>{formatDate(alteracao.alterado_em, { dateStyle: "short", timeStyle: "short" })}</time>
    </p>
  </li>;
}
