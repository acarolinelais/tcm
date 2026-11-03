# 056. Redesign do Board: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> Só frontend: os comandos rodam em `frontend/`. Caminhos de código abaixo são relativos a `frontend/src`.
> Referência visual: `shared/assets/figma/2550-4207.svg` (Board do dev, tema claro). Ícones novos em
> `shared/assets/figma/icons/filter.svg` e `history.svg`.

## Fase 1: peças compartilhadas

- [x] **T01. Pilha de avatares em `shared/ui`**
  - Arquivos: `shared/ui/pilha-avatares.tsx` (movido de `modules/timeline/components/PilhaAvatares.tsx`),
    `shared/ui/pilha-avatares.test.tsx` (novo), `modules/timeline/pages/TimelinePage.tsx`,
    `modules/timeline/components/TimelineCard.test.tsx`
  - O que muda: o componente recebe `{ id, nome, cor_avatar }[]` e os textos de acessibilidade (`rotulo` e
    `rotuloMais`) por props, em vez das chaves da Timeline. A Timeline passa as chaves dela e o visual fica igual.
    O teste novo cobre cinco pessoas (sem "+N"), seis (com "+1") e lista vazia (não renderiza).
  - Cobre: CA-02
  - Verificação: `npm test -- pilha-avatares TimelinePage TimelineCard` → verde.
- [x] **T02. Ícones Filter e History**
  - Arquivos: `shared/ui/figma-icons.tsx`
  - O que muda: `FilterIcon` (15×10) e `HistoryIcon` (9×9), copiados dos SVGs, no tamanho nativo e com
    `currentColor`, no padrão dos outros ícones do arquivo. O `HistoryIcon` só entra em uso nas specs 058 e 059.
  - Feito: só o `FilterIcon`. O `HistoryIcon` entra na spec 058, onde passa a ter uso (evita ícone sem uso).
  - Cobre: CA-03 (o botão Filter usa o ícone)
  - Verificação: `npx tsc -b` e `npm run lint` → sem erro; ícone novo sem uso gera aviso só se o lint barrar
    exports (se barrar, o `HistoryIcon` fica para a 058).
- [x] **T03. Seletor de projeto fora do `h1`**
  - Arquivos: `modules/projetos/components/ProjetoSwitcher.tsx`, `ProjetoSwitcher.test.tsx`
  - O que muda: prop `comoTitulo` (padrão `true`). Com `false`, o seletor renderiza um `div` em vez do `h1` e usa
    `text-body`, mantendo menu, busca e teclado. O teste confere os dois modos e que o `h1` some só no modo novo.
  - Cobre: CA-01
  - Verificação: `npm test -- ProjetoSwitcher` → verde; `npm test -- page-card` (varredura de `<h1`) → verde.
- [x] **T04. Textos nos três idiomas**
  - Arquivos: `core/i18n/resources.ts`
  - O que muda: `boardKanbanHint` (descrição do Board), `boardPeople` (acessibilidade da pilha) e `filter`
    (rótulo do botão), em inglês, português e coreano. Se `filter` já existir, reaproveita.
  - Feito: o "+N" da pilha reaproveita `timelineMorePeople` (mesmo texto). A chave `filter` já existia ("Filter: {{label}}", com parâmetro), então o rótulo do botão é `filterButton`.
    O teste de presença das chaves ficou em `core/i18n/resources.test.ts`.
  - Cobre: CA-01, CA-10
  - Verificação: `npm test -- resources` → verde (teste de paridade entre idiomas).

## Fase 2: botão Filter

- [x] **T05. Filtros do Kanban dentro do botão Filter**
  - Arquivos: `modules/projetos/components/kanban/KanbanFiltros.tsx`, `KanbanFiltros.test.tsx` (novo)
  - O que muda: o botão `Filter` (com `FilterIcon`, número de filtros ativos e `aria-expanded`) abre um Popover do
    HeroUI com os seis filtros empilhados e "Limpar filtros". `useFiltrosKanban` não muda. **Primeiro** testa a
    navegação por teclado com os menus dentro do Popover (abrir, escolher, fechar, foco de volta ao botão). Se
    ficar ruim, troca o Popover pelo `SideDrawer` do projeto e registra no `plan.md`, sem mudar a regra.
  - Feito: o Popover funcionou por teclado com os menus dentro (Escape fecha primeiro o menu, depois o painel, e o
    foco volta ao botão), então o `SideDrawer` não foi preciso. O vazio do Kanban (sem casos e sem resultado) usa o
    `EstadoVazio`, com `kanbanNoMatchesHint` novo e o botão de limpar. Com o painel aberto, o resto da tela fica
    oculto para leitor de tela (comportamento do Popover), e os testes fecham o painel antes de olhar os cards.
  - Cobre: CA-03, CA-04, CA-05
  - Verificação: `npm test -- KanbanFiltros KanbanBoard useFiltrosKanban` → verde (abre e fecha por teclado, o
    contador acompanha, "Limpar" zera a URL, filtro sem resultado mostra o vazio com a opção de limpar).

## Fase 3: Board do projeto (cabeçalho, colunas e cards)

- [x] **T06. Coluna e card do protótipo**
  - Arquivos: `modules/projetos/components/kanban/KanbanColuna.tsx` (extraído de `KanbanBoard.tsx`),
    `KanbanBoard.tsx`, `KanbanCard.tsx`, `KanbanCard.test.tsx`
  - O que muda: coluna `bg-panel` com ponto (`bg-status-*-icon`), nome e total no lugar do `StatusPill`; card
    branco com sombra leve; etiquetas coloridas por valor (Difficulty: `Low` neutro, `Medium` progress, `High`
    fixes; TC Situation: `New` todo, as outras neutro); alça de arrastar discreta, visível no hover e no foco. Arrasto,
    destaques, rolagem na borda e menu não mudam. O teste de card sem destinos afirma que não há menu nem alça.
  - Feito: o ponto da coluna usa `statusChipTons[status].texto` (tokens `--etiqueta-*`), porque as cores do protótipo
    (laranja, roxo, magenta, verde) combinam com esses tokens, e não com `--status-*-icon` (In Progress é azul lá).
    Medidas do frame: coluna 234 px, raio 24 px, gap 11 px, card com raio 15 px.
  - Cobre: CA-01, CA-06, CA-07
  - Verificação: `npm test -- KanbanCard KanbanBoard` → verde (os testes de arrasto e menu que já existem seguem
    passando sem alteração).
- [x] **T07. Cabeçalho do Board**
  - Arquivos: `modules/projetos/pages/BoardKanbanPage.tsx`, `BoardKanbanPage.test.tsx`
  - O que muda: `PageTitle` "Board" (o `h1`), descrição, `PilhaAvatares` com os responsáveis dos cards e, na faixa
    de baixo, o `ProjetoSwitcher` (`comoTitulo={false}`) e o botão Filter, com a linha fina embaixo. Projeto
    inexistente, carga e erro usam `EstadoVazio` e `ErroComRetry` no estilo novo.
  - Feito: a página chama `useKanban` com a mesma chave do quadro (uma consulta só) para tirar os responsáveis. O
    `KanbanBoard` ganhou o slot `faixa` (o seletor de projeto) e monta a linha com os filtros, inclusive nos estados
    de carga e erro, para a pessoa poder trocar de projeto.
  - Cobre: CA-01, CA-02, CA-08
  - Verificação: `npm test -- BoardKanbanPage` → verde (cabeçalho completo, sete colunas com total, erro com
    botão de tentar de novo, projeto fora do escopo tratado como inexistente).

## Fase 4: escolha do projeto, e2e e fechamento

- [x] **T08. Tela de escolha do projeto**
  - Arquivos: `modules/projetos/pages/BoardPage.tsx`, `BoardPage.test.tsx`
  - O que muda: busca, cards de time, selo de iniciais e itens de projeto com as bordas, raios e cores do
    protótipo (sem frame próprio: critério do Board). Estrutura, agrupamento por setor e redirecionamento do dev
    não mudam.
  - Feito: cartão de time em `bg-panel` (sem borda, raio 24 px), selo de iniciais e itens em `bg-surface`, busca em pílula.
  - Cobre: CA-09
  - Verificação: `npm test -- BoardPage` → verde (título azul, busca filtra time e projeto, dev redireciona).
- [x] **T09. e2e do Board e conferência por perfil**
  - Arquivos: `e2e/projetos-kanban.spec.ts`
  - O que muda: com a API simulada, abre o Board em inglês, português e coreano e confere que nenhum texto fica
    cortado (helper `semTextoCortado`), que o foco é visível no Filter, no menu do card e na alça, e que o Filter
    abre e fecha só com o teclado. Depois, screenshots do Board nos quatro perfis para conferir com o frame.
  - Feito: `e2e/board-visual.spec.ts` (5 testes, API simulada) e `e2e/visual-helpers.ts`, com os três helpers que a
    spec 055 tinha dentro de `identidade-visual.spec.ts`. Screenshots do Board real (claro e escuro) conferidos com o
    frame 2550-4207.
  - Cobre: CA-03, CA-10, CA-11
  - Verificação: `npm run e2e -- projetos-kanban` → verde (só os casos com API simulada).
- [x] **T10. Verificação final e fechamento**
  - Arquivos: este `tasks.md`, `docs/specs/README.md`
  - O que muda: roda `npx tsc -b`, `npm run lint`, `npm test` e `npm run build`; confere que o tema escuro não
    mudou; marca cada CA ao teste que o cobre; muda o status da spec para `Concluída` e atualiza o roadmap.
  - Feito: `tsc`, lint e `build` limpos. Suíte completa instável sob carga (só `ProjetoDetalhePage` e, numa rodada, um
    teste do `ProjetoSwitcher` estouraram o tempo, e os dois passam isolados); os 13 arquivos afetados passam juntos
    (130 testes), e os e2e simulados passam (14). `code-review`: 8 achados, 2 procedentes e corrigidos (`StatusPill`
    sem uso removido; alça de arrastar a 80% de opacidade para chegar a 3:1); o aninhamento dos menus no Popover foi
    conferido no Chromium e funciona; os demais foram para o Backlog ou eram decisão da spec.
  - CA → teste: CA-01 `BoardKanbanPage.test`; CA-02 `pilha-avatares.test` e `BoardKanbanPage.test`; CA-03
    `KanbanFiltros.test` e `board-visual.spec`; CA-04 `KanbanFiltros.test` e `KanbanBoard.test`; CA-05
    `KanbanBoard.test`; CA-06 `KanbanBoard.test`; CA-07 `KanbanCard.test`; CA-08 `BoardKanbanPage.test`; CA-09
    `BoardPage.test`; CA-10 e CA-11 `board-visual.spec`; CA-12 `contraste-tema-escuro.test`, `cores-por-token` e
    screenshot do escuro.
  - Cobre: CA-12
  - Verificação: `npm test -- contraste-tema-escuro cores-por-token` → verde; os quatro comandos acima sem erro.

## Backlog
- A pílula do botão (`h-9 rounded-full border border-edge bg-surface px-4 text-[15px]…`) já existe em
  `week-picker-hero.tsx` e em `ResultadosGeraisPage.tsx`, e o Filter é a terceira cópia. Extrair um `BotaoPilula`
  mexe em telas fora da 056 (achado da `simplify` da Fase 2).
- O bloco "filtro sem resultado" do Kanban repete o ramo `filtered` de `estadoDaTabela`. Extrair um
  `EstadoSemResultado` em `shared/ui` mexe nas tabelas (achado da `simplify` da Fase 2).
- `KanbanFiltros` recebe `ativos` e calcula `quantos`; dá para derivar um do outro e tirar a prop, mas isso muda a
  assinatura e os testes (achado da `simplify` da Fase 2).
- `BoardKanbanPage` (pessoas dos avatares) e `KanbanFiltros` (responsáveis do filtro) repetem o mesmo trecho: achatar
  os casos, deduplicar por `responsavel_id` e ordenar por nome. Um helper ao lado de `filtrarKanban` serve aos dois
  (achado da `simplify` das Fases 3 e 4).
- `pessoas` do cabeçalho é recalculado a cada render, inclusive no movimento otimista. Um `useMemo` sobre
  `kanban.data` resolve; com 1.000 casos o custo é desprezível (mesma `simplify`).
- Os testes do filtro em `KanbanBoard.test.tsx` repetem o Escape até o painel fechar, por causa do foco assíncrono do
  Popover, e o teste do ponto da coluna lê `previousElementSibling`. Funcionam (estáveis em várias rodadas), mas
  dependem de tempo e da ordem do DOM (mesma `simplify`).
- O `StatusPill` e o `status-badge-estilos.ts` ficaram sem uso quando o cabeçalho da coluna trocou o selo por um
  ponto, e foram removidos (achado do `code-review`). Os tokens `--status-*` do `global.css` (todo, progress, review,
  validation, done, fixes, cancelled, `-bg`, `-fg`, `-icon` e `--status-glyph`) só eram lidos por eles. Tirar os tokens
  mexe nos dois temas e precisa de uma conferência própria.
