# 022. Redesign das telas de Projects e Teams no padrão HeroUI: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0009 (arquitetura Modular), 0015 (papéis), 0022 (padrão de tabela), 0034 (20 itens),
  0037 (HeroUI com migração gradual)
- **ADRs novos propostos:** nenhum

## Abordagem
Primeiro entram as peças globais que o ADR 0037 manda trocar de uma vez: os tokens de tema (um conjunto
só para shadcn e HeroUI) e o toast. Depois vêm as composições compartilhadas em `shared/ui`, feitas com
HeroUI e com os valores do Figma: moldura de listagem com filtro no cabeçalho, seleção, paginação, estado
vazio, botões de ação, etiquetas, painel lateral e confirmação. Em seguida as telas migram, das mais
simples para as mais complexas: Teams, visualizar Team, Projects (aba Test Cases e estado vazio) e, por
fim, a aba Form Factor. A transferência em lote não muda o backend: o frontend chama a rota individual
que já existe para cada Test Case selecionado e junta os resultados.

## Modelo de dados
Sem mudanças.

## Contrato da API
Sem rotas novas. A transferência em lote reusa
`PATCH /api/test-cases/{caso_id}/transferir-para-backup`, chamada uma vez por Test Case, com
`Promise.allSettled`. Cada falha (409 já transferido, 403 não é mais responsável, 404) entra na lista de
falhas com o TC ID. O modo mock (ADR 0030) já implementa essa rota.

## Backend: arquivos
Nenhum.

## Frontend: arquivos

### Tema e toast (globais)
- `core/global.css`: importa as camadas do `@heroui/styles` (base, componentes, tema padrão, utilitários e
  variantes) **sem** reimportar o Tailwind. Os tokens que colidem (`--background`, `--foreground`,
  `--border`, `--muted`, `--radius`) passam a ter um valor só, com cor completa em vez de tripla HSL. O
  `@theme inline` do shadcn deixa de redeclarar `--color-background`, `--color-foreground`,
  `--color-border` e `--radius-*`, que o HeroUI já mapeia. `--muted` assume o significado do HeroUI (texto
  secundário, `#71717A`). `--accent` vira o azul do Figma (`#3672F2`).
- As 11 ocorrências de `bg-muted` (9 arquivos) viram `bg-secondary`, que no shadcn tem o mesmo valor.
  Assim as telas não migradas não mudam de cor.
- `shared/lib/toast.ts`: a mesma API (`toast.success`, `toast.error`) passa a chamar o Toast do HeroUI
  (`toast.success` e `toast.danger`). `main.tsx` monta o `Toast.Provider` no lugar do `Toaster`. Saem
  `shared/ui/sonner.tsx` e a dependência `sonner`.

### Composições compartilhadas (`shared/ui`)
- `figma-icons.tsx`: ícones de traço 1px extraídos da geometria do Figma: seta do cabeçalho, seta de
  editável, transferir, olho, editar, calendário, caixa de entrada, anterior e próxima. Cada um usa
  `currentColor` e `aria-hidden`.
- `data-table.tsx`: composição sobre o `Table` do HeroUI com a moldura `#F3F5F7`, o corpo branco, o
  cabeçalho com divisórias e as linhas de 40px. Recebe colunas, linhas, `selectionMode` e `disabledKeys`
  opcionais, estado (carregando, erro, vazio) e a paginação.
- `data-table-filter.tsx`: filtro de coluna (texto, opções com busca e data) num `Popover` do HeroUI, com
  as mesmas regras do `TableColumnFilter` atual.
- `data-table-pagination.tsx`: total à esquerda, seletor de itens por página discreto, e "Anterior",
  números e "Próxima" à direita, com o `Pagination` do HeroUI. Usa `DEFAULT_TABLE_PAGE_SIZE` e
  `TABLE_PAGE_SIZE_OPTIONS`, que passam a morar num módulo sem dependência de UI
  (`shared/lib/paginacao.ts`), reexportado por `table.tsx`.
- `row-action-button.tsx`: botão redondo de 19px `#EFEFF0`, com ícone e `aria-label` "<ação>
  <identificador>". Um `Tooltip` mostra o rótulo. A variante destrutiva usa a cor `danger`.
- `tag-chip.tsx`: `Chip` com as cores da referência visual. O mapa de status fica em
  `modules/projetos/components/status-chip-estilos.ts`, e o de ativo/inativo fica no próprio
  `tag-chip.tsx`.
- `inline-select.tsx`: `Select` do HeroUI cujo gatilho é a etiqueta mais a seta `#D0D0D0`, para a edição
  na linha.
- `side-drawer.tsx`: `Drawer` do HeroUI à direita, com cabeçalho, corpo rolável e rodapé de ações, no
  lugar do `DrawerContent` atual.
- `alert-confirm.tsx`: `AlertDialog` do HeroUI com a mesma API do `ConfirmDialog` atual.
- `week-picker-hero.tsx`: o mesmo seletor de semana ISO, com o botão do Figma e um `Popover` do HeroUI.
  O calendário continua sendo o `react-day-picker`, que não é componente do shadcn e é o único que já
  seleciona a semana ISO. Só o invólucro muda.

### Telas
- `modules/times/TimesPage.tsx`: `DataTable` com filtros. Ações em botões de ícone: visualizar, gerenciar
  membros e inativar ou ativar. Os painéis de criar time e gerenciar membros e as confirmações passam para
  `SideDrawer` e `AlertConfirm`, com `Button`, `Input`, `Select` e `Label` do HeroUI.
- `modules/times/TimeDetalhePage.tsx`: sobretítulo "Visão geral do time", linha de dados no estilo do Figma
  e sem o botão de voltar do cabeçalho. `DataTable` de usuários e perfis. Os painéis e a confirmação
  passam para o HeroUI.
- `modules/projetos/ProjetoDetalhePage.tsx`: abas com o `Tabs` do HeroUI no estilo do Figma, botão de
  semana e `ProjetoSwitcher` com `Dropdown`. A aba Test Cases usa o `DataTable` com seleção, as etiquetas
  e o `InlineSelect`, e perde a coluna de numeração. A barra de ação em lote mostra "Transferir ao backup
  (N)". O painel de criar e editar Test Case passa para o HeroUI.
- `modules/projetos/hooks/useTransferirEmLote.ts` (novo): mutation que transfere os selecionados e devolve
  `{ transferidos, falhas: { tcId, motivo }[] }`. Invalida `["projetos"]` uma vez no fim.
- `modules/projetos/ProjetosEntradaPage.tsx` e `components/ProjetosDevEmptyState.tsx`: estado vazio do
  Figma, que ocupa o cartão inteiro.
- `modules/projetos/components/FormFactorTabela.tsx`, `FormFactorResultadosTabela.tsx`,
  `FormFactorManualDialog.tsx` e o botão de importar SDF: migram para as composições novas, com o mesmo
  comportamento.
- `modules/projetos/components/ProjetoSwitcher.tsx`, `CasosTesteEmptyState.tsx` e `StatusBadge.tsx`
  migram. `StatusBadge` continua só enquanto a lista de projetos do gerente, que está fora do escopo,
  ainda usar os estilos antigos.
- `core/i18n/resources.ts`: textos novos em en, pt-BR e ko: "Visão geral do time", ação em lote,
  confirmação, resultado da transferência, motivo da caixa desabilitada e "N total".
- `docs/tables-rules.md`: passa a descrever o padrão novo (moldura, cabeçalho sem caixa alta, etiquetas,
  ações sempre em ícone e paginação com números).

## Critérios de aceite → testes
| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade | `ProjetoDetalhePage.test.tsx`: dev vê as etiquetas por status, sem coluna de numeração |
| CA-02 | Unidade | `ProjetoDetalhePage.test.tsx`: dev responsável tem seletor em Status, Difficulty e Category, e não em Situation |
| CA-03 | Unidade + e2e | `useTransferirEmLote.test.ts` (dois sucessos) e `e2e/projetos-dev.spec.ts` (seleciona, confirma, lista atualiza) |
| CA-04 | Unidade | `ProjetoDetalhePage.test.tsx`: caixa desabilitada com o motivo "sem backup" |
| CA-05 | Unidade | `useTransferirEmLote.test.ts`: um 409 vira falha com o TC ID; o aviso mostra 1 transferido e 1 falha |
| CA-06 | Unidade | `ProjetoDetalhePage.test.tsx`: trocar de página limpa a seleção (a tela é dona da seleção; o `DataTable` só marca as linhas visíveis) |
| CA-07 | Unidade | `ProjetosEntradaPage.test.tsx`: estado vazio com título e texto |
| CA-08 | Unidade | `ProjetosEntradaPage.test.tsx`: erro mostra "Tentar novamente" e não o vazio |
| CA-09 | Unidade | `TimesPage.test.tsx`: dev vê o botão "Visualizar time <nome>" e nenhum menu "…" |
| CA-10 | Unidade | `TimeDetalhePage.test.tsx`: sobretítulo, linha de dados e listagem |
| CA-11 | Unidade | `TimeDetalhePage.test.tsx`: time inexistente mostra "Time não encontrado" |
| CA-12 | Unidade | `TimesPage.test.tsx`: admin vê visualizar, gerenciar e inativar, nessa ordem |
| CA-13 | Unidade | `data-table-pagination.test.tsx`: página 2 e troca para 50 chamam os callbacks; o total fica visível |

## Riscos e decisões pendentes
- **Tokens:** o tema do HeroUI fica na camada `theme`, e os tokens do `global.css` ficam fora de camada.
  Por isso os nossos valores vencem. Ainda assim, um componente shadcn pode mudar de cor sem querer. Na
  fase 1, as telas não migradas são conferidas no navegador, em modo mock.
- **Testes de componentes:** o React Aria monta outro markup (gatilho do `Select`, `role="grid"` na
  `Table`). Os testes das telas migradas mudam de seletores. Os de telas não migradas não podem mudar.
- **E2E:** o Playwright não tem o Chromium baixado nesta máquina. Rodar `npx playwright install chromium`
  antes da fase de e2e.
- **Fonte da busca no topo:** o Figma usa "Momo Trust Sans" no placeholder da busca. Como o topo está fora
  do escopo, ela não entra agora.
- **Tamanho do bundle:** durante a migração, as duas bibliotecas vão juntas. O aviso de chunk acima de
  500 kB já existia, e vamos conferir o tamanho no fim da fase 1.
