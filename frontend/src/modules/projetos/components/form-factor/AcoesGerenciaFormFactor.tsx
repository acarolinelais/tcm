import { useRef, useState } from "react";
import { Button, Dropdown } from "@heroui/react";
import { ChevronDown, Download, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { formatDate } from "@/core/i18n/format";
import { ApiError } from "@/shared/api/problem-details";
import { toast } from "@/shared/lib/toast";
import { AlertConfirm } from "@/shared/ui/alert-confirm";
import type { UltimaImportacaoSdf } from "../../model/projeto";
import { useDesfazerImportacaoSdf, useImportarRelatorioSdf, useUltimaImportacaoSdf } from "../../hooks/useProjetos";
import { errosDaApi, formatarErroPlanilha } from "../../utils/formatar-erro-planilha";

// Mais que isso não cabe no toast; o resto vira "e mais N".
const MAX_PROBLEMAS = 5;

/**
 * Import SDF Report do projeto aberto na General Results (spec 059, RN-03 a RN-05): importa assim que o arquivo é
 * escolhido. Só admin, gerente e KP com `form_factor.importar` veem os botões.
 */
// Pílula como os filtros ao lado (Closed projects, Day or Week), no tamanho padrão do HeroUI.
const classeBotao = "gap-2 rounded-full px-4 shadow-none";

export function AcoesGerenciaFormFactor({ projetoId, perfil }: { projetoId: string; perfil: PerfilAtual }) {
  const { t } = useTranslation();
  const admin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  const podeImportarSdf = admin || (["GERENTE", "KP"].includes(perfil.perfil_codigo ?? "") && perfil.permissoes.includes("form_factor.importar"));
  const inputSdf = useRef<HTMLInputElement>(null);
  const importacao = useImportarRelatorioSdf(projetoId);
  const ultima = useUltimaImportacaoSdf(projetoId, podeImportarSdf);
  const desfazer = useDesfazerImportacaoSdf(projetoId);
  // O que o diálogo mostrou: um refetch com ele aberto não pode trocar a importação confirmada.
  const [alvo, setAlvo] = useState<UltimaImportacaoSdf | null>(null);
  const ocupado = importacao.isPending || desfazer.isPending;

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

  const desfazerAlvo = (importacaoId: string) => desfazer.mutate(importacaoId, {
    onSuccess: () => { setAlvo(null); toast.success(t("importUndone")); },
    onError: (error) => {
      setAlvo(null);
      if (error instanceof ApiError && error.problem.status === 409) return toast.error(t("importNotLatest"));
      toast.error(error instanceof Error ? error.message : t("undoImportError"));
    },
  });

  return <>
    <input ref={inputSdf} className="sr-only" type="file" accept=".xls,.xlsx" tabIndex={-1} aria-hidden="true" onChange={(event) => {
      const arquivo = event.target.files?.[0];
      event.target.value = "";
      if (arquivo) importar(arquivo);
    }} />
    {/* Separa estas ações dos filtros que vêm antes na mesma linha; some junto quando a pessoa não importa. */}
    <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-separator sm:block" />
    {/* Com uma importação para desfazer, vira botão dividido: a seta abre o menu com o Undo. */}
    <div className="flex">
      <Button variant="primary" isDisabled={ocupado} onPress={() => inputSdf.current?.click()} className={ultima.data ? `${classeBotao} rounded-r-none pr-3` : classeBotao}>
        <Download aria-hidden="true" className="size-4 shrink-0" />{importacao.isPending ? t("importing") : t("importSdf")}
      </Button>
      {ultima.data && <Dropdown>
        <Button variant="primary" isIconOnly isDisabled={ocupado} aria-label={t("moreImportActions")} className="rounded-l-none border-l border-accent-foreground/30 shadow-none">
          <ChevronDown aria-hidden="true" className="size-4" />
        </Button>
        <Dropdown.Popover placement="bottom end" className="min-w-52">
          <Dropdown.Menu aria-label={t("moreImportActions")} onAction={() => setAlvo(ultima.data ?? null)}>
            <Dropdown.Item id="desfazer" textValue={t("undoLastImport")} className="gap-2 text-[14px]">
              <Undo2 aria-hidden="true" className="size-4 shrink-0" />{t("undoLastImport")}
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>}
    </div>
    {alvo && <AlertConfirm
      open
      onOpenChange={(aberto) => { if (!aberto) setAlvo(null); }}
      variant="destructive"
      title={t("undoImportTitle")}
      description={t("undoImportDescription")}
      confirmLabel={t("undoImportConfirm")}
      isPending={desfazer.isPending}
      onConfirm={() => desfazerAlvo(alvo.id)}
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[14px]">
        {([
          [t("sdfId"), alvo.sdf_id],
          [t("device"), alvo.device],
          [t("executionDate"), formatDate(alvo.data_execucao, { dateStyle: "medium", timeStyle: "short" })],
          [t("importedBy"), alvo.importado_por_nome],
          [t("importedOn"), formatDate(alvo.importado_em, { dateStyle: "medium", timeStyle: "short" })],
        ] as const).map(([rotulo, valor]) => <div key={rotulo} className="contents">
          <dt className="text-muted">{rotulo}</dt><dd className="text-body">{valor}</dd>
        </div>)}
      </dl>
    </AlertConfirm>}
  </>;
}
