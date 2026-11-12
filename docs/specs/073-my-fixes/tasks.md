# 073. Aba My Fixes e fluxo de correção: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: Domínio e banco
- [x] **T01. Tentativa e End Date da correção no `CasoTeste`**
  - Arquivos: `backend/src/domain/entities/caso_teste.py`, `backend/tests/unit/test_caso_teste.py`
  - Cobre: CA-01, CA-03, CA-04, CA-05, CA-09
  - O que faz: `tentativa_correcao` sobe em In Validation → In Fixes (`aplicar_resultado_sdf` e
    `registrar_resultado_form_factor`) e desce em `desfazer_resultado_sdf`; `correcao_em_revisao_em` gravado em In
    Review com tentativa > 0 e zerado em In Fixes; `mudar_status_da_correcao` recusa Status fora dos quatro e caso
    fora de correção.
  - Verificação: `cd backend && uv run pytest tests/unit/test_caso_teste.py` → verde
- [x] **T02. Colunas, models e migration com backfill**
  - Arquivos: `backend/src/domain/entities/execucao_sdf.py`, `backend/src/infrastructure/data/models/*`,
    `backend/src/infrastructure/repositories/caso_teste_repository.py`, `execucao_sdf_repository.py`, migration Alembic
  - Cobre: CA-01, CA-04 (persistência)
  - Verificação: `cd backend && uv run alembic heads` → um head; `uv run pytest tests/integration -k "caso_teste or execucao_sdf"` → verde

## Fase 2: Backend da My Fixes
- [x] **T03. Tentativa gravada na execução do SDF e na rodada manual**
  - Arquivos: `backend/src/application/services/importacao_sdf_service.py`, `form_factor_service.py` e testes
  - Cobre: CA-04, CA-06
  - Verificação: `cd backend && uv run pytest tests -k "importacao_sdf or form_factor"` → verde
- [x] **T04. Consulta da My Fixes e filtro Reincidentes**
  - Arquivos: `backend/src/infrastructure/repositories/bug_report_repository.py`,
    `backend/tests/integration/test_bug_report_repository.py`
  - Cobre: CA-01, CA-02, CA-05, CA-07, CA-11
  - Verificação: `cd backend && uv run pytest tests/integration -k "bug_report or my_fixes"` → verde
- [x] **T05. Service, schemas e rotas (listar e mudar Status da correção)**
  - Arquivos: `backend/src/application/services/my_fixes_service.py`, `caso_teste_service.py`,
    `backend/src/application/schemas/*`, `backend/src/api/routers/projetos.py`, `test_cases.py`, `bug_reports.py`,
    `backend/src/api/dependencies.py`, `backend/tests/functional/test_my_fixes_api.py`
  - Cobre: CA-03, CA-08, CA-09, CA-11
  - Verificação: `cd backend && uv run pytest tests/functional/test_my_fixes_api.py tests/functional -k bug_report` → verde

## Fase 3: Frontend
- [x] **T06. API, hooks e modo mock**
  - Arquivos: `frontend/src/modules/projetos/api/*`, `frontend/src/modules/projetos/hooks/*`,
    `frontend/src/modules/bug-reports/api/*`, `frontend/src/core/mock/database.ts` e testes
  - Cobre: CA-01 a CA-05, CA-11 (no modo mock)
  - Verificação: `cd frontend && npx vitest run src/core/mock src/modules/projetos/api src/modules/bug-reports` → verde
- [x] **T07. Selo de tentativa e filtro Reincidentes na SDF Failures**
  - Arquivos: `frontend/src/shared/ui/selo-tentativa.tsx`, `frontend/src/modules/bug-reports/pages/BugReportsPage.tsx`,
    testes, `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-04, CA-11
  - Verificação: `cd frontend && npx vitest run src/shared/ui src/modules/bug-reports` → verde
- [x] **T08. Aba My Fixes com a tabela, o Status da correção e o painel de falhas**
  - Arquivos: `frontend/src/modules/projetos/pages/ProjetoDetalhePage.tsx`,
    `frontend/src/modules/projetos/components/my-fixes/MyFixesTab.tsx`, `FalhasDoCasoDrawer.tsx`, seletor de Status
    da correção, testes, `frontend/src/core/i18n/resources.ts`, `docs/adr/0054-*` ("My Fixes" no glossário)
  - Cobre: CA-03, CA-06, CA-09, CA-10
  - Verificação: `cd frontend && npx vitest run src/modules/projetos src/core/i18n` → verde

## Fase 4: e2e e fechamento
- [x] **T09. e2e do fluxo de correção**
  - Arquivos: `frontend/e2e/my-fixes.spec.ts`
  - Cobre: CA-01 a CA-05, CA-08
  - Verificação: `cd frontend && npx playwright test e2e/my-fixes.spec.ts` → verde (API simulada pelas rotas, como os
    outros e2e de projetos)
- [x] **T10. Suítes, lint e build**
  - Verificação: `cd backend && uv run ruff check . && uv run pytest`; `cd frontend && npm run lint && npm test && npm run build` → verde

## Backlog
- Os dois e2e de pull request em `e2e/projetos.spec.ts` (abrir o painel pela aba Form Factor) falham também na `dev`:
  simulam a rota antiga `/api/projetos/{id}/form-factor`, mas a aba lê o histórico da General Results (spec 068), e o
  botão do TC ID some do DOM a cada nova tentativa da consulta. Atualizar as rotas simuladas do teste.
- Desfazer a importação do SDF que abriu uma tentativa desconta a tentativa, mas não devolve a End Date da correção
  da tentativa anterior (ela foi apagada ao entrar em In Fixes). Raro; só a data de exibição se perde.
