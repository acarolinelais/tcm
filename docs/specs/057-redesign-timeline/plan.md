# 057. Redesign da Timeline: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0009 e 0037 (módulos autossuficientes; só HeroUI na tela redesenhada), 0040 (tema por
  classe), 0041 (cor só por token), 0010 (testes com sucesso e falha)
- **ADRs novos propostos:** nenhum

## Abordagem

Só frontend; banco, API e regras da spec 054 não mudam. O botão Filter da 056 sai de dentro do `KanbanFiltros` e
vira um componente compartilhado (`FiltrosPopover`: pílula, ícone, contador de ativos e o painel), usado pelo Board
e pela Timeline. A Timeline troca os dois filtros soltos da barra por esse botão. O cabeçalho da grade ganha o dia de
hoje sublinhado e o mês novo em cinza, a linha do momento atual passa a começar no cabeçalho, e o corpo ganha o fundo
quadriculado exportado do Figma, só no tema claro. O card já seguia o Figma da spec 054; só o raio e a sombra são
conferidos contra o frame novo. Ordem: peça compartilhada, barra e cabeçalho da página, grade e cards, e e2e.

## Modelo de dados
Sem mudança.

## Contrato da API
Sem mudança.

## Backend: arquivos
Nenhum.

## Frontend: arquivos

**Compartilhado**
- `shared/ui/filtros-popover.tsx` (novo, extraído de `KanbanFiltros.tsx`): recebe `ativos` (número), o rótulo do
  painel e os filtros como `children`. Desenha a pílula com `FilterIcon`, o contador (visível com `aria-hidden` e
  texto só para leitor de tela) e o Popover do HeroUI.
- `core/i18n/resources.ts`: `kanbanActiveFilters` vira `activeFilters`, porque agora serve a duas telas. Mesmo texto
  nos três idiomas; `resources.test.ts` acompanha.

**Board (só a troca de peça)**
- `modules/projetos/components/kanban/KanbanFiltros.tsx`: usa `FiltrosPopover` e continua com os seis filtros e o
  "Limpar filtros". Os testes do Kanban não mudam.

**Timeline**
- `components/TimelineFiltros.tsx` (novo): `FiltrosPopover` com os dois `MultiSelectCombobox` (responsável e Test Case)
  empilhados e o "Limpar filtros". Recebe as opções e os valores por props; a página continua dona do estado.
- `pages/TimelinePage.tsx`: o cabeçalho passa a ter `PageTitle` "Timeline", a descrição que já existe e a pilha de
  avatares. A barra começa com o `ProjetoSwitcher` (`buscavel`, `comoTitulo={false}`), e termina com o
  `TimelineFiltros`. O grupo Dia/Semana/Mês, o intervalo e o "Hoje" viram pílulas (`rounded-full`, `h-9`). O estado
  de "nenhuma mudança" usa `EstadoVazio` com o botão de limpar.
- `components/TimelineGrade.tsx`: linha do mês com altura fixa (`h-8`); o mês novo em `text-subtle`; cada dia com a
  inicial pequena e cinza e o número maior (`text-[15px]`); o dia de hoje com `border-b-2 border-accent`. A linha do
  momento atual passa a começar abaixo do cabeçalho (`top-[4.25rem]`, a soma das duas alturas fixas). Uma `div`
  decorativa atrás dos cards (`aria-hidden`, `pointer-events-none`, `dark:bg-none`) leva o fundo
  `illustrations/background-timeline.svg`, repetido na horizontal, pelo mesmo caminho do login (`--grade` na
  `style` e `bg-[image:var(--grade)]`).
- `components/TimelineCard.tsx`: raio de 10 px conferido contra o frame; a sombra e a barra de cor ficam como estão.
- `e2e/timeline.spec.ts`: o passo que filtra duas pessoas abre o Filter antes.
- `e2e/timeline.spec.ts`: ganha os testes visuais (Filter por teclado, dia de hoje, texto sem corte nos três idiomas e
  nas três visões), com a API simulada e os helpers de `e2e/visual-helpers.ts` (da 056).

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade | `TimelinePage.test.tsx`: título "Timeline" azul, descrição, avatares, seletor, visões, intervalo, Hoje e Filter |
| CA-02 | Unidade | `TimelinePage.test.tsx`: trocar o projeto pelo seletor com busca limpa os filtros |
| CA-03 | Unidade + e2e | `filtros-popover.test.tsx`: abre e fecha por teclado, foco volta ao botão; `timeline-visual.spec.ts` |
| CA-04 | Unidade | `TimelinePage.test.tsx` e `TimelineFiltros.test.tsx`: contador, filtro aplicado, Limpar filtros |
| CA-05 (falha) | Unidade | `TimelinePage.test.tsx`: período sem mudanças e filtro sem resultado mostram o vazio e o Limpar filtros |
| CA-06 | Unidade | `TimelineGrade.test.tsx`: dia de hoje sublinhado, linha do agora abaixo do cabeçalho |
| CA-07 | Unidade | `TimelineGrade.test.tsx`: período de dois meses mostra o mês novo em cinza na coluna certa |
| CA-08 | Unidade + e2e | `TimelineGrade.test.tsx`: a camada do fundo existe e é decorativa; screenshot do claro conferido com o frame |
| CA-09 | Unidade | `TimelinePage.test.tsx` (já existe): o card abre o painel das mudanças |
| CA-10 (falha) | Unidade | `TimelinePage.test.tsx`: erro da consulta com "Tentar de novo"; sem projetos mostra o vazio |
| CA-11 | E2E | `timeline-visual.spec.ts`: sem texto cortado em Dia, Semana e Mês nos três idiomas |
| CA-12 | E2E | `timeline-visual.spec.ts`: foco visível na barra, no Filter e nos cards |
| CA-13 | Unidade + manual | `contraste-tema-escuro.test.ts`, `cores-por-token` e screenshot do escuro |

## Riscos e decisões pendentes

- **Combobox dentro de Popover:** os dois filtros da Timeline são `MultiSelectCombobox`, que abrem uma lista própria.
  Na 056 o aninhamento funcionou nos menus do Kanban, mas aqui o campo tem busca e etiquetas. Testo cedo, no Chromium
  real e por teclado (Escape fecha primeiro a lista, depois o painel). Se o foco ficar ruim, o plano B é o
  `SideDrawer` que o projeto já tem.
- **Altura fixa do cabeçalho:** a linha do momento atual depende de os dois cabeçalhos terem altura fixa. Se uma fonte
  maior (coreano) quebrar a linha de texto, a linha azul desalinha. A `e2e` de texto sem corte nos três idiomas
  cobre isso.
- **Fundo repetido:** o SVG tem 1070 px e bordas arredondadas embaixo; repetido na horizontal, a emenda cai sobre uma
  linha da grade (mesma cor `#f2f2f2`). Se a emenda aparecer no screenshot, troco para `bg-cover` com a altura da grade.
- **Seletor de projeto na barra:** é a posição proposta na spec (o frame não o desenha). Em telas estreitas a barra
  quebra em duas linhas, como já quebrava.
- **Mês em cinza:** a cor de `text-subtle` no tema claro passa o AA sobre o cartão branco (a 055 já mede isso).
