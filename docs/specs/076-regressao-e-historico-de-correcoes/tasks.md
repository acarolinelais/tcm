# 076. Regressão em caso Done e histórico de correções: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: Domínio e banco
- [x] **T01. Regressão e desfazer no `CasoTeste`**
  - Arquivos: `backend/src/domain/entities/caso_teste.py`, `backend/src/domain/entities/importacao_sdf_status.py`,
    `backend/tests/unit/test_caso_teste.py`
  - Cobre: CA-01, CA-03, CA-05 (Cancelled), CA-06
  - O que faz: `reabrir_por_regressao()` leva um caso Done para In Fixes, soma 1 à tentativa e zera
    `correcao_em_revisao_em`; fora de Done, não faz nada. `desfazer_resultado_sdf(status_aplicado, status_anterior)`
    volta para o Status anterior (In Validation quando nulo). `ImportacaoSdfStatus` ganha `status_anterior`.
  - Verificação: `cd backend && uv run pytest tests/unit/test_caso_teste.py` → verde
- [x] **T02. Entidade `Correcao`**
  - Arquivos: `backend/src/domain/entities/correcao.py`, `backend/src/domain/entities/interfaces/correcao_repository.py`,
    `backend/tests/unit/test_correcao.py`
  - Cobre: CA-07, CA-08, CA-09
  - O que faz: abrir com tentativa, origem e `falha_em`; `fechar(resultado, quando, corretor_id, importacao_id)` recusa
    fechar duas vezes; `reabrir()` limpa o fechamento; `dias_ate_corrigir` no fuso informado.
  - Verificação: `cd backend && uv run pytest tests/unit/test_correcao.py` → verde
- [x] **T03. Model, repositório e migration com backfill**
  - Arquivos: `backend/src/infrastructure/data/models/correcao_model.py`, configuração do model,
    `backend/src/infrastructure/repositories/correcao_repository.py`, `importacao_sdf_status` (model e repositório),
    `backend/src/infrastructure/data/migrations/versions/g076a1b2c3d4_correcoes.py`,
    `backend/tests/integration/test_correcao_repository.py`
  - Cobre: CA-15
  - O que faz: tabela `correcoes`, coluna `importacao_sdf_status.status_anterior`, backfill da tentativa atual (RN-11) e o
    CRUD do repositório (`obter_aberta`, `obter_por_tentativa`, `listar_por_importacao`).
  - Verificação: `cd backend && uv run alembic heads` → um head `g076a1b2c3d4`;
    `uv run pytest tests/integration/test_correcao_repository.py` → verde

## Fase 2: Regras na aplicação
- [x] **T04. `RegistroDeCorrecoes`**
  - Arquivos: `backend/src/application/services/registro_de_correcoes.py`,
    `backend/tests/unit/application/services/test_registro_de_correcoes.py`
  - Cobre: CA-07, CA-08, CA-09
  - O que faz: com o estado antes e depois do caso, abre a tentativa quando ela sobe (origem `regressao` se antes era
    Done), fecha a anterior como `falhou_de_novo`, fecha como `corrigida` ao chegar em Done e como `encerrada` em
    Cancelled, copiando o `em_revisao_em` e o corretor do momento.
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_registro_de_correcoes.py` → verde
- [x] **T05. Regressão na importação do SDF**
  - Arquivos: `backend/src/application/services/importacao_sdf_service.py`,
    `backend/src/infrastructure/repositories/execucao_sdf_repository.py`, testes de unidade e de integração da importação
  - Cobre: CA-01, CA-02, CA-04, CA-05 (projeto encerrado), CA-07
  - O que faz: lê a última execução de cada caso no device antes de gravar; reabre o Done com falha mais recente, fora
    de projeto Completed ou Canceled; grava `status_anterior`; chama o registrador com a data do relatório e a
    importação.
  - Verificação: `cd backend && uv run pytest tests -k "importacao_sdf"` → verde
- [x] **T06. Desfazer importação com as tentativas**
  - Arquivos: `backend/src/application/services/importacao_sdf_service.py`, `test_importacao_sdf_fluxo.py`
  - Cobre: CA-06
  - O que faz: o desfazer devolve o Status anterior, inativa as tentativas abertas pela importação e reabre as que ela
    fechou.
  - Verificação: `cd backend && uv run pytest tests -k "desfazer"` → verde
- [x] **T07. Registrador nos outros caminhos do Status**
  - Arquivos: `backend/src/application/services/caso_teste_service.py`, `form_factor_service.py`,
    `backend/src/api/dependencies.py`, testes de integração dos dois serviços
  - Cobre: CA-07, CA-08, CA-09
  - O que faz: `PUT /test-cases`, Kanban, correção pela My Fixes, cancelamento e rodada manual chamam o registrador;
    um teste por caminho confere a tentativa gravada.
  - Verificação: `cd backend && uv run pytest tests -k "caso_teste or form_factor or kanban"` → verde

## Fase 3: Consultas e API
- [x] **T08. Lista de correções concluídas**
  - Arquivos: `backend/src/infrastructure/repositories/correcao_repository.py` (`listar_concluidas`),
    `backend/src/application/services/bug_report_service.py` e interface, `backend/src/application/schemas/bug_report.py`,
    `backend/src/api/routers/bug_reports.py`, testes de integração e funcionais
  - Cobre: CA-10, CA-11, CA-12
  - O que faz: `GET /api/bug-reports/my-fixes/concluidas` com o escopo da My Fixes, o dev preso às próprias, filtros por
    corretor, resultado e dia ou semana, paginação e `dias_ate_corrigir`.
  - Verificação: `cd backend && uv run pytest tests -k "concluidas"` → verde
- [x] **T09. Correções por dev no Overview**
  - Arquivos: `backend/src/infrastructure/repositories/overview_repository.py`,
    `backend/src/application/services/overview_service.py`, `backend/src/application/schemas/overview.py`, testes
  - Cobre: CA-13
  - O que faz: `correcoes_por_dev` em `/api/overview/time`, com os últimos 30 dias do escopo, por corretor:
    corrigidas, falharam de novo e média de dias das corrigidas.
  - Verificação: `cd backend && uv run pytest tests -k "overview"` → verde

## Fase 4: Frontend
- [x] **T10. Dados das concluídas e mock**
  - Arquivos: `frontend/src/modules/projetos/model/projeto.ts`, `api/projetos.api.ts`, `hooks/useProjetos.ts`,
    `frontend/src/core/mock/database.ts` e testes
  - Cobre: CA-10, CA-11
  - O que faz: tipo `CorrecaoConcluida`, `listarCorrecoesConcluidas`, `useCorrecoesConcluidas`; no mock, tentativas
    abertas e fechadas pela rodada e pela correção, e a lista com o mesmo escopo da API.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/api src/core/mock` → verde
- [x] **T11. Visão Concluídas na My Fixes**
  - Arquivos: `frontend/src/modules/projetos/components/my-fixes/MyFixesTab.tsx`, `CorrecoesConcluidas.tsx`,
    `CorrecoesConcluidas.test.tsx`, `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-10, CA-11, CA-12
  - O que faz: escolha entre Em correção (padrão) e Concluídas; tabela da RN-14 com selo da tentativa, filtros por
    Corretor, Resultado e Day or Week, 20 por página, estados e exportação (skills `table-rules` e `react-crud`).
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/components/my-fixes` → verde
- [x] **T12. Cartão Correções por dev no Overview**
  - Arquivos: `frontend/src/modules/overview/model/overview.ts`, `api/overview.api.ts`, `OverviewKp.tsx`,
    `OverviewGerente.tsx`, testes, `frontend/src/core/mock/database.ts` (overview), `resources.ts`
  - Cobre: CA-13, CA-14
  - O que faz: `BarrasEmpilhadas` com corrigidas e falharam de novo por dev, resumo em texto com a média de dias e o
    estado vazio sem tirar os outros cartões.
  - Verificação: `cd frontend && npx vitest run src/modules/overview` → verde
- [x] **T13. Guia "Ciclo de Status" e textos**
  - Arquivos: `frontend/src/modules/documentacao/conteudo/{pt-BR,en,ko}.ts`
  - Cobre: RN-01 a RN-04 (documentação)
  - O que faz: "Quando o sistema move sozinho" passa a citar o caso Done que falha no SDF. Não existe guia de
    correções nem da My Fixes para citar a visão Concluídas; ver o Backlog.
  - Verificação: `cd frontend && npx vitest run src/modules/documentacao` → verde

## Fase 5: e2e e fechamento
- [x] **T14. e2e da visão Concluídas**
  - Arquivos: `frontend/e2e/my-fixes.spec.ts`
  - Cobre: CA-10, CA-12
  - Verificação: `cd frontend && npx playwright test e2e/my-fixes.spec.ts` → verde
- [x] **T15. Suítes, lint, build e simulação**
  - Cobre: todos
  - O que faz: suítes completas do backend (com o Postgres local, `SDF_TEST_DATABASE_URL`) e do frontend, lint e
    build; e repetir a simulação da sprint de manutenção para conferir que nenhum caso Done fica parado na SDF
    Failures.
  - Verificação: `uv run pytest`, `npm test`, `npm run lint`, `npm run build` → verdes; simulação sem casos Done com
    falha nova na SDF Failures

## Backlog
- Levar a fixture `cenario` (engine, `begin()` e `AsyncSession` com savepoint) para um `conftest.py` de
  `tests/integration`: há 11 cópias iguais. Achado da simplify da Fase 1; a duplicação é anterior à spec.
- A tabela Em correção da My Fixes tem as colunas com `exportar`, mas não passa `exportacao` ao `DataTable`, então
  não mostra o botão Export (spec 073). A visão Concluídas já exporta. Achado da Fase 4.
- O filtro Corretor das Concluídas usa os membros ativos do time: quem saiu do time segue nas linhas, mas não dá
  para filtrar por ele. Montar as opções a partir dos corretores devolvidos, se fizer falta. Achado da Fase 4.
- Não há guia na documentação para a My Fixes (spec 073) nem para a visão Concluídas (spec 076).
- O mock não importa relatório SDF, então nunca gera uma regressão de caso Done; a origem `regressao` só aparece
  com a API real.
- Desfazer uma regressão devolve o caso para Done, mas não devolve o `correcao_em_revisao_em` do caso, que a
  regressão zerou. A tentativa fechada guarda a data; o campo do caso só aparece enquanto ele está em correção.
  Achado do code-review da spec.
- O registrador consulta a tentativa aberta caso a caso na importação SDF (N+1). Buscar as abertas dos casos que
  mudaram numa consulta só, se o volume crescer. Achado do code-review e da simplify da Fase 2.
- `registro_correcoes` e `correcao_repo` são opcionais nos serviços para não reescrever os testes antigos; um teste
  da composição garante que a API os liga. Tornar obrigatórios quando esses testes forem revistos.
