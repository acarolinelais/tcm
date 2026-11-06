# 0051. Recharts para os gráficos do frontend

- **Status:** Aceito
- **Data:** 2026-11-05
- **Contexto:** Spec 063 — Overview com gráficos por perfil
- **Relacionado:** ADR 0037 (HeroUI), ADR 0041 (cores por tokens)

## Contexto
A Overview tem hoje 2 gráficos em SVG escrito à mão (`TeamPerformanceChart` e `TotalTcsDonePieChart`). A spec
063 leva a página para cerca de 10 gráficos de 6 tipos: linha (burndown), barras horizontais e verticais,
lollipop, histograma e donut, todos com eixos, tooltip e tamanho que acompanha a tela. A referência visual é o
shadcn.io, um site da comunidade sem ligação com o shadcn/ui. Lá, os gráficos são instalados pelo CLI do shadcn
com login e trazem um `ChartContainer` e um `Card` próprios, o que o ADR 0037 não permite. O Lollipop e o Count
Buckets Histogram são blocos pagos (Pro), e não existe um Burndown.

## Decisão
- Use o **Recharts** (`recharts`) para todo gráfico novo do frontend. Os 2 gráficos atuais da Overview passam
  para o Recharts na spec que redesenhar a página.
- Escreva os gráficos no módulo que os usa (`modules/<dominio>/components/`). Não use o CLI do shadcn nem o
  `ChartContainer`/`ChartConfig` dele. Uma peça usada por dois módulos ou mais vai para `shared/ui`.
- O cartão, os seletores e os botões em volta do gráfico vêm do HeroUI (ADR 0037).
- Cores só por token (ADR 0041). Use `var(--chart-N)` nos `fill` e `stroke`. A paleta vai de `--chart-1` a
  `--chart-5`: crie `--chart-4` e `--chart-5` no `core/global.css`, nos dois temas.
  ```tsx
  // errado
  <Bar dataKey="feitos" fill="#5588f5" />
  // certo
  <Bar dataKey="feitos" fill="var(--chart-1)" />
  ```
- Carregue o Recharts só nas páginas que têm gráfico, com `React.lazy` no componente que o importa, para não
  pesar o carregamento das outras telas.
- Todo gráfico liga o `accessibilityLayer` e tem um título e um resumo em texto do que mostra, para quem usa
  leitor de tela.
- O shadcn.io serve só de referência visual (proporções, cartão, tooltip). Não copie código dele.

## Alternativas consideradas
- **TanStack Charts (`@tanstack/charts`), a base atual do shadcn.io:** é a mais nova das opções, com pouco uso
  em produção. Os blocos pagos (Lollipop e Histograma) não existem nela, então seriam escritos do mesmo jeito.
- **Continuar com SVG à mão:** serve para 2 gráficos, não para 10. Eixos, escalas, tooltip acessível pelo
  teclado e redimensionamento seriam código próprio a manter em cada tipo.
- **Instalar pelo CLI do shadcn (`npx shadcn add`):** traz `ChartContainer` e `Card` do shadcn para
  `shared/ui`, o que o ADR 0037 proíbe. Também exige login, e parte dos blocos é paga.

## Consequências
- ✅ Um só jeito de fazer gráfico, com tipos prontos para todos os casos da spec 063 (o lollipop é uma barra
  fina com um ponto na ponta, e o histograma é um `BarChart`).
- ✅ Tooltip e navegação pelo teclado vêm prontos (`accessibilityLayer`), e as cores seguem o tema pelos tokens.
- ⚠️ Uma dependência nova, de cerca de 100 KB gzip. O `React.lazy` limita esse custo às páginas com gráfico.
- ⚠️ O Recharts mede o contêiner no navegador. No jsdom dos testes ele desenha vazio, então os testes de
  unidade verificam o resumo em texto e os dados, e o desenho fica para o e2e.
