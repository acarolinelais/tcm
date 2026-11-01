import { useState, type ReactNode } from "react";
import { Button } from "@heroui/react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { formatDate } from "@/core/i18n/format";
import { linkClassName } from "@/shared/ui/link";
import { SideDrawer } from "@/shared/ui/side-drawer";
import { TagChip } from "@/shared/ui/tag-chip";

import { ROTULO_ACAO, TOM_ACAO, rotuloOrigem, tomOrigem, type RegistroAuditoria } from "../model/auditoria";
import { ComparacaoAlteracao } from "./ComparacaoAlteracao";

/** RN-07: todos os campos alterados, autor, perfil, origem, tela e a data exata, com atalho para o Test Case. */
export function DetalheAuditoriaDrawer({ registro, onFechar }: { registro: RegistroAuditoria | null; onFechar: () => void }) {
  const { t } = useTranslation();
  // Guarda o último registro: o painel mantém o conteúdo durante a animação de saída.
  const [exibido, setExibido] = useState(registro);
  if (registro && registro !== exibido) setExibido(registro);

  const dados: [string, ReactNode][] = exibido ? [
    [t("auditDateTime"), formatDate(exibido.alterado_em, { dateStyle: "long", timeStyle: "medium" })],
    [t("user"), exibido.usuario_nome ?? "—"],
    [t("profile"), exibido.usuario_perfil ?? "—"],
    [t("auditAction"), <TagChip tom={TOM_ACAO[exibido.acao]}>{t(ROTULO_ACAO[exibido.acao])}</TagChip>],
    [t("origin"), <TagChip tom={tomOrigem(exibido.origem)}>{rotuloOrigem(exibido.origem, t)}</TagChip>],
    [t("auditScreen"), exibido.tela ?? "—"],
  ] : [];

  return (
    <SideDrawer
      isOpen={Boolean(registro)}
      onOpenChange={(aberto) => { if (!aberto) onFechar(); }}
      title={t("auditDetails")}
      subtitle={exibido ? `${exibido.tc_id} · ${exibido.projeto_nome}` : undefined}
      variant="card"
      footer={<Button variant="primary" onPress={onFechar}>{t("done")}</Button>}
    >
      {exibido ? (
        <div className="space-y-8 px-7 pb-6 pt-1">
          <section aria-labelledby="auditoria-alteracoes">
            <h3 id="auditoria-alteracoes" className="text-[18px] font-medium leading-6 text-body">{t("auditChanges")}</h3>
            <ul className="mt-3 space-y-4 text-[14px] leading-5">
              {exibido.alteracoes.map((alteracao) => <li key={alteracao.campo}><ComparacaoAlteracao alteracao={alteracao} /></li>)}
            </ul>
          </section>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-[14px] leading-5">
            {dados.map(([rotulo, valor]) => (
              <div key={rotulo} className="contents">
                <dt className="font-medium text-body">{rotulo}</dt>
                <dd className="break-words text-muted">{valor}</dd>
              </div>
            ))}
          </dl>
          {/* Abre o projeto com o painel do Test Case aberto (ProjetoDetalhePage lê `caso` e `tc`). */}
          <Link className={`${linkClassName} text-[14px]`} to={`/projetos/${exibido.projeto_id}?caso=${encodeURIComponent(exibido.caso_teste_id)}&tc=${encodeURIComponent(exibido.tc_id)}`}>
            {t("auditOpenTestCase")}
          </Link>
        </div>
      ) : null}
    </SideDrawer>
  );
}
