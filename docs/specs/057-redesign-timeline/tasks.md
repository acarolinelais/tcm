# 057. Redesign da Timeline: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> Só frontend: os comandos rodam em `frontend/`. Caminhos de código abaixo são relativos a `frontend/src`.
> Referência visual: `shared/assets/figma/2550-3921.svg` (Timeline do dev, tema claro) e
> `shared/assets/figma/illustrations/background-timeline.svg` (fundo da grade).

## Fase 1: botão Filter compartilhado

- [x] **T01. `FiltrosPopover` e o Kanban usando-o**
  - Arquivos: `shared/ui/filtros-popover.tsx` (novo), `shared/ui/filtros-popover.test.tsx` (novo),
    `modules/projetos/components/kanban/KanbanFiltros.tsx`, `core/i18n/resources.ts` e `resources.test.ts`
    (`kanbanActiveFilters` vira `activeFilters`)
  - O que muda: a pílula com `FilterIcon`, o contador (número com `aria-hidden` e texto só para leitor de tela) e o
    Popover saem do `KanbanFiltros` para o componente novo, que recebe `ativos` (número), o rótulo do painel e os
    filtros como `children`. O `KanbanFiltros` passa a usá-lo e mantém os seis filtros e o "Limpar filtros". O teste
    novo cobre: abre e fecha só com o teclado com o foco de volta ao botão; sem filtro ativo não há contador; com
    três ativos o nome acessível é "Filter 3 active".
  - Cobre: CA-03
  - Verificação: `npm test -- filtros-popover KanbanFiltros KanbanBoard BoardKanbanPage resources` → verde (os
    testes do Kanban passam sem alteração).

## Fase 2: barra e cabeçalho da página

- [x] **T02. Filtros da Timeline dentro do Filter**
  - Arquivos: `modules/timeline/components/TimelineFiltros.tsx` (novo), `TimelineFiltros.test.tsx` (novo)
  - O que muda: `FiltrosPopover` com os dois `MultiSelectCombobox` (responsável e Test Case) empilhados e o "Limpar
    filtros" quando há filtro. Recebe opções, valores e callbacks por props. **Primeiro** testa a lista do combobox
    dentro do painel, por teclado e no Chromium real (Escape fecha a lista e depois o painel). Se o foco ficar ruim,
    troca o Popover pelo `SideDrawer` do projeto e registra no `plan.md`.
  - Feito: a lista do combobox funciona dentro do Popover (Escape fecha a lista e depois o painel), então o
    `SideDrawer` não foi preciso. A chave `timelineFilters` nomeia o painel.
  - Cobre: CA-03, CA-04
  - Verificação: `npm test -- TimelineFiltros` → verde (escolhe um valor, o painel segue aberto, Escape fecha a
    lista e depois o painel, o contador acompanha, Limpar zera).
- [x] **T03. Cabeçalho, barra e estados da página**
  - Arquivos: `modules/timeline/pages/TimelinePage.tsx`, `TimelinePage.test.tsx`
  - O que muda: `PageTitle` "Timeline", a descrição que já existe e a pilha de avatares; barra com o
    `ProjetoSwitcher` (`buscavel`, `comoTitulo={false}`), o grupo Dia/Semana/Mês, o intervalo e o "Hoje" em pílulas
    (`rounded-full`, `h-9`) e o `TimelineFiltros` à direita. O vazio de "nenhuma mudança neste período" usa
    `EstadoVazio`, com o botão de limpar quando há filtro. Os testes de filtro passam a abrir o Filter antes.
  - Feito: o vazio com filtro usa a dica `kanbanNoMatchesHint` e o `SearchX`; sem filtro, a dica nova `timelineEmptyHint`.
    Os testes fecham o painel do Filter antes de olhar o resto da tela (ele oculta o fundo para leitor de tela).
  - Cobre: CA-01, CA-02, CA-04, CA-05, CA-09, CA-10
  - Verificação: `npm test -- TimelinePage` → verde (cabeçalho completo; trocar de projeto limpa os filtros; vazio com
    e sem filtro; erro com "Tentar de novo"; sem permissão recusa; o card abre o painel das mudanças).

## Fase 3: grade e cards

- [x] **T04. Cabeçalho da grade e linha do momento atual**
  - Arquivos: `modules/timeline/components/TimelineGrade.tsx`, `TimelineGrade.test.tsx`
  - O que muda: linha do mês com altura fixa (`h-8`); o mês novo em `text-subtle`; cada dia com a inicial pequena e
    cinza e o número maior; o dia de hoje com `border-b-2 border-accent` e texto azul. A linha do momento atual passa a
    começar abaixo do cabeçalho (`top-[4.25rem]`). Os testes afirmam: hoje sublinhado, mês novo em cinza na coluna em
    que começa, a linha do agora só no período atual e abaixo do cabeçalho.
  - Cobre: CA-06, CA-07
  - Verificação: `npm test -- TimelineGrade` → verde.
- [x] **T05. Fundo quadriculado e card**
  - Arquivos: `modules/timeline/components/TimelineGrade.tsx`, `TimelineCard.tsx`, `TimelineGrade.test.tsx`
  - O que muda: `div` decorativa atrás dos cards (`aria-hidden`, `pointer-events-none`, `dark:bg-none`) com
    `illustrations/background-timeline.svg` repetido na horizontal (técnica do login: `--grade` na `style` e
    `bg-[image:var(--grade)]`). O card ganha raio de 10 px, conferido contra o frame. Se a emenda do fundo aparecer
    no screenshot, troca por `bg-cover` com a altura da grade.
  - Feito: a emenda do fundo repetido não aparece no screenshot (cai sobre uma linha da grade), então ficou o
    `bg-repeat-x`. O raio do card no frame é 10 px, e a altura mínima de 45 px já batia.
  - Cobre: CA-08
  - Verificação: `npm test -- TimelineGrade TimelineCard` → verde (a camada do fundo existe, é decorativa e não
    captura clique); `npx tsc -b` e `npm run lint` limpos.

## Fase 4: e2e e fechamento

- [x] **T06. e2e da Timeline e conferência visual**
  - Arquivos: `e2e/timeline.spec.ts`, `e2e/timeline-visual.spec.ts` (novo)
  - O que muda: o passo de filtrar duas pessoas do e2e existente abre o Filter antes. O e2e novo, com a API simulada,
    abre a Timeline em inglês, português e coreano, nas visões Dia, Semana e Mês, e confere: sem texto cortado
    (helper `semTextoCortado`), o dia de hoje sublinhado, o Filter abrindo e fechando só com o teclado, e foco visível
    na barra e nos cards. Depois, screenshots no claro e no escuro, conferidos com o frame 2550-3921.
  - Feito: os testes novos ficaram em `e2e/timeline.spec.ts`, junto com os mocks que já existiam, em vez de um arquivo
    `timeline-visual.spec.ts` (evita copiar os mocks). O e2e achou dois defeitos que a unidade não via: o texto do card
    ("Ana · 2 changes") truncava na coluna estreita, e o sublinhado de hoje ficava 8 px acima da linha do cabeçalho.
    Os dois foram corrigidos (o texto do card quebra de linha; o sublinhado ocupa a altura do cabeçalho). Com um
    projeto só, o seletor mostra só o nome, sem menu.
  - Cobre: CA-03, CA-11, CA-12
  - Verificação: `npm run e2e -- timeline timeline-visual` → verde (só os casos com API simulada).
- [x] **T07. Verificação final e fechamento**
  - Arquivos: este `tasks.md`, `docs/specs/README.md`
  - O que muda: roda `npx tsc -b`, `npm run lint`, `npm test` e `npm run build`; confere que o tema escuro não
    mudou; mapeia cada CA ao teste que o cobre; muda o status da spec para `Concluída` e atualiza o roadmap.
  - Feito: `tsc`, lint e `build` limpos. Suíte completa: 713 de 719, e as 6 falhas são do `ProjetoDetalhePage`, instável
    sob carga (passa isolado, 47 de 47). E2E simulados: 20 de 20, duas rodadas. `code-review`: 9 achados; procedeu o
    plural do texto de filtros ativos em português ("1 ativos"), corrigido com `_one`/`_other`. O Escape no painel foi
    conferido no Chromium com pausa de 400 ms entre os toques e fecha normalmente (os laços de repetição dos testes
    só cobrem o Escape rápido demais). A emenda do fundo repetido não aparece nem a 1920 px.
  - CA → teste: CA-01 `TimelinePage.test`; CA-02 `TimelinePage.test`; CA-03 `filtros-popover.test` e `timeline.spec`;
    CA-04 `TimelineFiltros.test` e `TimelinePage.test`; CA-05 `TimelinePage.test`; CA-06 e CA-07 `TimelineGrade.test`;
    CA-08 `TimelineGrade.test` e screenshot; CA-09 `TimelinePage.test`; CA-10 `TimelinePage.test`; CA-11 e CA-12
    `timeline.spec`; CA-13 `contraste-tema-escuro.test`, `cores-por-token` e screenshot do escuro.
  - Cobre: CA-13
  - Verificação: `npm test -- contraste-tema-escuro cores-por-token` → verde; os quatro comandos acima sem erro.

## Ajuste de 2026-11-02 (frame atualizado e bug do card)
- Frame 2550-3921 atualizado: o seletor de projeto fica à esquerda, e as visões, o intervalo, o "Hoje" e o Filter ficam
  agrupados à direita (`TimelinePage.tsx`). A linha do momento atual passa a ter 2 px (`w-0.5`).
- Bug reportado com imagem: o texto do card passava por baixo do avatar ("Keyboard_000001" e "Caroline Laís · 11
  changes"). Causa: o `Button` do HeroUI tem `whitespace-nowrap`, e o resumo, sem `truncate` desde o ajuste do CA-11,
  não quebrava e empurrava a coluna do texto para além do card. Correção: `whitespace-normal` no resumo, e o número
  fica junto da palavra (espaço não separável). O e2e `o texto do card não passa por baixo do avatar` reproduz o caso
  da imagem e reprova sem a correção. Os e2e da primeira rodada não pegaram o bug porque o auxiliar só detecta texto
  cortado por `overflow`, e aqui o texto vazava sem corte.

## Backlog
- O laço "repetir o Escape até o painel fechar" está em três testes (`KanbanBoard.test`, `TimelineFiltros.test` e
  `TimelinePage.test`). Um helper de teste compartilhado resolve; mexe na spec 056 (achado da `simplify` da Fase 2).
- O cabeçalho da grade tem alturas fixas (`grid-rows-[2rem_2.25rem_1fr]`), e o `top-[4.25rem]` aparece em três
  camadas (fundo, linha do agora e vazio). Uma variável CSS ou um contêiner posicionado abaixo do cabeçalho tiraria a
  repetição; com zoom de 200% ou fonte maior a linha pode desalinhar (achado do `code-review`).
- O resumo do card passou a quebrar de linha em vez de truncar (exigência do CA-11); cards com nomes muito longos ficam
  mais altos na coluna estreita da Semana. Se incomodar, o plano é limitar a duas linhas com reticências e tooltip.
- A Timeline usa a dica `kanbanNoMatchesHint` do Kanban para o vazio com filtro. Serve, mas acopla a chave de outro
  módulo; uma chave genérica (`noMatchesHint`) resolveria nas duas telas (mesma `simplify`).
