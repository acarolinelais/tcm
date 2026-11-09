# 071. Data planejada do projeto: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: backend

- [ ] **T01. Data planejada na entidade**
  - Arquivos: `src/domain/entities/projeto.py`, `tests/unit/domain/test_projeto.py`
  - Cobre: CA-06, CA-07, CA-10, CA-12 (`definir_data_planejada`: recusa passado, `None` limpa, início = hoje)
  - Verificação: `uv run pytest tests/unit/domain/test_projeto.py -q` → verde
- [ ] **T02. Colunas, migration e repositório**
  - Arquivos: `src/infrastructure/data/models/projeto_model.py`, `src/infrastructure/repositories/projeto_repository.py`,
    migration nova (`down_revision = "g067a1b2c3d4"`), `tests/integration/test_projeto_repository.py`
  - Cobre: CA-01, CA-06, CA-07
  - Verificação: `uv run pytest tests/integration/test_projeto_repository.py -q` → verde; `uv run alembic heads` → um head
- [ ] **T03. PUT de projeto com a data planejada e o fuso**
  - Arquivos: `src/application/schemas/projeto.py`, `src/application/services/projeto_service.py`,
    `src/api/routers/projetos.py`, `tests/functional/test_projetos_api.py`
  - Cobre: CA-01, CA-09, CA-10, CA-11, CA-12
  - Verificação: `uv run pytest tests/functional/test_projetos_api.py -q` → verde
- [ ] **T04. Burndown pela data planejada**
  - Arquivos: `src/application/services/overview_service.py`, `src/application/schemas/overview.py`,
    `tests/unit/application/services/test_overview_service.py`, `tests/functional/test_overview_api.py`
  - Cobre: CA-02, CA-03, CA-04, CA-05, CA-07, CA-08 e a RN-10
  - Verificação: `uv run pytest tests/unit/application/services/test_overview_service.py tests/functional/test_overview_api.py -q` → verde; `uv run ruff check .` → sem erros

## Fase 2: frontend

- [ ] **T05. Data planejada no projeto (API, drawer e coluna)**
  - Arquivos: `modules/projetos/api/projetos.api.ts` e o model, `components/EditarProjetoDrawer.tsx` e
    `EditarProjetoDrawer.test.tsx` (novo), `pages/ProjetosPage.tsx` e teste, `core/mock/database.ts`,
    `core/i18n/resources.ts`
  - Cobre: CA-01, CA-07, CA-10 (validação na tela)
  - Verificação: `npx vitest run src/modules/projetos/components/EditarProjetoDrawer.test.tsx src/modules/projetos/pages/ProjetosPage.test.tsx && npm run lint && npx tsc -b` → verde
- [ ] **T06. Burndown com data, meta e aviso**
  - Arquivos: `modules/overview/model/overview.ts`, `components/graficos/BurndownChart.tsx`,
    `components/OverviewKp.tsx` e `OverviewKp.test.tsx`, `api/overview.mock.ts`, `core/i18n/resources.ts`
  - Cobre: CA-03, CA-05, CA-08 (lacuna antes do início)
  - Verificação: `npx vitest run src/modules/overview && npm run lint && npx tsc -b` → verde

## Fase 3: e2e

- [ ] **T07. KP define a data e vê a meta**
  - Arquivos: `frontend/e2e/planejamento-projeto.spec.ts`
  - Cobre: CA-01, CA-03
  - Verificação: `npx playwright test e2e/planejamento-projeto.spec.ts` → verde

## Backlog
