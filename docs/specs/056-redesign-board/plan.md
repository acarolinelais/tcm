# 056. Redesign do Board: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0009 e 0037 (módulos autossuficientes; só HeroUI na tela redesenhada), 0040 (tema por
  classe), 0041 (cor só por token), 0010 (testes com sucesso e falha)
- **ADRs novos propostos:** nenhum

## Abordagem

Só frontend; banco, API e regras não mudam. O Kanban, os filtros e o arrasto ficam como estão: muda o que cada
peça desenha. As cores saem dos tokens que já existem (`--etiqueta-*`, tanto para o ponto da coluna quanto para as
etiquetas), sem token novo. O botão **Filter** passa a abrir os mesmos filtros num Popover do HeroUI, e
`useFiltrosKanban` (URL, combinação, limpar) não muda. A pilha de avatares da Timeline sobe para `shared/ui`,
porque dois módulos passam a usá-la (ADR 0009). No Board, o nome do projeto deixa de ser o `h1`: o `h1` vira o
título "Board" e o seletor de projeto fica na faixa de baixo.

## Modelo de dados
Sem mudança.

## Contrato da API
Sem mudança. As pessoas do cabeçalho saem dos cards que `GET` do Kanban já devolve (`responsavel_id`,
`responsavel_nome` e `responsavel_cor_avatar`).

## Backend: arquivos
Nenhum.

## Frontend: arquivos

**Compartilhado**
- `shared/ui/pilha-avatares.tsx` (novo, movido de `modules/timeline/components/PilhaAvatares.tsx`): recebe
  `{ id, nome, cor_avatar }[]` e os dois textos de acessibilidade (`rotulo` e `rotuloMais`) por props, em vez das
  chaves da Timeline. `TimelinePage.tsx` e `TimelineCard.test.tsx` passam a importar daqui.
- `shared/ui/figma-icons.tsx`: `FilterIcon` e `HistoryIcon`, de `icons/filter.svg` e `icons/history.svg`, no
  tamanho nativo do viewBox. O `HistoryIcon` só é usado nas specs 058 e 059, mas entra junto para não duplicar
  o padrão.
- `modules/projetos/components/ProjetoSwitcher.tsx`: prop nova `comoTitulo` (padrão `true`). Com `false`, o
  seletor não é `h1` e usa `text-body`, como no frame. Projects e General Results continuam como estão.

**Board**
- `pages/BoardKanbanPage.tsx`: cabeçalho novo: `PageTitle` "Board", descrição e `PilhaAvatares` à direita. A faixa
  de baixo leva o `ProjetoSwitcher` (`comoTitulo={false}`) e o botão Filter, com uma linha fina embaixo. O estado
  de projeto não encontrado e o de carga continuam, no `EstadoVazio` da 055.
- `components/kanban/KanbanBoard.tsx`: recebe o slot do botão Filter e o lugar dos avatares; a faixa passa a ser
  montada pela página. As colunas têm `bg-panel`, raio maior e largura do frame. O arrasto mantém `useDrop`,
  rolagem na borda e os destaques (RN-07); só trocam as classes.
- `components/kanban/KanbanColuna.tsx` (extraída de `KanbanBoard.tsx`, que passa de 170 linhas): cabeçalho com
  ponto (cor de `statusChipTons`, tokens `--etiqueta-*`), nome e total, no lugar do `StatusPill`.
- `components/kanban/KanbanCard.tsx`: card branco com sombra leve; etiquetas com cor por valor: Difficulty `Low`
  neutro, `Medium` progress e `High` fixes; TC Situation `New` todo e as outras neutro; Category neutro. A alça de
  arrastar fica com opacidade baixa e aparece no hover e no foco. Os testes de arrasto e menu não mudam.
- `components/kanban/KanbanFiltros.tsx`: o conteúdo vira o painel do Popover, com os campos empilhados. O botão
  `Filter` (com `FilterIcon`, contador de filtros ativos e "Limpar filtros" dentro do painel) mora aqui.
- `pages/BoardPage.tsx` (escolha do projeto): `PageTitle` azul, busca e cards de time com as bordas e cores do
  protótipo. Estrutura e comportamento iguais.
- `core/i18n/resources.ts`: `boardKanbanHint` (descrição), `boardPeople` (acessibilidade da pilha) e `filterButton`
  (rótulo do botão), nos três idiomas. O "+N" da pilha reaproveita `timelineMorePeople`, que tem o mesmo texto.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade | `BoardKanbanPage.test.tsx`: título "Board", descrição, avatares, seletor, botão Filter e sete colunas com total |
| CA-02 | Unidade | `pilha-avatares.test.tsx`: seis pessoas mostram cinco e "+1", com o nome acessível |
| CA-03 | Unidade + e2e | `KanbanFiltros.test.tsx`: abre e fecha por teclado, foco volta ao botão; `projetos-kanban.spec.ts` |
| CA-04 | Unidade | `KanbanBoard.test.tsx`: com filtro, o botão indica o número ativo e os totais refeitos |
| CA-05 (falha) | Unidade | `KanbanBoard.test.tsx`: filtro sem resultado mostra o estado vazio com "Limpar filtros" |
| CA-06 | Unidade | `KanbanBoard.test.tsx`, `KanbanCard.test.tsx` (já existem): movimento por menu e arrasto, justificativa ao excluir |
| CA-07 (falha) | Unidade | `KanbanCard.test.tsx`: card sem destinos não mostra menu nem alça |
| CA-08 (falha) | Unidade | `BoardKanbanPage.test.tsx`: consulta com erro mostra a mensagem e o botão de tentar de novo |
| CA-09 | Unidade | `BoardPage.test.tsx`: título azul e cards de time com a mesma busca |
| CA-10 | E2E | `projetos-kanban.spec.ts`: sem texto cortado nos três idiomas (helper `semTextoCortado` da 055) |
| CA-11 | E2E | `projetos-kanban.spec.ts`: foco visível no Filter, no menu do card e na alça |
| CA-12 | Unidade | `contraste-tema-escuro.test.ts` (já guarda o hash do escuro) e `cores-por-token` |

## Riscos e decisões pendentes

- **Filtro dentro de Popover:** os filtros de Status, responsável e Category são menus que abrem outros popovers.
  Testado na T05: o Popover funciona por teclado com os menus dentro (Escape fecha o menu e depois o painel; o foco
  volta ao botão). O `SideDrawer` ficou como plano B e não foi preciso.
- **Título do protótipo:** o frame diz "Board Tasks", e o menu diz "Board". A spec fala em "Board". Mantenho
  "Board" (a spec e a sidebar) e a troca é uma linha de i18n, se você preferir o texto do frame.
- **Etiquetas de TC Situation:** o protótipo só mostra `New` (azul). `New Step` e `Without Changes` ficam
  neutras, por falta de frame.
- **Cores dos pontos:** o protótipo usa um ponto por Status do caminho feliz. `In Fixes` e `Excluded` reaproveitam
  os tokens `--status-fixes-icon` e `--status-cancelled-icon`, que já existem nos dois temas.
- **Colunas além da largura:** com sete colunas de 245 px, o quadro rola na horizontal, como no frame (a última
  coluna aparece cortada). A rolagem continua acessível por teclado e pelo arrasto.
