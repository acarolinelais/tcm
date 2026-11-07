import { buttonVariants } from "@heroui/react";
import { Download, FileQuestion } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { languageCode } from "@/core/i18n";
import { cn } from "@/shared/lib/utils";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { linkClassName } from "@/shared/ui/link";
import { PageCard, PageDescription, PageTitle } from "@/shared/ui/page-card";

import { guiaPorSlug, urlSlides } from "../conteudo/guias";

const fimDoTermo = (texto: string) => texto.indexOf(": ");

// Só uma lista em que todo item é "Termo: descrição" ganha os termos em destaque, para a lista não ficar com negrito salteado.
const listaDeTermos = (itens: string[]) => itens.every((item) => fimDoTermo(item) > 0 && fimDoTermo(item) <= 40);

function TextoDoItem({ texto, destacar }: { texto: string; destacar: boolean }) {
  if (!destacar) return texto;
  const fim = fimDoTermo(texto);
  return <><span className="font-medium text-body">{texto.slice(0, fim)}</span>{texto.slice(fim)}</>;
}

export function GuiaPage() {
  const { t, i18n } = useTranslation();
  const { slug = "" } = useParams();
  const { hash } = useLocation();
  const guia = guiaPorSlug(slug, i18n.resolvedLanguage);
  // O guia só monta depois que o perfil carrega: o navegador já tentou a âncora do endereço e não achou.
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView(); }, [hash, guia?.slug]);

  if (!guia) {
    return (
      <PageCard className="items-center justify-center">
        <EstadoVazio tituloDaPagina titulo={t("docsGuideNotFound")} dica={t("docsGuideNotFoundHint")} icone={<FileQuestion aria-hidden="true" className="size-7" />}>
          <Link to="/documentation" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-5" })}>{t("docsBackToList")}</Link>
        </EstadoVazio>
      </PageCard>
    );
  }

  const slides = urlSlides(guia.slug, i18n.resolvedLanguage);
  const slidesEmIngles = languageCode(i18n.resolvedLanguage) !== "en" && slides?.startsWith("/docs/en/");
  const ancora = (indice: number) => `secao-${indice + 1}`;
  return (
    <PageCard className="overflow-y-auto [&>*]:shrink-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <PageTitle className="whitespace-normal">{guia.titulo}</PageTitle>
          <PageDescription>{guia.resumo}</PageDescription>
        </div>
        {slides && (
          <a href={slides} download className={buttonVariants({ variant: "primary", size: "sm" })}>
            <Download aria-hidden="true" className="size-4" />
            {t(slidesEmIngles ? "docsDownloadSlidesEnglish" : "docsDownloadSlides")}
          </a>
        )}
      </div>
      {!guia.traduzido && <p role="note" className="mt-4 max-w-3xl rounded-lg bg-accent-tint px-3 py-2 text-[13px] text-body">{t("docsNotTranslated")}</p>}
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,48rem)_13rem]">
        <article className="flex flex-col gap-4 text-[14px] leading-6 text-muted">
          {guia.secoes.map((secao, indice) => (
            <section key={indice} id={ancora(indice)} className="scroll-mt-4 rounded-2xl border border-edge p-5 sm:p-6">
              <h2 className="flex items-center gap-3 text-[16px] font-medium text-body">
                <span aria-hidden="true" className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-tint text-[13px] font-semibold text-accent-text">{indice + 1}</span>
                {secao.titulo}
              </h2>
              {secao.paragrafos?.map((paragrafo, i) => <p key={i} className="mt-3">{paragrafo}</p>)}
              {secao.itens && (
                <ul className="mt-3 divide-y divide-edge">
                  {secao.itens.map((item, i, itens) => (
                    <li key={i} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent-text" />
                      <span><TextoDoItem texto={item} destacar={listaDeTermos(itens)} /></span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>
        <nav aria-labelledby="indice-do-guia" className="sticky top-0 hidden text-[13px] lg:block">
          <h2 id="indice-do-guia" className="font-medium text-body">{t("docsOnThisPage")}</h2>
          <ul className="mt-3 flex flex-col gap-2 border-l border-edge pl-3">
            {guia.secoes.map((secao, indice) => <li key={indice}><a href={`#${ancora(indice)}`} className={cn(linkClassName, "text-muted")}>{secao.titulo}</a></li>)}
          </ul>
        </nav>
      </div>
    </PageCard>
  );
}
