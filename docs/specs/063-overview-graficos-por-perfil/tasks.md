# 063. Overview com gráficos para KP e dev: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: backend, gráficos do time (KP)
- [ ] **T01. Tipos de leitura e helper "entrou em Done"**
  - Arquivos: `backend/src/domain/queries/resumo_overview.py`,
    `backend/src/domain/entities/interfaces/overview_repository.py`,
    `backend/src/infrastructure/repositories/overview_repository.py`
  - Cobre: base para CA-05 a CA-07 (o `resumir` atual passa a usar o helper, sem mudar o resultado)
  - Verificação: `cd backend && uv run pytest tests/integration/test_overview_repository.py` → verde
- [ ] **T02. Consultas do time: projetos, criação por dia, finalizados por dev, por semana e Done por projeto**
  - Arquivos: `backend/src/infrastructure/repositories/overview_repository.py`,
    `backend/tests/integration/test_overview_repository.py`
  - Cobre: CA-04, CA-05, CA-06, CA-07
  - Verificação: `uv run pytest tests/integration/test_overview_repository.py` → verde, com um cenário de sucesso
    e um de falha (escopo de outro time) por consulta
- [x] **T03. Service, schema e rota `GET /api/overview/time`**
  - Arquivos: `backend/src/application/schemas/overview.py`,
    `backend/src/application/services/interfaces/overview_service.py`,
    `backend/src/application/services/overview_service.py`, `backend/src/api/routers/overview.py`,
    `backend/tests/unit/application/services/test_overview_service.py`, `backend/tests/functional/test_overview_api.py`
  - Cobre: CA-11 (projeto e pessoa de outro time não aparecem)
  - Verificação: `uv run pytest tests/unit/application/services/test_overview_service.py tests/functional/test_overview_api.py`
    → verde; `/scalar` lista a rota

## Fase 2: backend, projeto escolhido e visão pessoal
- [x] **T04. Linha de planejado do burndown (função pura)**
  - Arquivos: `backend/src/application/services/overview_service.py`,
    `backend/tests/unit/application/services/test_overview_service.py`
  - Cobre: CA-01 (planejado: cai 2 por dia útil, fica parado no fim de semana e para em 0)
  - Verificação: `uv run pytest tests/unit/application/services/test_overview_service.py` → verde
- [ ] **T05. Consultas do burndown executado e do Pass Rate da última rodada**
  - Arquivos: `backend/src/infrastructure/repositories/overview_repository.py`,
    `backend/tests/integration/test_overview_repository.py`
  - Cobre: CA-01 (executado), CA-03, CA-10 (sem rodada → nulo)
  - Verificação: `uv run pytest tests/integration/test_overview_repository.py` → verde; anotar o tempo da
    consulta do burndown com 500 Test Cases (risco do plan)
- [x] **T06. Rota `GET /api/overview/projetos/{projeto_id}` com a checagem de escopo**
  - Arquivos: `backend/src/application/services/overview_service.py`, `backend/src/api/dependencies.py`,
    `backend/src/api/routers/overview.py`, `backend/src/application/schemas/overview.py`,
    `backend/tests/functional/test_overview_api.py`
  - Cobre: CA-01, CA-03, CA-10, CA-11 (404 para projeto de outro time, inexistente ou inativo)
  - Verificação: `uv run pytest tests/functional/test_overview_api.py` → verde
- [ ] **T07. Consulta, service e rota `GET /api/overview/pessoal`**
  - Arquivos: `backend/src/infrastructure/repositories/overview_repository.py`,
    `backend/src/application/services/overview_service.py`, `backend/src/api/routers/overview.py`,
    `backend/src/application/schemas/overview.py`, `backend/tests/integration/test_overview_repository.py`,
    `backend/tests/functional/test_overview_api.py`
  - Cobre: CA-08 (por dificuldade), entregas por dia e por semana só como responsável principal
  - Verificação: `uv run pytest` → verde; `uv run alembic heads` → um head só, sem migration nova

## Fase 3: frontend, base dos gráficos
- [x] **T08. Recharts e tokens `--chart-4` e `--chart-5`**
  - Arquivos: `frontend/package.json`, `frontend/package-lock.json`, `frontend/src/core/global.css`,
    `frontend/src/core/theme/contraste-tema-escuro.test.ts`
  - Cobre: ADR 0051 e ADR 0041
  - Verificação: `cd frontend && npx vitest run src/core/theme` → verde (inclui os tokens novos)
- [x] **T09. `GraficoCard` com título, resumo em texto e estados**
  - Arquivos: `frontend/src/modules/overview/components/graficos/GraficoCard.tsx`, `GraficoCard.test.tsx`,
    `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-09 (título e resumo acessíveis), CA-12 (erro com tentar de novo)
  - Verificação: `npx vitest run src/modules/overview` → verde
- [x] **T10. Componentes de gráfico: burndown, barras horizontais, barras verticais, lollipop e donut**
  - Arquivos: `frontend/src/modules/overview/components/graficos/BurndownChart.tsx`, `BarrasHorizontais.tsx`,
    `BarrasVerticais.tsx`, `LollipopChart.tsx`, `DonutDone.tsx` e os testes de cada um
  - Cobre: CA-09 (`accessibilityLayer` e resumo de cada gráfico)
  - Verificação: `npx vitest run src/modules/overview` → verde; `npm run lint` → sem erros (cores só por token)
- [x] **T11. Tipos, API, mock e hooks das três leituras**
  - Arquivos: `frontend/src/modules/overview/model/overview.ts`, `api/overview.api.ts`, `api/overview.mock.ts`,
    `api/overview.api.test.ts`, `hooks/useOverviewGraficos.ts` (os três hooks num arquivo)
  - Cobre: RN-06 (modo de demonstração com dados de exemplo)
  - Verificação: `npx vitest run src/modules/overview` → verde

## Fase 4: frontend, telas do KP e do dev
- [x] **T12. Visão do KP com o seletor de projeto**
  - Arquivos: `frontend/src/modules/overview/components/OverviewKp.tsx`, `OverviewKp.test.tsx`,
    `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-02, CA-10 (Pass Rate vazio sem esconder os outros), CA-12
  - Verificação: `npx vitest run src/modules/overview` → verde
- [x] **T13. Visão do dev, sem o card All**
  - Arquivos: `frontend/src/modules/overview/components/OverviewDev.tsx`, `OverviewDev.test.tsx`,
    `frontend/src/modules/overview/components/StatCard.tsx`, `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-08, CA-12
  - Verificação: `npx vitest run src/modules/overview` → verde
- [x] **T14. `OverviewPage` escolhe a visão pelo perfil, com `React.lazy`**
  - Arquivos: `frontend/src/modules/overview/pages/OverviewPage.tsx`, `OverviewPage.test.tsx`; remover
    `TotalTcsDonePieChart.tsx` se ficar sem uso
  - Cobre: RN-06 da spec (estado vazio da página inteira), visões por perfil
  - Verificação: `npx vitest run` → verde; `npm run build` → o Recharts num chunk separado do principal
- [ ] **T15. Ajuste visual pelo protótipo do Figma**
  - Arquivos: os componentes de `modules/overview/components/`
  - Cobre: Objetivo da spec (cards, cores e fontes do protótipo)
  - Verificação: skill `ui-density` e conferência com a imagem do protótipo; `npx vitest run src/modules/overview`
    → verde. Depende da imagem exportada do protótipo (plan, Frontend)

## Fase 5: e2e
- [x] **T16. e2e do KP e do dev**
  - Arquivos: `frontend/e2e/overview-graficos.spec.ts` (sessão e rotas da Overview simuladas, como no
    `projetos-fixtures`: o teste não cria dados no banco)
  - Cobre: CA-02 (trocar de projeto), CA-09 (axe sem violação nos cartões e navegação pelo teclado). A CA-11 é do
    backend e fica nos testes funcionais e de integração
  - Verificação: `npm run e2e -- overview-graficos` → verde

## Backlog
- A checagem "projeto inexistente, inativo ou de time fora do escopo → 404" se repete em
  `overview_service.obter_projeto`, `caso_teste_service._obter_projeto_visivel`,
  `form_factor_service._obter_projeto_ativo_no_escopo`, `projeto_service` e `importacao_sdf_service`.
  Um helper comum mexe em cinco services, então fica para uma refatoração própria (simplify da Fase 2).
- A Overview do KP e do dev carrega em cascata: `/api/overview`, depois o chunk lazy, depois `/time` e
  `/projetos/{id}`. Dá para baixar o chunk junto com a primeira consulta (chamar o `import()` antes do `if (!data)`).
  Ficou de fora porque é otimização opcional, sem medida de lentidão real (simplify das Fases 3 e 4).
