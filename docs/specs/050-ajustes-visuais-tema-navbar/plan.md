# 050. Ajustes visuais: tema escuro, Navbar, calendário e Sidebar: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0009, 0010, 0030, 0037, 0040, 0041
- **ADRs novos propostos:** nenhum. O calendário segue no `react-day-picker` (opção b, abaixo): nenhuma dependência
  entra ou sai por causa dele. Saem só as dependências do shadcn, como o ADR 0037 já previa.
- **Skills de apoio:** `react-crud`, `better-colors` (tokens e contraste), `better-accessibility`, `better-layout`
  (bug da Navbar), `better-writing` (textos do item 4), `ui-density` (Navbar), `apple-design` (RN-14, RN-15)

## Abordagem

Só frontend, uma fase por item da spec (1 → 6). A fase 2 vem antes das outras visuais porque elas usam os tokens
novos. As cores mudam nos tokens de `core/global.css` (ADR 0041), então as telas não recebem hex. Os componentes
compartilhados levam o desenho novo a todos os consumidores. Duas descobertas mudam o escopo pedido:

- **O `calendar.tsx` do shadcn não é o filtro de data das tabelas.** O único consumidor dele é o
  `shared/ui/table-column-filter.tsx`, que não tem consumidor (só o próprio teste). O filtro de data das tabelas é
  o `DataTableFilter type="date"` (Projetos e Test Cases), que já usa o `Calendar` do HeroUI. O
  `table-column-filter`, o teste dele e o `calendar.tsx` são código morto e saem na fase 4.
- **A borda atual dos cartões e botões é o token `--separator`**, que também faz as divisórias das tabelas e
  painéis. Trocar o `--separator` mudaria o tema claro além do que a RN-04 permite, então a borda ganha um token
  próprio.

## Tokens (fase 2)

Origem: Figma `2482-1902` (escuro), salvo indicação. Contraste medido com a fórmula do WCAG.

| Token | Tema | Antes | Depois | Origem | Uso |
|---|---|---|---|---|---|
| `--background` (e `--page`, que aponta para ele) | escuro | `#323232` | `#0a0a0a` | fundo do quadro | atrás de tudo |
| `--surface` | escuro | `#1e1e1e` | `#1b1b1b` | Sidebar, cartão, busca (`2482-1903`, `1952`, `1934`) | painéis |
| `--card` (HSL do shadcn, enquanto existir) | escuro | `0 0% 11.8%` | `0 0% 10.6%` | o mesmo do `--surface` | |
| `--panel` | escuro | `#1a1a1a` | `#232325` | moldura da tabela (`2482-2013`) | moldura e cabeçalho |
| `--table-body` (**novo**) | claro / escuro | — | `var(--surface)` / `#161616` | corpo da tabela (`2482-2014`) | corpo branco da `DataTable` |
| `--edge` (**novo**) | claro / escuro | — | `#eeeeee` / `#2f2f2f` | decisão de 2026-10-30 (RN-04) | borda de cartões, botões em pílula, busca e botão de tema |
| `--accent-text` (e `--accent-soft-foreground`) | escuro | `#5baaff` | `#5b8fff` | aba ativa (`2482-2138`) | texto e ícone de acento |
| `--accent-tint` | escuro | `color-mix(#0a84ff 18%)` | `#0d2144` | item ativo da Sidebar (`2482-2227`) | seleção |
| `--etiqueta-todo-bg` / `-fg` | escuro | `#1a3046` / `#409cff` | `#102344` / `#9bc4ff` | To-Do (`2482-2124`) | Status do Test Case |
| `--etiqueta-neutro-bg` / `-fg` | escuro | `#323233` / `#aeaeb2` | `#27272a` / `#9f9fa9` | New (`2482-2109`) | TC Situation e neutros |
| `--font-sans` (**novo** em `@theme`) | ambos | — | `"Inter Variable", system-ui, …` | RN-06 | fonte do Tailwind e do HeroUI |

Ficam como estão (RN-03 e RN-05): `--foreground`/`--body` (branco a 85%), `--muted`/`--subtle` (55%), os demais
tons de etiqueta, `--overlay`, `--separator`, `--border`, sucesso/aviso/erro, gráficos e todo o tema claro, exceto
`--edge` e `--table-body` (que no claro reproduz o valor de hoje).

Contraste no escuro, depois da troca (mínimo 4,5:1):

| Par | Contraste |
|---|---|
| texto 85% sobre página / cartão / moldura / corpo | 14,2 / 12,7 / 11,7 / 13,2 |
| texto 55% sobre os mesmos | 6,3 / 6,0 / 5,7 / 6,1 |
| acento `#5b8fff` sobre cartão / moldura / corpo | 5,6 / 5,1 / 5,9 |
| To-Do `#9bc4ff` sobre `#102344` | 8,7 |
| New `#9f9fa9` sobre `#27272a` | 5,7 |
| item ativo da Sidebar `#5b8fff` sobre `#0d2144` | 5,2 |

A borda `--edge` é decorativa (1,3:1 a 1,5:1 no escuro e 1,1:1 a 1,2:1 no claro): todo controle com borda também
tem texto ou ícone que o identifica. Com `prefers-contrast: more`, `--edge` passa a valer `--border` (apple-design:
borda definida com contraste aumentado).

**Testes de cor:** o `cores-por-token.test.ts` não muda (ele procura hex fora dos tokens, e nenhuma tela ganha
hex). Entra o `contraste-tema-escuro.test.ts`, que lê o `global.css` como o `contraste-avatar.test.ts` e confere os
pares da tabela acima. O `contraste-avatar.test.ts` tem os fundos escuros fixos (`#1e1e1e`, `#323232`) e passa a
usar `#1b1b1b` e `#0a0a0a`.

## Item a item

**1. Painel do caso (RN-01).** `HistoricoProjetoTabela` mostra o TC ID como texto e perde a prop
`onAbrirDetalhes`. A `ResultadosGeraisPage` perde o `DetalhesCasoTesteDrawer` e o estado `casoDetalhado`. O
`ResumoExecucoesDrawer` fica. A spec 030 recebe uma nota de que a RN do painel em todas as tabelas não vale mais
para General Results.

**2. Cores e fonte (RN-02 a RN-06).** A tabela de tokens acima. A `DataTable` troca `bg-surface` do corpo por
`bg-table-body`. `PageCard`, `WeekPickerHero`, busca e botão de tema trocam `border-separator` por `border-edge`.
O `--font-sans` entra no `@theme` para as classes do Tailwind e os componentes do HeroUI herdarem Inter, e o `body`
passa a usá-lo.

**3. Navbar (RN-07 a RN-10).**
- **Bug da sobreposição:** o `<header>` vira
  `grid-cols-[minmax(0,1fr)_minmax(0,22.625rem)_minmax(max-content,1fr)]`. A coluna da direita nunca fica menor
  que o conteúdo (tema, idioma e usuário). A busca (`minmax(0, 362px)`) é a única que encolhe. Com folga, as duas
  colunas laterais são iguais e a busca fica centralizada. Sem `z-index`, margem fixa ou `overflow-hidden`.
- **Busca:** 362 px × 29 px, `bg-surface`, `border-edge`, raio pleno, texto de exemplo em `text-muted`.
- **Divisórias:** traço de 1 px × 21 px em `bg-edge` entre tema e idioma e entre idioma e usuário, com 15 px de
  cada lado (`2482-2365` e `2366`).
- **`ThemeToggle`:** círculo de 29 px, `bg-surface`, `border-edge`, ícone do tema em uso. O comportamento da spec
  034 fica: `aria-pressed`, a escolha no navegador e o claro como padrão. **Login:** herda o mesmo visual, sem
  variante. O login fica sobre `--page` como a Navbar, então o círculo com borda funciona nos dois lugares, e um
  componente com uma aparência só não diverge.
- **Transição de tema (RN-08):** já existe, da spec 049: o `use-theme` põe a classe `.trocando-tema` no `<html>`
  durante 450 ms, e o `ThemeToggle` remonta o ícone com `key={tema}` e a classe `tema-icone-entrar`. O botão novo
  mantém a `key`, a classe e o estado `trocou`, e o `use-theme` não muda. Durante os 450 ms, a `.trocando-tema`
  troca as transições de todos os elementos pelas de cor, então o toque da RN-14 não anima nesse intervalo, o
  que é o esperado.
- **Densidade:** revisão com a skill `ui-density` depois da troca, porque a barra fica mais baixa (29 px, antes
  32 a 37 px).

**4. Fim do shadcn (RN-11, RN-12).** Confirmação no início da fase com o grep da spec. Hoje ele acha:

| Arquivo shadcn | Consumidores | Troca |
|---|---|---|
| `dialog.tsx` | editor de permissões (`PerfisPage`), `confirm-dialog.tsx` | `Modal` do HeroUI |
| `confirm-dialog.tsx` | `UsuarioToggleAtivo` | `shared/ui/alert-confirm.tsx` |
| `button.tsx`, `input.tsx`, `label.tsx` | `LoginPage`, `AlterarSenhaPage`, `PerfisPage`, `UsuarioToggleAtivo` | `Button` do HeroUI e os campos de `form-field.tsx` |
| `badge.tsx` (cva) | `StatusBadge` (`StatusPill`) | `Chip` do HeroUI com as classes de `status-badge-estilos` |
| `skeleton.tsx` | `AppLayout`, `OverviewPage`, `PerfisPage` | `Skeleton` do HeroUI. O `PageSkeleton` vai para `shared/ui/page-skeleton.tsx`, mantendo `role="status"` e o texto `sr-only` de carregamento |
| `calendar.tsx`, `table-column-filter.tsx` (+ teste) | nenhum | apagados |

A confirmação de inativar setor ganha `deactivateSectorTitle`, `deactivateSectorDescription` e
`deactivateSectorConfirm`, com `{{name}}`, em en, pt e ko. No fim saem `@radix-ui/react-dialog`,
`@radix-ui/react-label`, `@radix-ui/react-slot` e `class-variance-authority`, e o grep volta vazio. O Backlog da
031 marca os itens resolvidos.

**5. Botões e calendário (RN-13 a RN-18).**

*Escolha da base do calendário:*

| | (a) Grade própria em React Aria | (b) `react-day-picker` restilizado (**escolhida**) |
|---|---|---|
| Coluna de semana | código nosso: a grade do React Aria não tem a coluna, então ela entra como botões fora do padrão de grade (setas não chegam neles) | nativa (`showWeekNumber` + `ISOWeek`), já usada e testada |
| Teclado e leitor de tela | os hooks cobrem os dias, mas a coluna extra exige foco e rótulos próprios | prontos e cobertos pelos testes de hoje |
| Localização en/pt/ko | `@internationalized/date` | `react-day-picker/locale`, já em uso |
| Dependências | sai o `react-day-picker`, e o ADR pede justificar a troca | nenhuma mudança |
| Manutenção | grade, foco e acessibilidade nossos | só estilo |

A (b) entrega as RN-16 e RN-17 sem código de acessibilidade novo, num item que é visual. O custo é manter uma
segunda biblioteca de calendário além do HeroUI. Para a RN-18 (o mesmo calendário no filtro de data), o
`DataTableFilter type="date"` troca o `Calendar` do HeroUI pela mesma grade.

- **Componente:** `shared/ui/calendario.tsx` (novo) envolve o `DayPicker` com os tokens, o locale do i18n e
  `modo: "dia" | "semana" | "dia-ou-semana"`. A coluna de semanas aparece nos modos com semana. O
  `WeekPickerHero` e o `DataTableFilter` passam a usá-lo.
- **Prova antes da troca (task própria):** um teste do `react-day-picker` como está, que mostra a coluna de
  semanas, a escolha pelo número, a escolha do dia, 29/12/2025 → `2026-W01` e as setas do teclado. Só depois os
  consumidores mudam.
- **Gatilhos (RN-13):** pílula `h-9`, raio pleno, `bg-surface`, `border-edge`, Inter 500 15 px em `text-body`, com
  o ícone de calendário e a seta. Botão de busca: círculo `size-9` só com o ícone. Consumidores: o `WeekPickerHero`
  em `ProjetoDetalhePage` e `ResultadosGeraisPage`, e a lupa de `ResultadosGeraisPage`. A busca da Navbar segue o
  desenho próprio da barra. "Day or week" vira "Day or Week" em en.
- **Resposta ao toque (RN-14):** `data-[pressed]:scale-[0.97]` com `transition-transform duration-100 ease-out` e
  `motion-reduce:transform-none` nas pílulas, no botão de tema e nos itens da Sidebar.
- **Origem do calendário (RN-15):** o `Popover` do HeroUI já posiciona pelo gatilho. A animação de entrada e de
  saída usa `transform-origin` no lado do gatilho, e com `prefers-reduced-motion` fica só a opacidade. A fase
  confere isso no componente e completa onde faltar.

**6. Sidebar (RN-19).** Uma função `classesDoItem({ ativo, recolhida, nivel })` em `Sidebar.tsx` concentra as
classes de todos os itens: `rounded-full`, hover `bg-secondary`, ativo `bg-accent-tint text-accent-soft-foreground`,
anel `focus-visible` (que já segue o raio) e o toque da RN-14. Recolhida, o item vira um círculo de 30 px
(`2482-2227`) centralizado no ícone. Os subitens de Administração mantêm o recuo.

## Execução (2026-10-30)

O que mudou em relação ao plano durante a implementação:

- **Perfis:** o `Dialog` do shadcn em `PerfisPage` não era o editor de permissões (o editor é a própria página),
  e sim a confirmação de alterações não salvas. Ela foi para o `Modal` do HeroUI e não fecha durante a gravação.
- **`tw-animate-css` fica.** Saiu na simplify da fase 4 e quebrou o CSS: os estilos do HeroUI importados no
  `global.css` usam as classes dele via `@apply` (`fade-in-0`). Voltou para `dependencies`. As regras
  `.dialog-overlay`/`.dialog-content`, que só serviam ao `dialog.tsx` apagado, saíram.
- **Fonte:** o HeroUI declara a própria `--font-sans` (fonte do sistema). O `:root` sem camada passa a declarar a
  Inter em `--font-sans` e em `--default-font-family`, e o `body` usa a variável.
- **Corpo da tabela:** as células do HeroUI pintam `bg-surface`. Por isso a `DataTable` mapeia `--surface` para
  `--table-body` no estilo da moldura, o mesmo caminho do `--surface-secondary` (achado do code-review).
- **Navbar abaixo de `md`:** o grupo da direita continua na coluna do meio (`md:col-start-3`). Levá-lo à coluna 3 em
  qualquer largura fazia a tela de 390 px passar da borda (`e2e/perfis.spec.ts`).
- **Skeleton:** o brilho do `Skeleton` do HeroUI não respeita o movimento reduzido. Uma regra global no
  `global.css` o deixa parado, como o esqueleto antigo.
- **`AlertConfirm`:** a descrição virou a descrição acessível da janela (`aria-describedby`), como era no
  `confirm-dialog` do shadcn. Vale para todas as confirmações que usam o componente.
- **Calendário no modo dia:** o dia escolhido é a seleção do `DayPicker` (`aria-selected` e foco inicial nele),
  como no `Calendar` do HeroUI que o filtro de data usava.
- **Contraste aumentado:** a regra de `--edge` entrou no bloco `prefers-contrast: more` que já existia, com
  `#8e8e93` no claro (3,3:1 sobre branco) e `--border` no escuro.
- **Login:** o campo de senha do HeroUI não ocupava a largura do cartão (faltava `w-full`). O tema e o idioma eram
  `absolute` e cobriam o canto do cartão em janelas baixas; agora são uma linha no fluxo da página, acima dele
  (e2e em `navbar.spec.ts`).
- **Campos:** pedido da revisão visual. `--field-radius: 9999px` deixa todo campo de uma linha em pílula, como os
  botões; o textarea fica com `rounded-2xl`. A sombra dos campos caiu para uma camada leve (`--field-shadow`) no
  claro e continua sem sombra no escuro.

## Frontend: arquivos

- Fase 1: `modules/projetos/components/resultados-gerais/HistoricoProjetoTabela.tsx` (+ teste),
  `modules/projetos/pages/ResultadosGeraisPage.tsx` (+ teste), `docs/specs/030-links-pr-test-case/spec.md` (nota).
- Fase 2: `core/global.css`, `shared/ui/data-table.tsx`, `shared/ui/page-card.tsx`,
  `core/theme/contraste-tema-escuro.test.ts` (novo), `core/theme/contraste-avatar.test.ts`.
- Fase 3: `core/layout/Navbar.tsx` (+ teste), `core/theme/ThemeToggle.tsx` (+ teste), `e2e/navbar.spec.ts` (novo)
  e `e2e/tema.spec.ts` (da spec 049, só para verificar).
- Fase 4: `core/auth/LoginPage.tsx`, `core/auth/AlterarSenhaPage.tsx`, `modules/perfis/pages/PerfisPage.tsx`,
  `modules/usuarios/components/UsuarioToggleAtivo.tsx`, `modules/setores/pages/SetoresPage.tsx`,
  `modules/projetos/components/status/StatusBadge.tsx`, `core/layout/AppLayout.tsx`,
  `modules/overview/pages/OverviewPage.tsx`, `shared/ui/page-skeleton.tsx` (novo), `core/i18n/resources.ts` e os
  testes de cada um. Saem `shared/ui/{dialog,confirm-dialog,button,input,label,badge,skeleton,calendar,
  table-column-filter}.tsx` e o `table-column-filter.test.tsx`. Mudam `package.json`/`package-lock.json` e
  `docs/specs/031-heroui-drawers-dropdowns/tasks.md`.
- Fase 5: `shared/ui/calendario.tsx` (novo, + teste), `shared/ui/week-picker-hero.tsx` (+ teste),
  `shared/ui/data-table-filter.tsx` (+ teste), `modules/projetos/pages/ResultadosGeraisPage.tsx`,
  `core/i18n/resources.ts`.
- Fase 6: `core/layout/Sidebar.tsx` (+ teste).

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 (falha) | Unidade | `HistoricoProjetoTabela.test.tsx`: TC ID sem botão nem link; `ResultadosGeraisPage.test.tsx`: clicar não abre painel |
| CA-02 | Unidade + E2E | `ProjetoDetalhePage.test.tsx` (abas Test Cases e Form Factor) e `ResultadosGeraisPage.test.tsx` (resumo abre) |
| CA-03 | Unidade + E2E | `contraste-tema-escuro.test.ts` lê os valores dos tokens; `e2e/navbar.spec.ts` confere a cor de fundo e da borda computadas no escuro |
| CA-04 (falha) | Unidade | `contraste-tema-escuro.test.ts`: falha com o par abaixo de 4,5:1 |
| CA-05 | Unidade | `contraste-tema-escuro.test.ts`: `--edge` no claro é `#eeeeee` e os demais tokens do claro não mudam (instantâneo dos valores) |
| CA-06 | E2E | `e2e/navbar.spec.ts`: `font-family` computada da busca, do título e de um botão contém Inter, em en, pt e ko |
| CA-07 | Unidade + E2E | `ThemeToggle.test.tsx` (visual por tema, `aria-pressed`, ícone animado da spec 049), `e2e/tema.spec.ts` da spec 049 verde, e2e no login e na Navbar |
| CA-08 | Unidade | `calendario.test.tsx` e `week-picker-hero.test.tsx`: com `prefers-reduced-motion`, o popover sem deslocamento |
| CA-09 (falha) | E2E | `e2e/navbar.spec.ts`: 1280, 1440 e 1920 px × Sidebar aberta/recolhida × en/pt/ko × dois temas, com `boundingBox` sem interseção e com folga |
| CA-10 (falha) | Unidade | `LoginPage.test.tsx`: credencial errada, carregamento e redirecionamento |
| CA-11 (falha) | Unidade | `AlterarSenhaPage.test.tsx`: validações zod e nada enviado |
| CA-12 | Unidade | `PerfisPage.test.tsx`, `UsuarioToggleAtivo.test.tsx`, `SetoresPage.test.tsx`: foco, Esc, retorno do foco, confirmação e textos com o nome |
| CA-13 | Unidade | `StatusBadge.test.tsx` (cor por status), `page-skeleton.test.tsx` (`role="status"` com texto) |
| CA-14 | Unidade | `week-picker-hero.test.tsx` e `ResultadosGeraisPage.test.tsx`: classes de pílula, `border-edge` e `data-[pressed]` |
| CA-15 | Unidade | `calendario.test.tsx` e `week-picker-hero.test.tsx` (o atual continua verde) |
| CA-16 (falha) | Unidade | `calendario.test.tsx`: 29/12/2025 → `2026-W01` |
| CA-17 | Unidade | `calendario.test.tsx`: setas, Enter e Esc; meses e dias em en, pt e ko |
| CA-18 | Unidade + E2E | `data-table-filter.test.tsx` (escolher o dia filtra) e o e2e de Projetos atual |
| CA-19 | Unidade | `Sidebar.test.tsx`: `rounded-full` no ativo e no hover, aberta e recolhida, círculo de 30 px recolhida |

## Riscos e decisões pendentes

- **O escuro inteiro muda de cara.** A relação entre página e cartões se inverte em relação à spec 034, e telas que
  o Figma não mostra (Kanban, Overview, gráficos, drawers) podem pedir ajuste. A fase 2 passa pelas telas no
  navegador, nos dois temas, antes de fechar.
- **Spec 049 (transição de tema) chegou à `dev` com o mesmo número** desta spec, que virou 050. O `ThemeToggle` e
  o `global.css` foram mexidos por ela: as fases 2 e 3 partem da versão da `dev`.
- **O `DataTableFilter` sai do `Calendar` do HeroUI** para a grade do `react-day-picker` (RN-18). Os seletores dos
  testes do filtro de data mudam. O comportamento (escolher um dia aplica o filtro, Limpar remove) fica igual.
- **Markup do React Aria nos modais migrados:** os testes de `PerfisPage` e `UsuarioToggleAtivo` procuram o markup
  do Radix e são reescritos com `getByRole`.
- **Larguras da Navbar:** o `minmax(max-content, 1fr)` depende do nome de usuário truncado (`max-w-40`, hoje).
  Com o limite, a coluna da direita tem um máximo previsível e a busca encolhe até um mínimo. Abaixo de 768 px
  (`md`), a busca some como hoje.
