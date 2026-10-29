# 033. Tema claro e escuro: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0009, 0010, 0025 (padrão do seletor de idioma), 0037 (HeroUI)
- **ADRs novos propostos:** [0039](../../adr/0039-tema-claro-escuro-no-navegador.md) (mecanismo do tema),
  [0040](../../adr/0040-cores-somente-por-tokens-semanticos.md) (cores só por tokens)

## Abordagem
O HeroUI v3 já tem tema escuro, ativado pela classe `dark` no `<html>` (ADR 0039). O trabalho é: dar valor
escuro aos tokens que o `global.css` sobrescreve em `:root` (os compartilhados com o shadcn e os só do shadcn),
tirar o fallback de `prefers-color-scheme` da variante `dark:`, aplicar a classe guardada em `localStorage`
(`sdf.theme`) por um script inline no `index.html` e oferecer um `ThemeToggle` (em `core/theme/`) ao lado do
`LanguageSelector`, no navbar e no login. O grosso é trocar as cores fixas de ~50 arquivos por tokens
(ADR 0040), com um teste de varredura que impede a volta delas. O Toast do HeroUI já segue os tokens. Sem
mudanças no backend.

## Modelo de dados
Sem entidades. Estado só no navegador:

| Onde | Chave | Valores | Regras |
|---|---|---|---|
| `localStorage` | `sdf.theme` | `light` \| `dark` | Ausente ou inválido = `light`. Falha de acesso é ignorada (o tema vale só na sessão). |

## Contrato da API
Nenhum.

## Backend: arquivos
Nenhum.

## Frontend: arquivos

**Tokens e mecanismo (`core`)**
- `frontend/index.html`: script inline no `<head>` (ADR 0039).
- `frontend/src/core/global.css`:
  - `@custom-variant dark (&:where(.dark, .dark *));` depois do import das variantes do HeroUI.
  - Bloco `.dark` (fora de camada) com os valores escuros de `--background`, `--foreground`, `--border`,
    `--muted`, `--accent` e dos tokens do shadcn (`--card`, `--primary`, `--secondary`, `--muted-foreground`,
    `--input`, `--destructive`, `--ring`). Os escuros partem dos valores do tema escuro do HeroUI.
  - Tokens do projeto nos dois temas, para os hex do Figma e as paletas que o HeroUI não cobre (lista final):
    `--page` (#FBFBFB), `--body` (#454442), `--subtle`, `--panel` (#F3F5F7), `--table-row-divider`,
    `--accent-tint` (#EAF1FF), `--avatar`, `--strong-foreground`, `--chart-1..3`, e os tons de etiqueta
    (`--etiqueta-*`, `--projeto-*`, `--status-*`, cada um com `-bg` e `-fg`). As classes saem como `text-body`,
    `bg-page`, `bg-status-review-bg` etc.; os tons de etiqueta chegam ao `TagChip` por `var()`
    (`shared/lib/tom-etiqueta.ts`).
  - `.thin-scroll`, `.dropzone-tracejada` (o SVG em data URI vira `mask` + `background-color`) e o overlay de
    transparência reduzida passam a usar tokens.
- `frontend/src/core/theme/use-theme.ts`: `THEME_KEY` e o hook `useTheme` (`useSyncExternalStore` sobre a classe
  do `<html>`; `alternar` aplica, grava com `try/catch` e avisa os toggles). A leitura do valor guardado fica só no
  script inline.
- `frontend/src/core/theme/ThemeToggle.tsx`: botão com ícone `Sun`/`Moon` (lucide), `aria-pressed` e nome
  traduzido.
- `frontend/src/core/i18n/resources.ts`: chave `darkTheme` em `en`, `pt-BR` e `ko`.
- `frontend/src/core/layout/Navbar.tsx` e `frontend/src/core/auth/LoginPage.tsx`: incluem o `ThemeToggle`
  e trocam as cores fixas por tokens.

**Troca de cores fixas por tokens (ADR 0040)**, por área (contagem de ocorrências entre parênteses):
- Layout: `core/layout/Sidebar.tsx` (20), `AppLayout.tsx`, `EmBreve.tsx`.
- `shared/ui`: `data-table.tsx` (10, inclui tokens do HeroUI sobrescritos com hex em `style`),
  `data-table-pagination.tsx` (10), `data-table-filter.tsx`, `data-table-state.tsx`, `week-picker-hero.tsx`,
  `page-tabs.tsx`, `page-card.tsx`, `tag-chip.tsx`, `row-action-button.tsx`, `inline-select.tsx`,
  `form-field.tsx`, `dialog.tsx`, `side-drawer.tsx`, `skeleton.tsx`, `retry-alert.tsx`,
  `multi-select-combobox.tsx`, `alert-confirm.tsx`.
- Status de projetos: `components/status/status-badge-estilos.ts` (21), `status-chip-estilos.ts` (12),
  `status-projeto-estilos.ts` (10), `StatusBadge.tsx`.
- Importação: `components/importacao/UploadPlanilha.tsx` (20), `icones-importacao.tsx`, `PreviaPlanilha.tsx`.
- Demais de projetos: `pages/ProjetosPage.tsx`, `ProjetoDetalhePage.tsx`, `ResultadosGeraisPage.tsx`,
  `ProjetosEntradaPage.tsx`, `components/ProjetosDevEmptyState.tsx`, `ProjetoSwitcher.tsx`,
  `form-factor/*`, `resultados-gerais/*`, `casos-teste/*`.
- Overview: `TeamPerformanceChart.tsx`, `TotalTcsDonePieChart.tsx`, `StatCard.tsx`.
- Demais módulos: `times/pages/TimesPage.tsx`, `TimeDetalhePage.tsx`, `perfis/pages/PerfisPage.tsx`,
  `configuracoes/pages/ConfiguracoesPage.tsx`, `setores/components/EditarSetorDrawer.tsx`.

**Testes novos**
- `frontend/src/core/theme/index-html.test.ts`, `ThemeToggle.test.tsx`.
- `frontend/src/core/theme/cores-por-token.test.ts`: varre `src/` atrás de cores fixas (ADR 0040).
- `frontend/e2e/tema.spec.ts`, com `@axe-core/playwright` (dependência nova de desenvolvimento) para o
  contraste AA nos dois temas.

**Skill:** `.claude/skills/react-crud/SKILL.md` ganha a regra "cores só por tokens" (ADR 0040).

## Critérios de aceite → testes
| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade + e2e | `index-html.test.ts`: sem valor → claro; `tema.spec.ts`: navegador com `colorScheme: "dark"` abre sem `dark` no `<html>` e com o fundo claro |
| CA-02 | Componente + e2e | `ThemeToggle.test.tsx`: claro → escuro; `tema.spec.ts`: digita na busca do navbar, alterna, o texto continua e a página não recarrega |
| CA-03 | Componente | `ThemeToggle.test.tsx`: escuro → claro |
| CA-04 | e2e | `tema.spec.ts`: alterna no login, autentica e o `<html>` continua com `dark` |
| CA-05 | Unidade + e2e | `index-html.test.ts`: o script do `index.html` aplica `dark` no jsdom; `tema.spec.ts`: com `sdf.theme=dark` e o `main.tsx` bloqueado por `page.route`, o `<html>` já tem `dark` |
| CA-06 | Unidade + e2e | `cores-por-token.test.ts`: `src/` sem cor fixa (sucesso) e um trecho de exemplo detectado (falha); `tema.spec.ts`: rotas principais no escuro sem nenhum elemento visível com fundo branco |
| CA-07 | e2e | `tema.spec.ts`: axe (`color-contrast`) sem violações no login e nas rotas principais, nos dois temas; foco do toggle com anel visível |
| CA-08 | Componente | `ThemeToggle.test.tsx`: nome em cada idioma, `aria-pressed` reflete o tema, aciona com `Enter` e `Espaço` |
| CA-09 (falha) | Unidade + e2e | `index-html.test.ts`: valor inválido → claro; `tema.spec.ts`: `sdf.theme="roxo"` abre claro e o toggle funciona |
| CA-10 (falha) | Unidade | `index-html.test.ts` (leitura bloqueada) e `ThemeToggle.test.tsx` (gravação bloqueada): sem exceção, tema aplicado na sessão |
| CA-11 | e2e | `tema.spec.ts`: alterna o tema, abre uma rota protegida, e a sessão e o idioma continuam os mesmos |

## Desvios na implementação
- `theme.ts` e `use-theme.ts` viraram um arquivo só (achado da simplify); o teste de leitura ficou no
  `index-html.test.ts`, que executa o script real.
- **Contraste AA (CA-07) mudou cores do Figma no claro:** o axe reprovou o `#7E7E7E` de apoio, o `#3672F2` com
  texto branco, o azul do shadcn (`219 92% 58%`), o `--muted` sobre a moldura das tabelas e 9 dos 13 pares de
  etiqueta. Os valores foram escurecidos o mínimo para 4,5:1; o hex original fica no comentário do token.
- O pill de status do Test Case manteve os tons do Tailwind que a tela já usava (ícone, texto e fundo), agora como
  tokens `--status-*`.
- **Code-review:** as abas abertas acompanham a troca feita em outra (evento `storage`); as transições pausam por um
  quadro na troca; no escuro, o círculo do status usa o tom claro com o glifo escuro (`--status-*-icon`,
  `--status-glyph`), para não sumir no fundo; os blocos escuros usam `:root.dark`; `tomDoToken` só aceita nomes
  de tom existentes; a varredura também pega `hsl()`/`oklch()` e cores nomeadas.
- **Paleta escura clareada após revisão visual:** o fundo quase preto do tema escuro do HeroUI (L≈14–16%) ficou
  pesado; o escuro passou a um cinza grafite neutro (fundo da página L 29,5%, cartões um passo abaixo em 25%, moldura das tabelas e campos em 22,5%, bordas 33–36%) e o texto
  principal a L 93%, sobrescrevendo os tokens de superfície do HeroUI em `:root.dark`.
- **Revisão de design do escuro** (skills `better-colors`, `impeccable`, `better-ui`): a página é o cinza mais claro e os
  cartões ficam um passo abaixo (escolha do usuário); os neutros levam uma pitada do azul da marca (croma 0,007,
  matiz 264); menus e popovers passam a `bg-overlay` + `shadow-overlay`, mais claros que a página, para lerem como
  flutuantes; o acento perde saturação no escuro; texto com `antialiased`; ilustrações a 85% de brilho; os ícones
  de idioma e do olho da senha viraram SVG inline com `currentColor` (antes eram `<img>` com cor fixa e sumiam).
- **Paleta escura refeita como rampa** (processo da skill `better-colors`): neutro de 12 passos por papel no matiz da
  marca (262) com croma que cresce no meio da rampa; acento com preenchimento (passo 9, texto branco) separado do texto
  de acento (passo 11, token novo `--accent-text`/`text-accent-text`, que substitui `text-accent` e `text-primary`
  usados como texto); etiquetas e status com o mesmo L por passo em todos os matizes (fundo 31%, texto 82%) via sintaxe
  de cor relativa (`oklch(from var(--x) …)`). Todos os pares medidos no script e no axe (≥ 4,5:1).
- **Paleta escura final segue a HIG Dark Mode da Apple** (pedido do usuário, skill `apple-design`): cinzas neutros do
  sistema no modelo do macOS Dark Aqua (janela `#323232`, conteúdo `#1E1E1E`, elevado `#3A3A3C`, separador `#38383A`),
  rótulos em branco a 85%/55%, link `#409CFF` clareado para 4,6:1 sobre menus, etiquetas e status com as cores de
  sistema (texto na variante de contraste aumentado, fundo a 18%) e um bloco `prefers-contrast: more` (Increase
  Contrast). A rampa tingida anterior foi substituída. A HIG desaconselha seletor de aparência próprio do app; a spec
  manteve o toggle (ADR 0039) por decisão do usuário.
- O e2e faz login só com o administrador existente (pela tela, no teste do login; pela API, nos demais), sem criar
  dados.

## Riscos e decisões pendentes
- **Tom dos hex do Figma no claro:** os tokens do projeto guardam o valor exato do Figma no claro; só o escuro
  é novo. Onde um hex é praticamente igual a um token do HeroUI, usa-se o do HeroUI.
- **Ilustrações em `<img>`** (`login.svg`, `undraw_*.svg`, logos): não seguem o tema. Avaliar no escuro; se não
  funcionarem, usar `currentColor` ou uma versão escura. Ficam fora da varredura do ADR 0040.
- **Telas ainda em shadcn (ADR 0037):** usam os tokens em tripla HSL; ganham o valor escuro no bloco `.dark`.
- **e2e dependem da API real** (`frontend/e2e/api-fixtures.ts`): rodam com o backend no ar.
- **Testes existentes** que procuram classes de cor quebram e são ajustados na task do arquivo que testam.
- ADRs 0039 e 0040 estão `Proposto`; a implementação só começa depois de aceitos.
