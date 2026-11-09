# 070. Bug Reports: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: backend

- [x] **T01. Resultados válidos de qualquer projeto**
  - Arquivos: `src/infrastructure/repositories/historico_form_factor_repository.py`
  - O que: `_resultados_validos` aceita uma expressão correlacionada (o projeto do caso da execução) além de um UUID; chamadas atuais iguais.
  - Verificação: `uv run pytest tests/integration/test_historico_form_factor_repository.py tests/integration/test_caso_teste_todos_aprovados.py -q` → verde
- [x] **T02. Consulta das falhas em aberto**
  - Arquivos: `src/domain/queries/bug_report.py`, `src/domain/entities/interfaces/bug_report_repository.py`,
    `src/infrastructure/repositories/bug_report_repository.py`, `tests/integration/test_bug_report_repository.py`
  - Cobre: CA-01 a CA-07, CA-12, CA-13, CA-15
  - Verificação: `uv run pytest tests/integration/test_bug_report_repository.py -q` → verde
- [x] **T03. Escopo compartilhado e service**
  - Arquivos: `src/application/services/overview_service.py` (`escopo_do_usuario`),
    `src/application/services/bug_report_service.py` e a interface, `src/application/schemas/bug_report.py`,
    `tests/unit/application/services/test_bug_report_service.py`
  - Cobre: CA-10 e a recusa sem permissão
  - Verificação: `uv run pytest tests/unit/application/services/test_bug_report_service.py tests/unit/application/services/test_overview_service.py -q` → verde
- [x] **T04. Rota `GET /api/bug-reports`**
  - Arquivos: `src/api/routers/bug_reports.py`, `src/api/dependencies.py`, `src/api/main.py`,
    `tests/functional/test_bug_reports_api.py`
  - Cobre: CA-01, CA-06 (200 com `PagedResult`, 401 sem sessão, 422 parâmetro inválido)
  - Verificação: `uv run pytest tests/functional/test_bug_reports_api.py -q` → verde; `uv run ruff check .` → sem erros

## Fase 2: frontend

- [x] **T05. Modelo, API, hook e modo mock**
  - Arquivos: `modules/bug-reports/model/bug-report.ts`, `api/bug-reports.api.ts`, `hooks/useBugReports.ts`,
    `core/mock/database.ts` e `core/mock/bug-reports.test.ts`
  - Cobre: base para CA-01 a CA-11
  - Verificação: `npx vitest run src/modules/bug-reports src/core/mock && npx tsc -b` → verde
- [x] **T06. Página Bug Reports com rota e item na sidebar**
  - Arquivos: `modules/bug-reports/pages/BugReportsPage.tsx` e teste, `routes.tsx`, `index.ts`, `core/router.tsx`,
    `core/layout/Sidebar.tsx` e teste, `core/layout/sidebar-icons.tsx`, `core/i18n/resources.ts`
  - Cobre: CA-01, CA-04, CA-06, CA-07, CA-10 (sem a ação), CA-11
  - Verificação: `npx vitest run src/modules/bug-reports src/core/layout && npm run lint && npx tsc -b` → verde
- [x] **T07. Trocar responsável pela linha**
  - Arquivos: `BugReportsPage.tsx` e teste (troca inline na célula Assignee, como na tabela de Test Cases)
  - Cobre: CA-08, CA-09, CA-14 (mensagem de recusa da API na tela)
  - Verificação: `npx vitest run src/modules/bug-reports && npm run lint && npx tsc -b` → verde

## Fase 3: e2e

- [ ] **T08. Fluxo do KP**
  - Arquivos: `frontend/e2e/bug-reports.spec.ts`
  - Cobre: CA-01, CA-08 (KP abre a página, vê a falha e troca o responsável)
  - Verificação: `npx playwright test e2e/bug-reports.spec.ts` → verde

## Backlog
- Extrair a janela de "resultado mais recente por caso + device" (`row_number` com `data_reportada`, ordem de
  gravação e id) para uma função ao lado de `_ordem_de_gravacao`, junto com a normalização `upper(trim())` do
  resultado. Hoje há três cópias: `bug_report_repository.py`, `_aprovados` em `caso_teste_repository.py` e
  `listar_ultimo_sdf_por_modelo` em `historico_form_factor_repository.py`. Com três consumidores,
  `_resultados_validos` e `_ordem_de_gravacao` deixam de ser privadas de fato. Mexe fora da spec 070 (simplify do
  bloco 1).
- Se o Bug Reports ficar lento para o admin (unidade inteira): a subconsulta correlacionada que acha o projeto do
  caso roda por linha dentro de `_resultados_validos`, e a contagem repete a janela. Medir antes de mexer; índice
  em `execucoes_sdf(caso_teste_id, data_reportada)` é o primeiro candidato (simplify do bloco 1).
- Opções do filtro de device: saem das falhas da página carregada, porque o catálogo de modelos exige gestão (o dev
  levaria 403). Com um device escolhido, o filtro só mostra ele; para trocar, volta em "All". Se incomodar, a API
  do Bug Reports pode devolver os devices com falha no escopo (simplify do bloco 2).
