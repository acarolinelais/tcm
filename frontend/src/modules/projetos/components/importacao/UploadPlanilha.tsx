import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, CircleAlert, X } from "lucide-react";

import { formatNumber } from "@/core/i18n/format";
import { toast } from "@/shared/lib/toast";
import { usePresenca } from "@/shared/lib/use-presenca";
import { Button } from "@heroui/react";

import type { MotivoRecusa, useLeituraPlanilha } from "../../hooks/useLeituraPlanilha";
import { ErrosPlanilha } from "./ErrosPlanilha";
import { ExcelIcon, UploadFileIcon } from "./icones-importacao";
import { PreviaPlanilha } from "./PreviaPlanilha";

const EXTENSOES_ACEITAS = ".xls,.xlsx";
/** Saída dos cards e da prévia (`.upload-surgir[data-saindo]` em core/global.css). */
const DURACAO_SAIDA_MS = 150;
const CURVA = "ease-[cubic-bezier(0.32,0.72,0,1)]";
const MENSAGEM_RECUSA: Record<MotivoRecusa, string> = { formato: "projectFileTypeError", tamanho: "projectFileSizeError" };

type Leitura = ReturnType<typeof useLeituraPlanilha>;

const CARD = "mt-5 rounded-[20px] bg-panel px-5 py-5 sm:px-8";
// Erro sem código é arquivo ilegível; com código, a planilha foi lida mas tem problemas (RN-18).
const mensagemDeErro = (erros: Leitura["erros"]) => (erros.some((erro) => erro.codigo === null) ? "spreadsheetReadFailed" : "spreadsheetHasProblems");

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

/** Último valor não nulo: o card e a prévia continuam mostrando o conteúdo enquanto saem (RN-17). */
function useUltimoValor<T>(valor: T | null): T | null {
  const ultimo = useRef(valor);
  if (valor !== null) ultimo.current = valor;
  return ultimo.current;
}

/**
 * Upload da planilha do projeto (spec 016): área de soltar que recolhe ao concluir a leitura e reabre ao
 * remover, card do modelo ou do arquivo com a barra de progresso, problemas e prévia.
 */
export function UploadPlanilha({ leitura, onBaixarModelo }: { leitura: Leitura; onBaixarModelo: () => void }) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLButtonElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [focarArea, setFocarArea] = useState(false);
  // Com a leitura concluída a área recolhe; na leitura e no erro ela fica aberta (spec 016, RN-08 e RN-18).
  const areaAberta = leitura.fase !== "concluida";

  // Cards e prévia ficam montados durante a saída, com o último conteúdo que mostraram (RN-17).
  const cardArquivo = usePresenca(leitura.arquivo !== null, DURACAO_SAIDA_MS);
  const cardModelo = usePresenca(leitura.arquivo === null && !cardArquivo.montado, DURACAO_SAIDA_MS);
  const previa = usePresenca(leitura.previa !== null, DURACAO_SAIDA_MS);
  const exibida = useUltimoValor(leitura.arquivo ? leitura : null) ?? leitura;
  const previaExibida = useUltimoValor(leitura.previa);
  const casos = leitura.previa?.casos.length ?? 0;

  useEffect(() => {
    if (!focarArea || !areaAberta) return;
    area.current?.focus({ preventScroll: true });
    setFocarArea(false);
  }, [focarArea, areaAberta]);

  function selecionar(file?: File) {
    if (!file) return;
    const motivo = leitura.selecionar(file);
    if (motivo) toast.error(t(MENSAGEM_RECUSA[motivo]));
  }

  function remover() {
    leitura.limpar();
    setFocarArea(true);
    toast.success(t("spreadsheetRemoved"));
  }

  const anuncio = leitura.fase === "vazio" ? ""
    : leitura.fase === "lendo" ? t("readingSpreadsheet")
    : leitura.fase === "concluida" ? t("spreadsheetReadDone", { count: casos, countLabel: formatNumber(casos) })
    : t(mensagemDeErro(leitura.erros));

  return <>
    {/* Recolher e reabrir pela altura (grid 1fr ↔ 0fr): reabrir é mais lento que recolher (RN-17a). */}
    <div
      inert={!areaAberta}
      aria-hidden={!areaAberta}
      className={`grid transition-[grid-template-rows] ${CURVA} motion-reduce:transition-none ${areaAberta ? "grid-rows-[1fr] duration-[350ms]" : "grid-rows-[0fr] duration-[250ms]"}`}
    >
      <div className="min-h-0 overflow-hidden p-0.5">
        <button
          ref={area}
          type="button"
          onClick={() => input.current?.click()}
          onDragEnter={(event) => { event.preventDefault(); setArrastando(true); }}
          onDragOver={(event) => { event.preventDefault(); setArrastando(true); }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setArrastando(false); }}
          onDrop={(event) => { event.preventDefault(); setArrastando(false); selecionar(event.dataTransfer.files[0]); }}
          data-arrastando={arrastando}
          className={`dropzone-tracejada flex h-64 w-full items-center justify-center px-6 text-center outline-none transition-[background-color,scale] duration-150 ease-out hover:bg-accent-tint focus-visible:bg-accent-tint active:scale-[0.995] motion-reduce:active:scale-100 ${arrastando ? "bg-accent-tint" : "bg-surface"}`}
        >
          {/* O conteúdo surge depois de a área começar a crescer, e some sem atraso ao recolher. */}
          <span className={`flex flex-col items-center transition-[opacity,translate] ${CURVA} motion-reduce:translate-y-0 ${areaAberta ? "translate-y-0 opacity-100 delay-[80ms] duration-300" : "translate-y-1 opacity-0 duration-150"}`}>
            <UploadFileIcon aria-hidden="true" className="mb-4 h-11 w-9 text-body" />
            <span className="text-base font-medium text-body">{t("dragSpreadsheet")} <span className="text-accent-text underline underline-offset-4">{t("chooseSpreadsheet")}</span></span>
          </span>
        </button>
        <div className="mt-2.5 flex justify-between gap-4 px-2 text-sm leading-5 text-subtle"><p>{t("spreadsheetFormats")}</p><p className="shrink-0">{t("spreadsheetMaxSize")}</p></div>
        {leitura.recusa && <p className="mt-1.5 px-2 text-sm text-destructive">{t(MENSAGEM_RECUSA[leitura.recusa])}</p>}
      </div>
    </div>
    <input ref={input} className="sr-only" type="file" accept={EXTENSOES_ACEITAS} tabIndex={-1} aria-hidden="true" onChange={(event) => { selecionar(event.target.files?.[0]); event.target.value = ""; }} />
    <p role="status" className="sr-only">{anuncio}</p>

    {cardModelo.montado && <div data-saindo={cardModelo.saindo || undefined} className={`upload-surgir ${CARD} flex flex-wrap items-center justify-between gap-4`}>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-base font-medium leading-6 text-body"><ExcelIcon aria-hidden="true" className="size-6 shrink-0" />{t("spreadsheetTemplateTitle")}</p>
        <p className="mt-1.5 max-w-[28rem] text-sm leading-5 text-subtle">{t("spreadsheetTemplateDescription")}</p>
      </div>
      <Button variant="outline" onPress={onBaixarModelo} className="rounded-[10px] bg-surface px-4 font-medium text-body">{t("downloadTemplate")}</Button>
    </div>}

    {cardArquivo.montado && exibida.arquivo && <CardArquivo arquivo={exibida.arquivo} leitura={exibida} saindo={cardArquivo.saindo} onRemover={remover} />}

    {leitura.erros.length > 0 && <ErrosPlanilha erros={leitura.erros} totalLinhas={leitura.totalLinhasComErro} />}
    {previa.montado && previaExibida && <div data-saindo={previa.saindo || undefined} className="upload-surgir upload-surgir-previa">
      <PreviaPlanilha previa={previaExibida} />
    </div>}
  </>;
}

function CardArquivo({ arquivo, leitura, saindo, onRemover }: { arquivo: File; leitura: Leitura; saindo: boolean; onRemover: () => void }) {
  const { t } = useTranslation();
  const { fase, progresso, previa, erros } = leitura;
  const casos = previa?.casos.length ?? 0;
  const erro = fase === "erro";

  return <div data-saindo={saindo || undefined} className={`upload-surgir relative ${CARD}`}>
    <Button isIconOnly variant="ghost" size="sm" aria-label={t("removeFile")} onPress={onRemover} className="absolute right-3 top-3 size-8 text-subtle"><X aria-hidden="true" className="size-4" /></Button>
    <div className="flex items-center gap-4 pr-8">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-edge bg-surface"><ExcelIcon aria-hidden="true" className="size-6" /></span>
      <div className="min-w-0">
        <p className="truncate text-base font-medium text-body">{arquivo.name}</p>
        <p className="mt-0.5 text-sm text-subtle">{fase === "concluida" ? `${megabytes(arquivo.size)} · ${t("testCaseCount", { count: casos, countLabel: formatNumber(casos) })}` : megabytes(arquivo.size)}</p>
      </div>
    </div>
    <div className="mt-4 flex items-center gap-3">
      <div role="progressbar" aria-label={t("spreadsheetProgressLabel")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progresso} className="h-1.5 flex-1 overflow-hidden rounded-full bg-default">
        {/* transform em vez de width: a barra anima sem recalcular o layout. */}
        <div style={{ transform: `scaleX(${progresso / 100})` }} className={`h-full origin-left rounded-full transition-[transform,background-color] duration-300 ${CURVA} motion-reduce:duration-150 ${erro ? "bg-destructive" : "bg-primary"}`} />
      </div>
      <span className="flex w-10 justify-end text-sm tabular-nums text-subtle">
        {fase === "concluida" ? <Check aria-hidden="true" className="size-4 text-success" /> : erro ? <CircleAlert aria-hidden="true" className="size-4 text-destructive" /> : `${progresso} %`}
      </span>
    </div>
    {erro && <p className="mt-2 text-sm text-destructive">{t(mensagemDeErro(erros))}</p>}
  </div>;
}
