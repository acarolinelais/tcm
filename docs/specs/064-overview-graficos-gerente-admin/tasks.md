# 064. Overview com gráficos para gerente e admin: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: backend
- [ ] **T01. Andamento por time e por setor no `resumir_time`**
  - Arquivos: `backend/src/domain/queries/resumo_overview.py`,
    `backend/src/infrastructure/repositories/overview_repository.py`,
    `backend/tests/integration/test_overview_repository.py`
  - Cobre: CA-01, CA-06, CA-11 (time ou setor fora do escopo não aparece)
  - Verificação: `cd backend && uv run pytest tests/integration/test_overview_repository.py` → verde
- [ ] **T02. Em correção por projeto e Pass Rate por projeto no `resumir_time`**
  - Arquivos: `backend/src/domain/queries/resumo_overview.py`,
    `backend/src/infrastructure/repositories/overview_repository.py`,
    `backend/tests/integration/test_overview_repository.py`
  - Cobre: CA-02, CA-04 (só a rodada mais recente), CA-08 (unidade inteira), CA-10 (projeto sem rodada fica fora)
  - Verificação: `uv run pytest tests/integration/test_overview_repository.py` → verde
- [x] **T03. Campos novos no schema e no `obter_time`**
  - Arquivos: `backend/src/application/schemas/overview.py`,
    `backend/src/application/services/overview_service.py`,
    `backend/tests/unit/application/services/test_overview_service.py`, `backend/tests/functional/test_overview_api.py`
  - Cobre: CA-03, CA-07 e CA-11 (o escopo do gerente e do admin que chega ao repositório)
  - Verificação: `uv run pytest tests/unit/application/services/test_overview_service.py tests/functional/test_overview_api.py`
    → verde; `uv run python -m alembic heads` → um head só, sem migration nova

## Fase 2: frontend
- [x] **T04. Campos novos no modelo, na API e no mock**
  - Arquivos: `frontend/src/modules/overview/model/overview.ts`, `api/overview.api.ts`, `api/overview.mock.ts`,
    `api/overview.api.test.ts`
  - Cobre: RN-06 da spec 063 (modo de demonstração) para os campos novos
  - Verificação: `cd frontend && npx vitest run src/modules/overview` → verde
- [x] **T05. `BarrasEmpilhadas` e o `rotulo` opcional da barra**
  - Arquivos: `frontend/src/modules/overview/components/graficos/BarrasEmpilhadas.tsx`, `estilo.ts`,
    `BarrasHorizontais.tsx`, `graficos.test.tsx`
  - Cobre: CA-01 e CA-06 (o desenho do andamento), CA-03 (o "4 (44%)" na ponta)
  - Verificação: `npx vitest run src/modules/overview` → verde; `npm run lint` → sem erros (cores só por token)
- [x] **T06. `PassRatePorModelo` com o `useProjetoEscolhido`, usado pelo KP**
  - Arquivos: `frontend/src/modules/overview/components/PassRatePorModelo.tsx`, `OverviewKp.tsx`,
    `OverviewKp.test.tsx`
  - Cobre: CA-05 e CA-10 (as mesmas regras do KP, sem regressão nos testes dele)
  - Verificação: `npx vitest run src/modules/overview` → verde, com os testes do KP sem mudança de comportamento
- [x] **T07. Visão do gerente**
  - Arquivos: `frontend/src/modules/overview/components/OverviewGerente.tsx`, `OverviewGerente.test.tsx`,
    `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-01, CA-02, CA-03, CA-05, CA-09, CA-10
  - Verificação: `npx vitest run src/modules/overview` → verde
- [x] **T08. Visão do admin**
  - Arquivos: `frontend/src/modules/overview/components/OverviewAdmin.tsx`, `OverviewAdmin.test.tsx`,
    `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-06, CA-07, CA-08
  - Verificação: `npx vitest run src/modules/overview` → verde
- [x] **T09. `OverviewPage` com as quatro visões e a saída dos gráficos da spec 039**
  - Arquivos: `frontend/src/modules/overview/pages/OverviewPage.tsx`, `OverviewPage.test.tsx`; remover
    `TotalTcsDonePieChart.tsx`, `TeamPerformanceChart.tsx` e as chaves de i18n que só eles usavam
  - Cobre: visão por perfil (gerente e admin), RN-11 (cards de totais continuam)
  - Verificação: `npx vitest run` → verde; `npm run lint` → sem erros; `npm run build` → o Recharts fora do chunk
    principal

## Fase 3: e2e
- [x] **T10. e2e do gerente e do admin**
  - Arquivos: `frontend/e2e/overview-graficos.spec.ts`
  - Cobre: CA-05 (trocar de projeto no Pass Rate por modelo), axe nos cartões, andamento visível para os dois perfis
  - Verificação: `npm run e2e -- overview-graficos` → verde

## Fase 4: cabeçalho do admin (ajuste de 2026-11-06)
- [x] **T11. Em andamento por projeto no `resumir_time` e no `DoneProjetoResponse`**
  - Arquivos: `backend/src/domain/queries/resumo_overview.py`,
    `backend/src/infrastructure/repositories/overview_repository.py`, `backend/src/application/schemas/overview.py`,
    `backend/src/application/services/overview_service.py` e os testes de integração, unidade e funcionais
  - Cobre: CA-12 (os 16 em andamento)
  - Verificação: `cd backend && uv run pytest` → verde
- [x] **T12. Cabeçalho do admin com saudação, frase, seletor e os três cards**
  - Arquivos: `frontend/src/modules/overview/components/OverviewAdmin.tsx`, `OverviewAdmin.test.tsx`,
    `pages/OverviewPage.tsx`, `OverviewPage.test.tsx`, `model/overview.ts`, `api/overview.api.ts`,
    `api/overview.mock.ts`, `frontend/src/core/i18n/resources.ts`, `frontend/e2e/overview-graficos.spec.ts`
  - Cobre: CA-12, CA-13
  - Verificação: `cd frontend && npx vitest run src/modules/overview` e `npm run e2e -- overview-graficos` → verde

## Backlog
- `rodadas_form_factor` não tem índice em `(unidade_id, projeto_id, created_at)`. O `DISTINCT ON` do Pass Rate por
  projeto e o `pass_rate_ultima_rodada` ordenam a tabela. Vale uma migration com o índice quando o volume crescer
  (simplify da Fase 1).
- Com o `TeamPerformanceChart` fora, o campo `desempenho` do `GET /api/overview` (spec 039) ficou sem uso no
  frontend, mas o backend continua calculando os 6 meses. Tirar o campo mexe na API da 039 e nos testes dela:
  fica para uma limpeza própria.
