---
name: ui-density
description: Revisa e reajusta a densidade/proporção de uma tela React já implementada (cards, ícones, tipografia, espaçamento) quando ela "parece grande demais" pra janela do navegador. Use depois de portar um design do Figma (ou qualquer canvas grande) pra um layout responsivo real, ou sempre que o usuário disser que algo "tá muito grande", "desproporcional" ou pedir uma revisão de UI/UX.
---

# Skill: ui-density

## Por que isso acontece

Designs do Figma (ou de qualquer ferramenta) são desenhados num canvas grande, com frames de
1500-2000px de largura e elementos posicionados em pixels absolutos. Quando os valores de `px` do
Figma (ícone de 92px, texto de 32px, `border-radius` de 60px, card com `padding` de 40px) são
copiados **literalmente** pro CSS de uma tela responsiva normal, o resultado fica desproporcional:
parece um mockup ampliado, não uma interface real de produto. O sintoma é sempre o mesmo: "os cards
tão grandes demais pra tela".

## Procedimento

1. **Rode a tela no navegador e tire um screenshot** (`claude-in-chrome` ou equivalente) na largura
   real que ela vai ser usada (não confie só no Figma). Compare mentalmente com um produto de
   densidade parecida (Linear, Notion, um dashboard admin comum) — se sobrar espaço vazio e os
   elementos individuais dominarem a tela, é sinal de baixa densidade.
2. **Audite cada classe de elemento contra uma régua de densidade de dashboard:**

   | Elemento | Fora da proporção (sintoma) | Alvo típico |
   |---|---|---|
   | Badge/ícone de stat card | > 64px de diâmetro | 36–44px, ícone interno 16–20px |
   | Número de KPI/estatística | `text-3xl`/`text-4xl` em todo card | `text-xl`/`text-2xl`, reserve `3xl`+ pro **único** número-herói da tela |
   | Título de card | `text-xl`+ | `text-sm font-semibold` a `text-base` |
   | `border-radius` de card | valor arbitrário grande (`rounded-[60px]`) copiado do Figma | token da escala (`rounded-xl`/`2xl`/`3xl`, ~16–24px) |
   | Padding de card | `p-8`/`p-10`+ | `p-4`–`p-6` |
   | Gap entre cards/seções | `gap-8`+ | `gap-3`–`gap-4` |
   | Largura fixa de sidebar | `300px`+ | `220–260px` |
   | Gráfico (SVG com tamanho fixo em px) | dimensão herdada direto do Figma | recalcule proporcional ao card real (ver passo 4) |

3. **Aplique os ajustes de uma vez, por componente**, trocando valores arbitrários (`[Npx]`) pelos
   tokens de escala do Tailwind/design system sempre que possível — tokens dão consistência e são
   mais fáceis de reajustar depois que números mágicos espalhados.
4. **Gráficos:** se o tamanho (ex.: diâmetro de um donut, `viewBox` de um SVG) foi herdado do Figma,
   recalcule proporcional ao novo tamanho do card, não só o container ao redor dele. Depois de
   encolher, confira se texto/legendas não quebram linha de forma estranha (`flex-wrap` apertado).
5. **Rode o lint, o build e a suíte de testes** do frontend (`npm run lint && npm run build && npm test`)
   — classes Tailwind trocadas não devem quebrar nada funcionalmente.
6. **Tire um novo screenshot** e compare lado a lado com o anterior antes de reportar. Se ainda
   sobrar espaço vazio desproporcional, repita o passo 2 numa escala ainda menor — é mais comum
   precisar encolher demais do que de menos numa primeira passada de um port direto de Figma.

## Regra geral
Em telas de dashboard/produto (não uma landing page ou hero section), a tipografia grande e os
`border-radius` extremos devem ser reservados pro **elemento mais importante da tela** (um número
só, um título de página). Tudo que se repete em grade (cards, ícones, linhas de tabela) deve ser
compacto — é isso que faz a tela parecer "de produto" em vez de "mockup".
