import { languageCode } from "@/core/i18n";
import type { LanguageCode } from "@/core/i18n/resources";

import { DESTAQUES, ORDEM_GUIAS, SLIDES, type ConteudoGuia, type SlugGuia } from "../model/guia";
import { en } from "./en";
import { ko } from "./ko";
import { ptBR } from "./pt-BR";

export type GuiaNoIdioma = ConteudoGuia & { slug: SlugGuia; traduzido: boolean };

const CONTEUDO: Record<LanguageCode, Partial<Record<SlugGuia, ConteudoGuia>>> = { en, "pt-BR": ptBR, ko };

const ehSlug = (slug: string): slug is SlugGuia => (ORDEM_GUIAS as readonly string[]).includes(slug);

/** O guia no idioma pedido; sem tradução, o texto em inglês com `traduzido: false`. */
export function guiaPorSlug(slug: string, idioma: string | undefined): GuiaNoIdioma | undefined {
  if (!ehSlug(slug)) return undefined;
  const traducao = CONTEUDO[languageCode(idioma)][slug];
  return { slug, ...(traducao ?? en[slug]), traduzido: Boolean(traducao) };
}

export const guiasNoIdioma = (idioma: string | undefined) => ORDEM_GUIAS.map((slug) => guiaPorSlug(slug, idioma)!);

export const destaquesDoPerfil = (perfilCodigo: string | null, idioma: string | undefined) =>
  (Object.hasOwn(DESTAQUES, perfilCodigo ?? "") ? DESTAQUES[perfilCodigo!] : []).map((slug) => guiaPorSlug(slug, idioma)!);

/** PDF dos slides no idioma pedido, ou o inglês como reserva; `null` quando o guia não tem slides. */
export function urlSlides(slug: SlugGuia, idioma: string | undefined): string | null {
  const pedido = languageCode(idioma);
  const disponivel = SLIDES[pedido].includes(slug) ? pedido : SLIDES.en.includes(slug) ? "en" : null;
  return disponivel && `/docs/${disponivel}/${slug}.pdf`;
}
