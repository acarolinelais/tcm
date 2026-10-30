# 039. Overview com dados reais: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> Os testes de integração e funcionais precisam do Postgres (`docker compose up -d`).

## Fase 1: Backend
- [x] **T01. Consulta agregada no repositório**
  - Arquivos: `backend/src/domain/queries/resumo_overview.py`,
    `backend/src/domain/entities/interfaces/overview_repository.py`,
    `backend/src/infrastructure/repositories/overview_repository.py`,
    `backend/tests/integration/test_overview_repository.py` (novo)
  - Cobre: CA-01, CA-02, CA-03, CA-04, CA-06, RN-01, RN-02, RN-04
  - Detalhe: contagens com `COUNT(*) FILTER` em `casos_teste` ligado a `projetos` (ativos e sem `Cancelled`);
    desempenho por mês a partir da `auditoria_alteracoes`, como no plan.
  - Testes:
    - gerente com 10 casos nos times do escopo, 4 em `Done`: total 10, concluídos 4;
    - escopo de pessoa: conta só os casos em que é principal ou Backup, num projeto com outros casos;
    - 2 casos que passaram para `Done` em setembro (via `UPDATE` com o trigger): setembro mostra 2;
    - um caso `Cancelled` não entra no total nem no desempenho;
    - um caso de outra unidade não entra (falha).
  - Verificação: `cd backend && uv run pytest tests/integration/test_overview_repository.py` → verde
- [x] **T02. Service com o escopo por perfil**
  - Arquivos: `backend/src/application/schemas/overview.py`,
    `backend/src/application/services/interfaces/overview_service.py`,
    `backend/src/application/services/overview_service.py`,
    `backend/tests/unit/application/services/test_overview_service.py` (novo)
  - Cobre: CA-05, RN-01, RN-04
  - Detalhe: admin → `todos`; `GERENTE` e `KP` → `times_no_escopo`; demais → `pessoa`. Valida o fuso com
    `fuso_horario_valido` e completa os 6 meses com zero.
  - Testes:
    - cada perfil gera o escopo certo;
    - KP sem time devolve tudo zerado e não chama o repositório;
    - os meses sem registro saem com zero, do mais antigo para o atual;
    - fuso inválido levanta erro de validação (falha).
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_overview_service.py` → verde
- [x] **T03. Rota `GET /api/overview`**
  - Arquivos: `backend/src/api/routers/overview.py`, `backend/src/api/dependencies.py`, `backend/src/api/main.py`,
    `backend/tests/functional/test_overview_api.py` (novo)
  - Cobre: CA-01, CA-06
  - Testes:
    - 200 com as contagens de um gerente autenticado;
    - 401 sem token (falha);
    - 422 com `fuso_horario` inválido (falha).
  - Verificação: `cd backend && uv run pytest tests/functional/test_overview_api.py tests/architecture` → verde

## Fase 2: Frontend
- [x] **T04. Contrato, cliente e mock no formato novo**
  - Arquivos: `frontend/src/modules/overview/model/overview.ts`, `api/overview.api.ts`, `api/overview.mock.ts`,
    `hooks/useOverview.ts`, `api/overview.api.test.ts` (novo)
  - Cobre: RN-06
  - Testes: com `useMock` o hook devolve o mock sem chamar a API; sem ele chama `/api/overview` com o fuso do
    navegador.
  - Verificação: `cd frontend && npx vitest run src/modules/overview` → verde
- [x] **T05. Tela com dados reais, estado vazio e erro**
  - Arquivos: `frontend/src/modules/overview/pages/OverviewPage.tsx`, `components/OverviewHeroCard.tsx`,
    `components/TotalTcsDonePieChart.tsx`, `components/TeamPerformanceChart.tsx`, `core/i18n/resources.ts`,
    `pages/OverviewPage.test.tsx` (novo)
  - Cobre: CA-01, CA-05, RN-03, RN-05
  - Detalhe: porcentagens calculadas das contagens; o gráfico mostra quantidade de casos, rotula `YYYY-MM` com
    `Intl` e não divide por zero.
  - Testes:
    - com 10 casos, 4 concluídos, os cards mostram 4 e 10 e o gráfico de pizza 40%;
    - com `total = 0`, mostra o estado vazio e não mostra os gráficos (falha);
    - com erro na API, mostra a mensagem de erro (falha).
  - Verificação: `cd frontend && npm test && npm run lint` → verde
- [x] **T06. E2e da Overview**
  - Arquivos: `frontend/e2e/overview.spec.ts` (novo)
  - Cobre: CA-01, CA-05
  - Testes: com a rota `/api/overview` simulada, a tela mostra as contagens; com tudo zerado, mostra o estado
    vazio.
  - Verificação: `cd frontend && npx playwright test e2e/overview.spec.ts` → verde

## Backlog
- Leitura da `auditoria_alteracoes` em dois estilos: o `OverviewRepositoryImpl` declara a tabela com
  `table()`/`column()` e os repositórios de histórico usam `text()`. Definir a tabela uma vez (por exemplo em
  `infrastructure/data/auditoria.py`) e reusar nos três. Fica fora da 039 porque mexe nos repositórios da 038.
- A suíte do backend não passa duas vezes no mesmo banco: `test_usuario_user_id_persistence.py` commita
  unidades sem perfil, e na segunda execução `test_bootstrap.py::test_migration_seed_perfil_kp_por_unidade_e_idempotente`
  falha ("não possui perfil USUARIO_PADRAO"). O CI não vê porque usa banco novo. Já existia antes da 039.
- O módulo `overview` tem `OverviewResponse` (snake_case) e `OverviewData` (camelCase) com mapeamento campo a
  campo; os outros módulos (ex.: `projetos/model/projeto.ts`) usam o snake_case do backend direto. Alinhar
  ao padrão do repositório.
- `Intl.DateTimeFormat().resolvedOptions().timeZone` aparece em três lugares (`overview.api.ts` e
  `projetos.api.ts`). Criar um `fusoHorarioDoNavegador()` em `core/` e reusar.
- O estado vazio da Overview e o `ProjetosDevEmptyState` são montados à mão. Quando surgir mais um, criar uma
  composição em `shared/ui` com o `EmptyState` do HeroUI (ADR 0037).
- `shared/ui` tem `ErroComRetry` e `RetryAlert`, quase iguais. Unificar.
- Code review: o fuso é validado pelo `zoneinfo` do Python e aplicado pelo `timezone()` do Postgres. Se as
  duas bases de fusos discordarem, a consulta dá 500; um navegador que informe um fuso desconhecido (ex.:
  `Etc/Unknown`) recebe 422 e a Overview não carrega. Vale também para os endpoints da spec 032. Avaliar cair
  para UTC no front ou validar o fuso pelo próprio Postgres.
- Code review: o início da janela de 6 meses é a meia-noite local do dia 1. Em fusos com horário de verão
  começando à meia-noite, essa hora não existe e o corte desloca uma hora. Impacto só na borda do mês mais
  antigo.
- Code review: a regra de escopo por perfil do `OverviewServiceImpl._escopo` repete os códigos `GERENTE` e
  `KP`, como o `ProjetoServiceImpl`. Levar para o `UsuarioAutenticado`, junto do `times_no_escopo`, quando
  aparecer mais um uso.
- Code review: `OverviewRepositoryImpl` e `HistoricoCasoTesteRepositoryImpl` filtram `unidade_id` à mão, fora
  do `RepositoryBaseImpl` (ADR 0013). Os dois filtros existem e têm teste, mas a guarda comum não os cobre.
