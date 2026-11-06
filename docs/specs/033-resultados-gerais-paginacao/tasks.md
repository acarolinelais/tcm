# 033. Paginação na tela Resultados Gerais: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md) · **ADR:** [0039](../../adr/0039-resultados-gerais-com-paginacao.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> Os testes de integração precisam de um Postgres (`SDF_TEST_DATABASE_URL`); no Windows, rodá-los isolados pede
> `pytest -p src.infrastructure.data.session` (backlog da spec 030).

## Fase 1: backend paginado

- [x] **T01. Repositório: casos paginados e datas pelos filtros**
  - Arquivos: `backend/src/domain/queries/historico_form_factor.py` (`FiltrosCasoHistorico`),
    `backend/src/domain/entities/interfaces/historico_form_factor_repository.py`,
    `backend/src/infrastructure/repositories/historico_form_factor_repository.py`,
    `backend/tests/integration/test_historico_form_factor_repository.py`.
  - Cobre: CA-01, CA-02, CA-03, CA-09 (consulta), RN-01, RN-03, RN-06.
  - Verificação: `cd backend && uv run pytest -p src.infrastructure.data.session tests/integration/test_historico_form_factor_repository.py` →
    - 45 casos, `page_size` 20: a página 1 traz os 20 primeiros por `tc_id`, a página 3 traz 5, `total_count` 45;
    - página além da última → `items` vazio e `total_count` correto;
    - `listar_datas` com os filtros devolve as mesmas datas para qualquer página, inclusive uma data em que só um
      caso da última página tem execução;
    - os testes existentes de busca, filtro por TC ID/modelo, período, fuso e outra unidade continuam verdes,
      agora pelos filtros e não pelos IDs.
- [x] **T02. Service, schema e router com `page`/`page_size`**
  - Arquivos: `backend/src/application/schemas/form_factor_historico.py`,
    `backend/src/application/services/interfaces/form_factor_service.py`,
    `backend/src/application/services/form_factor_service.py`, `backend/src/api/routers/form_factor_geral.py`,
    `backend/tests/unit/application/services/test_form_factor_historico.py`,
    `backend/tests/functional/test_form_factor_geral_api.py`.
  - Cobre: CA-08, CA-09, CA-10, RN-01.
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_form_factor_historico.py tests/functional/test_form_factor_geral_api.py` →
    - a resposta traz `items`, `page`, `page_size`, `total_count`, `total_pages`, `modelos`, `datas` e
      `modelo_destacado_id` (sem `casos`);
    - resultados e modelos da última execução são buscados só com os IDs da página;
    - página vazia → `items: []` com as `datas` calculadas;
    - `page=0`, `page_size=0` e `page_size=101` → 422 ProblemDetails;
    - 403 e 404 continuam iguais com `page=2`, e o projeto fora do escopo é recusado antes de contar casos.
  - Fim do bloco: `cd backend && uv run pytest` → tudo verde.

## Fase 2: frontend paginado

- [x] **T03. Contrato, API, hook e mock**
  - Arquivos: `frontend/src/modules/projetos/model/projeto.ts`, `frontend/src/modules/projetos/api/projetos.api.ts`,
    `frontend/src/modules/projetos/hooks/useProjetos.ts`, `frontend/src/core/mock/database.ts`,
    `frontend/src/core/mock/database.test.ts`, `frontend/src/modules/projetos/api/projetos.api.test.ts`.
  - Cobre: CA-03, CA-07, CA-09 (mock), RN-01, RN-03.
  - Verificação: `cd frontend && npx vitest run src/core/mock/database.test.ts src/modules/projetos/api` →
    - `historicoProjeto` envia `page` e `page_size`; `page`/`pageSize` entram na `queryKey`;
    - o mock pagina (45 casos: 20/20/5; com 50 por página, 1 página) e as datas não mudam entre páginas;
    - `HistoricoProjeto` estende `PagedResult<CasoHistorico>` e `tsc` passa (`npm run build` ou `npx tsc -b`).
- [x] **T04. Tabela e página com `DataTablePagination`**
  - Arquivos: `frontend/src/modules/projetos/components/resultados-gerais/HistoricoProjetoTabela.tsx`,
    `HistoricoProjetoTabela.test.tsx`, `frontend/src/modules/projetos/pages/ResultadosGeraisPage.tsx`,
    `ResultadosGeraisPage.test.tsx`.
  - Cobre: CA-01, CA-04, CA-05, CA-06, CA-07, RN-02, RN-04, RN-05.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos` →
    - a tabela mostra 20 linhas e o rodapé com página e total (`DEFAULT_TABLE_PAGE_SIZE`, sem `20` fixo no teste);
    - buscar, filtrar TC ID/Form Factor, escolher período, limpar, trocar o tamanho e trocar de aba voltam para a
      página 1;
    - o modelo escolhido numa linha continua ao ir para a página 2 e voltar;
    - os comentários sobre o ADR 0038 saíram da tabela.
- [x] **T05. E2E: navegar pelas páginas**
  - Arquivos: `frontend/e2e/resultados-gerais.spec.ts`.
  - Cobre: CA-01, CA-02.
  - Verificação: `cd frontend && npm run e2e -- resultados-gerais` → abre a aba, vê "página 1", vai até a última
    página e as colunas de data são as mesmas.
  - Fim do bloco: `cd frontend && npm test && npm run lint && npm run e2e` → tudo verde.

## Backlog

- **B01. `PaginaResponse[T]` genérico para os responses paginados com campos extras.** O bloco
  `page`/`page_size`/`total_count`/`total_pages` é copiado à mão em `HistoricoProjetoResponse`,
  `RodadaFormFactorCasosResponse` e `FormFactorResultadosResponse` (e nos `to_*_response`). Fora do escopo:
  mexe em schemas de outras specs (achado da simplify do bloco 1).
- **B02. Hook `usePaginacao()` em `shared`.** O trio `useState(1)` + `useState(DEFAULT_TABLE_PAGE_SIZE)` +
  "trocar tamanho volta à página 1" se repete em `TimesPage`, `TimeDetalhePage`, `PerfisPage`,
  `ProjetoDetalhePage`, `ErrosPlanilha` e `ResultadosGeraisPage`. Fora do escopo: migra outras telas (achado da
  simplify do bloco 2).
- **B03. Limite superior para `page` nos routers paginados.** `page` só tem `ge=1`; um valor enorme estoura o
  `OFFSET` (bigint) e vira 500 em vez de 422. Vale para todos os routers com `page`, não só este (achado do
  code-review da spec).
- **B04. Aba cujo projeto some da lista.** Se o projeto da aba escolhida sai da lista (inativado), a tela cai na
  primeira aba sem limpar filtros, página e escolhas; a página volta sozinha à última existente, mas os filtros
  do projeto anterior ficam. Comportamento herdado da spec 032 (achado do code-review da spec).
