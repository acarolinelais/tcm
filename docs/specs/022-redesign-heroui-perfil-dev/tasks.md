# 022. Redesign das telas de Projects e Teams no padrão HeroUI: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: fundação HeroUI (tema, toast e composições)

- [x] **T01. Tokens únicos e CSS do HeroUI**
  - Arquivos: `frontend/src/core/global.css` e os 9 arquivos com `bg-muted` (viram `bg-secondary`)
  - Cobre: base de todos os CAs
  - Verificação: `cd frontend && npm run build && npm test` → verde. Em modo mock, as telas de Usuários e
    Overview mantêm as cores de antes (conferência visual).
- [x] **T02. Toast do HeroUI no lugar do sonner**
  - Arquivos: `frontend/src/shared/lib/toast.ts` e o teste dele, `frontend/src/main.tsx`,
    `frontend/src/shared/ui/sonner.tsx` (sai), `frontend/package.json` (sai `sonner`)
  - Cobre: CA-03, CA-05 (avisos)
  - Verificação: `cd frontend && npm test -- toast && npm run build` → verde. `toast.error` chama a variante
    `danger`.
- [x] **T03. Ícones do Figma e etiquetas**
  - Arquivos: `frontend/src/shared/ui/figma-icons.tsx`, `frontend/src/shared/ui/tag-chip.tsx` e o teste
    dele, `frontend/src/modules/projetos/components/status-chip-estilos.ts`
  - Cobre: CA-01, CA-09
  - Verificação: `cd frontend && npm test -- tag-chip` → verde. Cada status, a situação, ativo e inativo
    usam as cores da referência visual, e o rótulo sempre aparece.
- [x] **T04. Paginação e botão de ação**
  - Arquivos: `frontend/src/shared/lib/paginacao.ts`, `frontend/src/shared/ui/data-table-pagination.tsx`,
    `frontend/src/shared/ui/row-action-button.tsx` e os testes deles, `frontend/src/shared/ui/table.tsx`
    (reexporta as constantes)
  - Cobre: CA-13, CA-12 (base)
  - Verificação: `cd frontend && npm test -- data-table-pagination row-action-button` → verde. Ir para a
    página 2 e trocar para 50 itens chamam os callbacks. "Anterior" fica desabilitado na página 1. O
    botão de ação tem o `aria-label` "<ação> <identificador>".
- [x] **T05. `DataTable` com filtros, seleção e estados**
  - Arquivos: `frontend/src/shared/ui/data-table.tsx`, `frontend/src/shared/ui/data-table-filter.tsx`,
    `frontend/src/shared/ui/inline-select.tsx` e os testes deles
  - Cobre: CA-04 (base), CA-06 (base)
  - Verificação: `cd frontend && npm test -- data-table inline-select` → verde. O filtro de texto e o de
    opções chamam `onChange`. Uma linha em `disabledKeys` não é selecionada. A caixa do cabeçalho marca só
    as linhas habilitadas. Trocar de página limpa a seleção. Carregando, erro e vazio aparecem no lugar
    do corpo.
- [x] **T06. Painel lateral, confirmação e seletor de semana**
  - Arquivos: `frontend/src/shared/ui/side-drawer.tsx`, `frontend/src/shared/ui/alert-confirm.tsx`,
    `frontend/src/shared/ui/week-picker-hero.tsx` e os testes deles
  - Cobre: CA-03 (confirmação)
  - Verificação: `cd frontend && npm test -- side-drawer alert-confirm week-picker-hero && npm run lint` →
    verde. Esc fecha o painel e a confirmação. Confirmar chama `onConfirm`. Escolher um dia seleciona a
    semana ISO.

## Fase 2: Teams

- [x] **T07. Lista de Teams no padrão novo**
  - Arquivos: `frontend/src/modules/times/TimesPage.tsx`, `TimesPage.test.tsx`,
    `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-09, CA-12, CA-13
  - Verificação: `cd frontend && npm test -- TimesPage` → verde. O dev vê o botão "Visualizar time
    <nome>" e nenhum menu. O admin vê visualizar, gerenciar membros e inativar, nessa ordem. Criar time e
    gerenciar membros continuam funcionando nos painéis novos.
- [x] **T08. Visualizar Team no padrão novo**
  - Arquivos: `frontend/src/modules/times/TimeDetalhePage.tsx`, `TimeDetalhePage.test.tsx`,
    `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-10, CA-11
  - Verificação: `cd frontend && npm test -- TimeDetalhePage` → verde. Aparecem o sobretítulo "Visão geral
    do time", setor, status e membros. Um time inexistente mostra "Time não encontrado". Editar time,
    adicionar membro e remover membro continuam funcionando.

## Fase 3: Projects (Test Cases e estado vazio)

- [x] **T09. Transferência em lote**
  - Arquivos: `frontend/src/modules/projetos/hooks/useTransferirEmLote.ts` e o teste dele
  - Cobre: CA-03, CA-05
  - Verificação: `cd frontend && npm test -- useTransferirEmLote` → verde. Dois sucessos devolvem
    `transferidos: 2`. Um 409 vira falha com o TC ID. `["projetos"]` é invalidado uma vez.
- [x] **T10. Cabeçalho do projeto: seletor de projeto, semana e abas**
  - Arquivos: `frontend/src/modules/projetos/components/ProjetoSwitcher.tsx` e o teste dele,
    `frontend/src/modules/projetos/ProjetoDetalhePage.tsx`
  - Cobre: CA-01
  - Verificação: `cd frontend && npm test -- ProjetoSwitcher ProjetoDetalhePage` → verde. As abas trocam
    com clique e com as setas do teclado. A semana filtra.
- [x] **T11. Aba Test Cases com etiquetas, edição na linha, seleção e ação em lote**
  - Arquivos: `frontend/src/modules/projetos/ProjetoDetalhePage.tsx`, `ProjetoDetalhePage.test.tsx`,
    `frontend/src/modules/projetos/components/CasosTesteEmptyState.tsx`,
    `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-01, CA-02, CA-03, CA-04, CA-05, CA-06
  - Verificação: `cd frontend && npm test -- ProjetoDetalhePage` → verde. Não há coluna de numeração. O dev
    edita Status, Difficulty e Category, e não Situation. Uma linha sem backup tem a caixa desabilitada
    com o motivo. Confirmar a ação em lote mostra o aviso com transferidos e falhas.
- [x] **T12. Painel de criar e editar Test Case**
  - Arquivos: `frontend/src/modules/projetos/ProjetoDetalhePage.tsx`, `ProjetoDetalhePage.test.tsx`
  - Cobre: RN-01 (comportamento mantido)
  - Verificação: `cd frontend && npm test -- ProjetoDetalhePage` → verde. Criar e editar enviam só os
    campos alterados, como hoje.
- [x] **T13. Projects vazio**
  - Arquivos: `frontend/src/modules/projetos/ProjetosEntradaPage.tsx`, `ProjetosEntradaPage.test.tsx`,
    `frontend/src/modules/projetos/components/ProjetosDevEmptyState.tsx` e o teste dele
  - Cobre: CA-07, CA-08
  - Verificação: `cd frontend && npm test -- ProjetosEntradaPage ProjetosDevEmptyState` → verde.

## Fase 4: aba Form Factor

- [x] **T14. Tabelas de resumo e de resultados do Form Factor**
  - Arquivos: `frontend/src/modules/projetos/components/FormFactorTabela.tsx`,
    `FormFactorResultadosTabela.tsx` e os testes deles
  - Cobre: RN-01 (comportamento mantido)
  - Verificação: `cd frontend && npm test -- FormFactorTabela FormFactorResultadosTabela` → verde.
- [x] **T15. Lançamento manual, importação SDF e alternância Summary/Results**
  - Arquivos: `frontend/src/modules/projetos/components/FormFactorManualDialog.tsx` e o teste dele,
    `frontend/src/modules/projetos/ProjetoDetalhePage.tsx`
  - Cobre: RN-01 (comportamento mantido)
  - Verificação: `cd frontend && npx tsc -b && npm test && npm run lint` → verde. A página do projeto não
    importa mais nada de `shared/ui` em shadcn (`grep` nos imports).

## Fase 5: e2e e documentação

- [ ] **T16. E2E do dev em Projects e Teams**
  - Arquivos: `frontend/e2e/projetos-dev.spec.ts`, `frontend/e2e/times.spec.ts` e os e2e existentes que
    tocam essas telas
  - Cobre: CA-03, CA-07, CA-09, CA-10
  - Verificação: `cd frontend && npx playwright install chromium && npm run e2e` → verde.
  - Situação (2026-10-27): os e2e simulados (`form-factor`, `projetos`) passam. `projetos-dev` e `times`
    compilam, mas não rodaram: precisam de API e banco dedicados (ver backlog).
- [x] **T17. Regras de tabela atualizadas**
  - Arquivos: `docs/tables-rules.md`, `.claude/skills/react-crud/SKILL.md` (se citar o padrão antigo)
  - Cobre: RN-02 a RN-08
  - Verificação: leitura. O documento descreve a moldura, as etiquetas, as ações em ícone, a paginação
    com números e a seleção com ação em lote.

## Backlog
- **Locale do calendário em um lugar só** (simplify, fase 1). `week-picker-hero.tsx` repete a escolha de
  locale do `react-day-picker` e o cálculo da semana de `calendar.tsx` e `week-picker.tsx`. Extrair
  `localeDayPicker(idioma)` e `useSemanaIso(valor)` mexe nos componentes shadcn, que pelo ADR 0037 só mudam
  por defeito. Fazer quando o `week-picker.tsx` antigo sair (`ResultadosGeraisPage` migrar).
- **Busca de opções compartilhada** (simplify, fase 1). `data-table-filter.tsx` copia de
  `table-column-filter.tsx` a regra de busca (`label + searchText`) e o tipo da opção. Subir
  `opcaoCombinaBusca` para `shared/lib` exige alterar o filtro shadcn. Fazer junto com o item acima ou
  quando o filtro antigo sair.
- **Token para o texto `#454442`** (simplify, fase 1). A cor de texto principal do Figma aparece literal em
  vários componentes novos. Um token no `:root` (ex.: `--texto`) é uma decisão de tema para todas as telas.
- **CSS do HeroUI inteiro no bundle** (fase 1). `global.css` importa `@heroui/styles/components/index.css`,
  e o CSS passou de cerca de 100 kB para 480 kB (49 kB com gzip). Importar só o CSS dos componentes usados
  reduz o tamanho, mas cada componente novo passaria a exigir um import.
- **Base comum dos ícones do Figma e constante do botão de rodapé** (simplify, fase 1). Ganho cosmético:
  `FigmaSvg` cortaria cerca de 30 linhas em `figma-icons.tsx`, e `botaoRodape` se repete em dois arquivos.
- **`rotuloPerfil` nos outros módulos** (simplify, fase 2). A regra "catálogo traduz o perfil seedado; os
  demais mostram o nome salvo" está em `shared/lib/perfil.ts`, mas `UsuariosTable`, `UsuarioForm`,
  `PerfisPage` e `OverviewPage` ainda a repetem. Trocar quando essas telas migrarem.
- **Painel de Test Case com react-hook-form + zod** (simplify, fase 3). O `CasoTesteDrawer` valida à mão
  (`camposFaltando`), como o formulário original fazia. O ADR 0009 pede react-hook-form + zod em formulários;
  a troca muda a validação e as mensagens, então fica para uma task própria.
- **Mesma API de filtros nas duas tabelas de Form Factor** (simplify, fase 4). O resumo recebe oito props
  avulsas (`assignee`, `tcId`, `sdfId`, `modeloDispositivoId`...) e o histórico recebe `filtros` +
  `onFiltroChange`; a página mantém `assigneeFormFactor` à parte de `filtrosResumo`. Igualar as duas para
  `filtros` + `onFiltroChange` encurta a chamada na `ProjetoDetalhePage`. Mexe só em props, sem mudar o
  comportamento.
- **Rodar os e2e com API real** (T16, fechamento em 2026-10-27). `projetos-dev.spec.ts` (inclui o lote, CA-03)
  e `times.spec.ts` (CA-09 a CA-11) criam dados pela API: rodar num banco dedicado com `SDF_E2E_ADMIN_PASSWORD`
  definido (`cd frontend && npx playwright test e2e/projetos-dev.spec.ts e2e/times.spec.ts`) e marcar a T16.
