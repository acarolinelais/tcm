# 059. Redesign da General Results: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> O backend roda em `backend/` (`uv run pytest ...`); o frontend, em `frontend/`, com caminhos relativos a
> `frontend/src`. Referência visual: as imagens em [`figma/`](figma/), tema claro.

## Fase 1: backend da General Results

- [x] **T01. O dev consulta o histórico do projeto**
  - Arquivos: `backend/src/application/services/form_factor_service.py`,
    `backend/tests/unit/application/services/test_form_factor_historico.py`,
    `backend/tests/functional/test_form_factor_geral_api.py`
  - O que muda: `historico_projeto` passa a usar `_exigir_consulta_execucoes`; `_exigir_consulta_resultados_gerais`
    sai. O teste de hoje que afirma 403 para o dev no histórico vira sucesso. Testes novos: dev 200 no projeto do
    time; dev 404 em projeto de outro time; dev sem `form_factor.consultar` 403; KP 404 em outro time; admin
    consulta projetos de setores diferentes.
  - Cobre: CA-01, CA-02, CA-03, CA-04
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_form_factor_historico.py
    tests/functional/test_form_factor_geral_api.py` → verde.
- [ ] **T02. No máximo 5 datas (ADR 0046)** (código e testes prontos; falta rodar a integração)
  - Arquivos: `form_factor_service.py` (constante `LIMITE_DATAS_RESULTADOS_GERAIS = 5`, passada a `listar_datas`),
    `infrastructure/repositories/historico_form_factor_repository.py` (o `limite` deixa de ter padrão 7),
    `tests/integration/test_historico_form_factor_repository.py`, `tests/unit/.../test_form_factor_historico.py`
  - O que muda: com 8 datas, a resposta traz as 5 mais recentes, da mais nova para a mais antiga. Os testes que
    contavam 7 passam a contar 5.
  - Cobre: CA-15
  - Verificação: `uv run pytest tests/unit/application/services/test_form_factor_historico.py
    tests/integration/test_historico_form_factor_repository.py` → verde (precisa do Docker).
- [ ] **T03. Filtros Assignee e SDF ID no lugar da busca** (código e testes prontos; falta rodar a integração)
  - Arquivos: `domain/queries/historico_form_factor.py`, `domain/entities/interfaces/historico_form_factor_repository.py`,
    `infrastructure/repositories/historico_form_factor_repository.py`, `application/services/form_factor_service.py`,
    `application/services/interfaces/form_factor_service.py`, `api/routers/form_factor_geral.py`, os testes de
    integração, unidade e funcional do histórico
  - O que muda: `FiltrosCasoHistorico` troca `busca` por `responsavel` e `sdf_id`; `_filtros_casos` filtra
    `UsuarioModel.user_id.ilike` e `existe(ExecucaoSdfModel.sdf_id.ilike)`; o router recebe `responsavel` e
    `sdf_id` (máx. 100) e não recebe mais `busca`. Testes: `responsavel` acha o caso do tester e não acha o de outro;
    `sdf_id` acha o caso pelo SDF do terceiro device; os dois filtros também limitam as datas; `busca` na query é
    ignorada.
  - Cobre: CA-17
  - Verificação: `uv run pytest tests/integration/test_historico_form_factor_repository.py
    tests/functional/test_form_factor_geral_api.py tests/unit/application/services/test_form_factor_historico.py`
    → verde.
- [ ] **T04. SDF ID da última execução de cada device** (código e testes prontos; falta rodar a integração)
  - Arquivos: o repositório e a interface do histórico (`listar_modelos_da_ultima_execucao` vira
    `listar_ultimo_sdf_por_modelo`), `form_factor_service.py` (sai o cálculo de `destacados` e de `modelo_padrao`),
    `application/schemas/form_factor_historico.py` e o mapper `to_historico_response`, os testes do histórico
  - O que muda: cada item ganha `ultimo_sdf_por_modelo`; saem `modelo_padrao_id` e `modelo_destacado_id`. Testes:
    um caso com execuções em datas diferentes por device devolve o SDF da mais recente de cada um, mesmo fora das 5
    datas; um device sem execução fica fora do dicionário; em empate na data, vale a ordem de gravação, como hoje.
  - Cobre: CA-14
  - Verificação: `uv run pytest tests/integration/test_historico_form_factor_repository.py
    tests/unit/application/services/test_form_factor_historico.py tests/functional/test_form_factor_geral_api.py`
    → verde; `uv run ruff check src tests` limpo.
- [x] **T05. O dev continua recusado ao criar rodada e importar**
  - Arquivos: `backend/tests/functional/test_form_factor_geral_api.py` (ou o funcional de rodadas e de relatório SDF,
    onde os testes de permissão já estão)
  - O que muda: só testes. O dev com `form_factor.registrar` recebe 403 em `POST .../form-factor/rodadas` e em
    `POST .../relatorios-sdf`, e a contagem de rodadas e de execuções não muda. O resumo de execuções de um caso fora
    do escopo dá 404 para o dev.
  - Cobre: CA-07, CA-19
  - Verificação: `uv run pytest tests/functional` → verde.

## Fase 2: frontend, contrato e navegação

- [x] **T06. Contrato novo no model, na API e no mock**
  - Arquivos: `modules/projetos/model/projeto.ts`, `modules/projetos/api/projetos.api.ts` e `.test.ts`,
    `modules/projetos/hooks/useProjetos.test.tsx`, `core/mock/database.ts` e `.test.ts`
  - O que muda: `FiltrosHistoricoProjeto` troca `busca` por `responsavel` e `sdfId` (enviados como `responsavel` e
    `sdf_id`); `CasoHistorico` troca `modelo_padrao_id` por `ultimo_sdf_por_modelo`; sai `modelo_destacado_id`. O
    mock segue o backend: filtros novos, 5 datas, `ultimo_sdf_por_modelo` e o dev consultando os projetos do time.
  - Cobre: CA-15, CA-17 (mock)
  - Verificação: `cd frontend && npm test -- projetos.api database useProjetos` → verde; `npx tsc -b` mostra só os
    erros das telas que as tasks seguintes ajustam.
- [x] **T07. Textos novos**
  - Arquivos: `core/i18n/resources.ts`, `core/i18n/resources.test.ts`
  - O que muda: `noProjectsToShow`, `noProjectsToShowHint`, `expandRow` e `collapseRow` (e `sdfId` e `assignee`, se
    ainda não existirem) em inglês, português e coreano, com o teste de presença.
  - Cobre: CA-20
  - Verificação: `npm test -- resources` → verde.
- [x] **T08. A General Results na navegação do dev**
  - Arquivos: `core/layout/Sidebar.tsx`, `core/layout/Sidebar.test.tsx`
  - O que muda: o item aparece para `USUARIO_PADRAO` com `form_factor.consultar`. O teste de hoje, que afirma que o
    dev não vê o item, passa a afirmar que vê; o dev sem a permissão continua sem o item.
  - Cobre: CA-01
  - Verificação: `npm test -- Sidebar` → verde.
- [x] **T09. Ícone novo da General Results** (`figma/general-results-icon.svg`)
  - Arquivos: `core/layout/sidebar-icons.tsx`
  - O que muda: o desenho do `GeneralResultsIcon` passa a ser o do design (tabela com lupa), em `currentColor`, no
    mesmo tamanho dos outros ícones do sidebar.
  - Cobre: RN-17
  - Verificação: `npm test -- Sidebar` → verde; conferência visual com `figma/General Results Empty (todos os
    perfis).png`.

## Fase 3: botões de gerência

- [x] **T10. Componente com Import SDF Report e Create test round**
  - Arquivos: `modules/projetos/components/form-factor/AcoesGerenciaFormFactor.tsx` (novo) e `.test.tsx` (novo)
  - O que muda: o `input` de arquivo, a mutação de importação, o botão de criar rodada e o `FormFactorCriarRodadaDialog`
    saem da `ProjetoDetalhePage` para cá, com as mesmas regras (`perfilGestao` e a permissão de cada botão) e as
    mesmas mensagens. A importação também invalida `["form-factor", "historico", projetoId]`. Testes: gerente e KP
    veem os dois botões; o dev com `form_factor.registrar` não vê nenhum; criar rodada mostra "Test round created";
    importar chama a API e invalida o histórico; um erro da API aparece no toast.
  - Cobre: CA-05, CA-06, CA-08, CA-09, CA-10
  - Verificação: `npm test -- AcoesGerenciaFormFactor` → verde.
- [x] **T11. A aba Form Factor sem os dois botões**
  - Arquivos: `modules/projetos/pages/ProjetoDetalhePage.tsx`, `modules/projetos/pages/ProjetoDetalhePage.test.tsx`
  - O que muda: saem os botões, a mutação, o `input`, o diálogo e os estados deles. A aba Form Factor passa a depender
    só de `podeConsultarFormFactor`. Os testes que clicavam em "Create test round" e "Import SDF report" na tela do
    projeto mudam para afirmar que eles não existem lá; o "Record result" continua para quem lança.
  - Cobre: CA-11
  - Verificação: `npm test -- ProjetoDetalhePage AcoesGerenciaFormFactor` → verde.

## Fase 4: a tela nova

- [x] **T12. Abas, título, ações e acesso do dev**
  - Arquivos: `modules/projetos/pages/ResultadosGeraisPage.tsx`, `modules/projetos/pages/ResultadosGeraisPage.test.tsx`
  - O que muda: `permitido` inclui o dev; o título é "General Results", com a descrição; sai o `ProjetoSwitcher` e
    entram as `PageTabs` com `projeto.app`, mantendo o `?projeto=` e a limpeza de filtros da 053; as ações das abas
    são o `AcoesGerenciaFormFactor` e o filtro Week; sai a busca; o estado vazio usa os textos novos, sem abas.
    Testes: o dev vê as abas dos projetos do time; `?projeto=` fora da lista abre o primeiro; `app: "Clock"` com
    `nome: "Clock 2.0"` mostra "Clock"; sem projetos, "No projects to show" sem abas e sem botões; trocar de aba
    limpa os filtros.
  - Cobre: CA-01, CA-02, CA-12, CA-20
  - Verificação: `npm test -- ResultadosGeraisPage` → verde.
- [x] **T13. Colunas e filtros da tabela**
  - Arquivos: `modules/projetos/components/resultados-gerais/HistoricoProjetoTabela.tsx` e `.test.tsx`,
    `ResultadosGeraisPage.tsx`
  - O que muda: as colunas na ordem TC ID, Assignee, Form Factor, SDF ID, datas e Actions. Assignee mostra o
    `responsavel_identificador`. Assignee e SDF ID têm filtro por texto e Form Factor por lista, como hoje. Sai o
    `InlineSelect` do device e saem `modeloDaLinha`, `onModeloChange` e as `escolhas` da página. Testes: a ordem das
    colunas; filtrar por SDF ID manda `sdfId` na consulta; filtrar por Assignee manda `responsavel`.
  - Cobre: CA-17
  - Verificação: `npm test -- HistoricoProjetoTabela ResultadosGeraisPage` → verde.
- [x] **T14. Linha que expande e recolhe**
  - Arquivos: `HistoricoProjetoTabela.tsx` e `.test.tsx`, `ResultadosGeraisPage.tsx` e `.test.tsx`
  - O que muda: a seta no TC ID (`aria-expanded`, rótulo "Expand/Collapse {tc}"). Recolhida, as células de Form
    Factor, SDF ID e data mostram o primeiro modelo do projeto; expandida, todos, empilhados na mesma altura. O SDF ID
    vem de `ultimo_sdf_por_modelo`. A página guarda os expandidos e os limpa ao trocar de página, de projeto ou de
    filtro. A exportação continua com o primeiro device. Testes: recolhida mostra 1 device e o SDF dele; expandida
    mostra os 4 com os seus SDF e resultados; Enter e Espaço na seta recolhem só aquela linha; trocar de página
    recolhe tudo.
  - Cobre: CA-14, CA-16
  - Verificação: `npm test -- HistoricoProjetoTabela ResultadosGeraisPage` → verde.
- [x] **T15. Histórico na coluna Actions**
  - Arquivos: `HistoricoProjetoTabela.tsx` e `.test.tsx`
  - O que muda: um `RowActions` por caso, com o `HistoryIcon` (`shared/ui/figma-icons.tsx`) e o rótulo
    `viewExecutionHistory`, abrindo o `ResumoExecucoesDrawer` que a página já tem. Teste: o ícone abre o painel do caso
    certo, também com a linha expandida.
  - Cobre: CA-18
  - Verificação: `npm test -- HistoricoProjetoTabela` → verde.
- [ ] **T16. Visual conferido com o design** (código conferido com a `table-rules`; falta a conferência no navegador)
  - Arquivos: os da fase, só ajustes de classe
  - O que muda: aplica as skills `table-rules` e `ui-density` e confere com as imagens de `figma/` as cores do título,
    das abas, dos botões, das etiquetas Pass e Fail e do cabeçalho da tabela, no tema claro e no escuro, usando só
    tokens semânticos (ADR 0041).
  - Cobre: RN-17
  - Verificação: `npm run lint && npx tsc -b && npm test` → verde; conferência manual no navegador registrada no
    relatório do bloco.

## Fase 5: e2e

- [x] **T17. Fluxos de ponta a ponta**
  - Arquivos: `frontend/e2e/resultados-gerais.spec.ts`
  - O que muda: o teste que trocava de projeto pelo seletor passa a usar as abas. Novos: um gerente cria uma rodada e
    importa um relatório pela General Results; uma linha expande e recolhe pelo teclado; o histórico abre pela coluna
    Actions; o dev vê a tela sem os botões; com 15 projetos, a última aba fica visível ao receber o foco.
  - Cobre: CA-08, CA-09, CA-13, CA-14, CA-18
  - Verificação: `npm run e2e -- resultados-gerais` → verde.

## Backlog

- O conjunto de perfis `{ADMIN_UNIDADE, GERENTE, KP, USUARIO_PADRAO}` aparece igual em `_exigir_consulta_execucoes` e `_pode_registrar` (`form_factor_service.py`). Dá para virar uma constante de módulo, mas `_pode_registrar` é de outra regra e fica fora da 059 (simplify da Fase 1).
- A descrição da permissão `form_factor.consultar` no backend ainda diz "Resultados Gerais para Administrador, Gerente e KP" (migration `b5c6d7e8f901`). Atualizar o texto pede uma migration nova; o mock já foi corrigido (simplify da Fase 2).
- Um gerente ou KP com `form_factor.importar` e sem `form_factor.consultar` perdeu o lugar de importar: a aba Form Factor só abre com `consultar` e a General Results também exige essa permissão. Nenhum perfil seedado tem essa combinação; se alguma unidade configurar assim, decidir se a importação pede `consultar` (simplify da Fase 3).
- No mock, `historicoProjeto` filtra as execuções uma vez por caso (O(casos × execuções)). Isso já era assim antes da 059; agrupar por `caso_teste_id` resolve, se o mock ficar lento (simplify da Fase 2).
