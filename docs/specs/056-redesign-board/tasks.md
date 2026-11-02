# 056. Redesign do Board: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> Só frontend: os comandos rodam em `frontend/`. Caminhos de código abaixo são relativos a `frontend/src`.
> Referência visual: `shared/assets/figma/2550-4207.svg` (Board do dev, tema claro). Ícones novos em
> `shared/assets/figma/icons/filter.svg` e `history.svg`.

## Fase 1: peças compartilhadas

- [ ] **T01. Pilha de avatares em `shared/ui`**
  - Arquivos: `shared/ui/pilha-avatares.tsx` (movido de `modules/timeline/components/PilhaAvatares.tsx`),
    `shared/ui/pilha-avatares.test.tsx` (novo), `modules/timeline/pages/TimelinePage.tsx`,
    `modules/timeline/components/TimelineCard.test.tsx`
  - O que muda: o componente recebe `{ id, nome, cor_avatar }[]` e os textos de acessibilidade (`rotulo` e
    `rotuloMais`) por props, em vez das chaves da Timeline. A Timeline passa as chaves dela e o visual fica igual.
    O teste novo cobre cinco pessoas (sem "+N"), seis (com "+1") e lista vazia (não renderiza).
  - Cobre: CA-02
  - Verificação: `npm test -- pilha-avatares TimelinePage TimelineCard` → verde.
- [ ] **T02. Ícones Filter e History**
  - Arquivos: `shared/ui/figma-icons.tsx`
  - O que muda: `FilterIcon` (15×10) e `HistoryIcon` (9×9), copiados dos SVGs, no tamanho nativo e com
    `currentColor`, no padrão dos outros ícones do arquivo. O `HistoryIcon` só entra em uso nas specs 058 e 059.
  - Cobre: CA-03 (o botão Filter usa o ícone)
  - Verificação: `npx tsc -b` e `npm run lint` → sem erro; ícone novo sem uso gera aviso só se o lint barrar
    exports (se barrar, o `HistoryIcon` fica para a 058).
- [ ] **T03. Seletor de projeto fora do `h1`**
  - Arquivos: `modules/projetos/components/ProjetoSwitcher.tsx`, `ProjetoSwitcher.test.tsx`
  - O que muda: prop `comoTitulo` (padrão `true`). Com `false`, o seletor renderiza um `div` em vez do `h1` e usa
    `text-body`, mantendo menu, busca e teclado. O teste confere os dois modos e que o `h1` some só no modo novo.
  - Cobre: CA-01
  - Verificação: `npm test -- ProjetoSwitcher` → verde; `npm test -- page-card` (varredura de `<h1`) → verde.
- [ ] **T04. Textos nos três idiomas**
  - Arquivos: `core/i18n/resources.ts`
  - O que muda: `boardKanbanHint` (descrição do Board), `boardPeople` e `boardMorePeople` (acessibilidade da
    pilha) e `filter` (rótulo do botão), em inglês, português e coreano. Se `filter` já existir, reaproveita.
  - Cobre: CA-01, CA-10
  - Verificação: `npm test -- i18n` → verde (teste de paridade entre idiomas).

## Fase 2: botão Filter

- [ ] **T05. Filtros do Kanban dentro do botão Filter**
  - Arquivos: `modules/projetos/components/kanban/KanbanFiltros.tsx`, `KanbanFiltros.test.tsx` (novo)
  - O que muda: o botão `Filter` (com `FilterIcon`, número de filtros ativos e `aria-expanded`) abre um Popover do
    HeroUI com os seis filtros empilhados e "Limpar filtros". `useFiltrosKanban` não muda. **Primeiro** testa a
    navegação por teclado com os menus dentro do Popover (abrir, escolher, fechar, foco de volta ao botão). Se
    ficar ruim, troca o Popover pelo `SideDrawer` do projeto e registra no `plan.md`, sem mudar a regra.
  - Cobre: CA-03, CA-04, CA-05
  - Verificação: `npm test -- KanbanFiltros KanbanBoard useFiltrosKanban` → verde (abre e fecha por teclado, o
    contador acompanha, "Limpar" zera a URL, filtro sem resultado mostra o vazio com a opção de limpar).

## Fase 3: Board do projeto (cabeçalho, colunas e cards)

- [ ] **T06. Coluna e card do protótipo**
  - Arquivos: `modules/projetos/components/kanban/KanbanColuna.tsx` (extraído de `KanbanBoard.tsx`),
    `KanbanBoard.tsx`, `KanbanCard.tsx`, `KanbanCard.test.tsx`
  - O que muda: coluna `bg-panel` com ponto (`bg-status-*-icon`), nome e total no lugar do `StatusPill`; card
    branco com sombra leve; etiquetas coloridas por valor (Difficulty: `Low` neutro, `Medium` progress, `High`
    fixes; TC Situation: `New` todo, as outras neutro); alça de arrastar discreta, visível no hover e no foco. Arrasto,
    destaques, rolagem na borda e menu não mudam. O teste de card sem destinos afirma que não há menu nem alça.
  - Cobre: CA-01, CA-06, CA-07
  - Verificação: `npm test -- KanbanCard KanbanBoard` → verde (os testes de arrasto e menu que já existem seguem
    passando sem alteração).
- [ ] **T07. Cabeçalho do Board**
  - Arquivos: `modules/projetos/pages/BoardKanbanPage.tsx`, `BoardKanbanPage.test.tsx`
  - O que muda: `PageTitle` "Board" (o `h1`), descrição, `PilhaAvatares` com os responsáveis dos cards e, na faixa
    de baixo, o `ProjetoSwitcher` (`comoTitulo={false}`) e o botão Filter, com a linha fina embaixo. Projeto
    inexistente, carga e erro usam `EstadoVazio` e `ErroComRetry` no estilo novo.
  - Cobre: CA-01, CA-02, CA-08
  - Verificação: `npm test -- BoardKanbanPage` → verde (cabeçalho completo, sete colunas com total, erro com
    botão de tentar de novo, projeto fora do escopo tratado como inexistente).

## Fase 4: escolha do projeto, e2e e fechamento

- [ ] **T08. Tela de escolha do projeto**
  - Arquivos: `modules/projetos/pages/BoardPage.tsx`, `BoardPage.test.tsx`
  - O que muda: busca, cards de time, selo de iniciais e itens de projeto com as bordas, raios e cores do
    protótipo (sem frame próprio: critério do Board). Estrutura, agrupamento por setor e redirecionamento do dev
    não mudam.
  - Cobre: CA-09
  - Verificação: `npm test -- BoardPage` → verde (título azul, busca filtra time e projeto, dev redireciona).
- [ ] **T09. e2e do Board e conferência por perfil**
  - Arquivos: `e2e/projetos-kanban.spec.ts`
  - O que muda: com a API simulada, abre o Board em inglês, português e coreano e confere que nenhum texto fica
    cortado (helper `semTextoCortado`), que o foco é visível no Filter, no menu do card e na alça, e que o Filter
    abre e fecha só com o teclado. Depois, screenshots do Board nos quatro perfis para conferir com o frame.
  - Cobre: CA-03, CA-10, CA-11
  - Verificação: `npm run e2e -- projetos-kanban` → verde (só os casos com API simulada).
- [ ] **T10. Verificação final e fechamento**
  - Arquivos: este `tasks.md`, `docs/specs/README.md`
  - O que muda: roda `npx tsc -b`, `npm run lint`, `npm test` e `npm run build`; confere que o tema escuro não
    mudou; marca cada CA ao teste que o cobre; muda o status da spec para `Concluída` e atualiza o roadmap.
  - Cobre: CA-12
  - Verificação: `npm test -- contraste-tema-escuro cores-por-token` → verde; os quatro comandos acima sem erro.

## Backlog
Nenhum item ainda.
