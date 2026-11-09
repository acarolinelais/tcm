import type { Locator, Page } from "@playwright/test";

/** Verificações visuais compartilhadas pelos e2e de identidade visual (specs 055 e 056). */

/** Sem transição, o estilo lido logo depois de tirar o foco já é o final. */
export const semTransicao = (page: Page) => page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; }" });

/**
 * O foco aparece: o contorno, a sombra ou a borda do elemento (ou de um dos três contêineres, onde os campos do HeroUI
 * desenham o anel) muda quando ele perde o foco. Só ter sombra não basta, porque os campos já a têm sempre.
 */
export async function temFocoVisivel(elemento: Locator) {
  return elemento.evaluate((el) => {
    const assinatura = () => {
      const estilos: string[] = [];
      for (let atual: Element | null = el, nivel = 0; atual && nivel < 4; atual = atual.parentElement, nivel++) {
        const e = getComputedStyle(atual);
        estilos.push([e.outlineStyle, e.outlineWidth, e.outlineColor, e.boxShadow, e.borderColor].join("|"));
      }
      return estilos.join("||");
    };
    const focado = assinatura();
    (el as HTMLElement).blur();
    const semFoco = assinatura();
    (el as HTMLElement).focus();
    return focado !== semFoco;
  });
}

/** Textos de bloco que passam da caixa que os contém. Os inline ficam de fora: a caixa deles é o próprio texto. */
export async function semTextoCortado(escopo: Locator) {
  await escopo.page().evaluate(() => document.fonts.ready);
  return escopo.evaluate((raiz) => [...raiz.querySelectorAll<HTMLElement>("h1, h2, p, label, button, a, span")]
    .filter((el) => el.children.length === 0 && el.textContent?.trim() && getComputedStyle(el).display !== "inline" && el.scrollWidth > el.clientWidth + 1)
    .map((el) => el.textContent!.trim()));
}
