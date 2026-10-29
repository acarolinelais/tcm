# 0041. Cores somente por tokens semânticos

- **Status:** Aceito
- **Data:** 2026-10-29
- **Contexto:** Spec 034 — Tema claro e escuro
- **Relacionado:** ADR 0037 (HeroUI), ADR 0040 (tema)

## Contexto
Cerca de 50 arquivos do frontend usam cores fixas: hex vindo do Figma (`text-[#454442]`, `bg-[#8880F7]`,
tokens do HeroUI sobrescritos com hex em `style`), paleta crua do Tailwind (`bg-white`, `text-slate-700`,
`bg-blue-50`) e hex em SVG. Com o tema escuro (ADR 0040), cada cor fixa vira um pedaço da tela preso ao
visual claro. Sem uma regra, o problema volta a cada tela portada do Figma.

## Decisão
- Toda cor no código de `src/` vem de um token com valor nos dois temas: primeiro os do HeroUI (`background`,
  `foreground`, `surface`, `surface-secondary`, `overlay`, `muted`, `border`, `separator`, `accent`,
  `success`, `warning`, `danger` e as variações `-soft`/`-foreground`), depois os do projeto, definidos em
  `core/global.css` (`:root` e `.dark`) e expostos pelo `@theme inline`.
- Um token novo do projeto tem nome de **papel**, não de cor: `--text-body`, `--avatar`, `--status-review`,
  `--chart-1`. Nunca `--roxo`.
- Ficam proibidos em `src/` (exceto testes): hex em classes (`[#...]`), classes da paleta crua do Tailwind
  (`white`, `black`, `slate`, `gray`, `red`, `blue`, `amber`...) e hex ou `rgb()` em `style` e em SVG inline.
- A regra é verificada por um teste do Vitest que varre `src/` e falha apontando arquivo e trecho.
  ```tsx
  // errado
  <span className="text-[#454442]">   <Chip className="bg-amber-50 text-amber-800" />
  // certo
  <span className="text-body">        <Chip className="bg-status-review-soft text-status-review-foreground" />
  ```
- Ilustrações e logos em SVG usados como `<img>` ficam fora da varredura; quando não funcionarem no escuro,
  passam a usar `currentColor` ou ganham versão escura.

## Alternativas consideradas
- **Variante `dark:` em cada cor fixa (`text-[#454442] dark:text-[#ddd]`):** funciona sem mexer nos tokens,
  mas espalha a paleta por todos os arquivos e cada tela nova precisa lembrar das duas cores.
- **Só revisão de código, sem teste:** barato, mas as cores fixas entraram justamente sem ninguém notar.
- **Regra de ESLint customizada:** daria o aviso no editor, mas exige escrever e manter um plugin; o teste
  cobre o mesmo com poucas linhas.

## Consequências
- ✅ O tema escuro cobre a interface inteira e continua cobrindo as telas novas.
- ✅ Mudar uma cor da marca ou de um status é mudar um token.
- ⚠️ Portar do Figma exige mapear cada hex para um token, ou criar um token novo.
- ⚠️ O teste de varredura usa expressões regulares e pode precisar de exceções pontuais.
