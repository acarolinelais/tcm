# 032. Resultados Gerais por projeto, com histórico de execuções por data: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md) · **ADR:** [0038](../../adr/0038-resultados-gerais-sem-paginacao.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> Os testes de integração precisam de um Postgres (`SDF_TEST_DATABASE_URL`); no Windows, rodá-los isolados pede
> `pytest -p src.infrastructure.data.session` (backlog da spec 030).

## Fase 1: backend da consulta, da janela de datas e da busca

- [x] **T01. Datas da janela e resultados por dia no repositório**
  - Arquivos: `backend/src/domain/queries/historico_form_factor.py` (novo), `backend/src/domain/entities/interfaces/resultado_form_factor_repository.py`, `backend/src/infrastructure/repositories/resultado_form_factor_repository.py`, `backend/tests/integration/test_historico_form_factor_repository.py` (novo).
  - Cobre: CA-03, CA-04, CA-08 (consulta), RN-05, RN-06, RN-07.
  - Verificação: `cd backend && uv run pytest -p src.infrastructure.data.session tests/integration/test_historico_form_factor_repository.py` →
    - 10 dias de execução: `listar_datas_historico` devolve os 7 mais recentes, do mais novo ao mais antigo;
    - com intervalo de dia ou de semana, só as datas do período (no máximo 7);
    - o dia é calculado no fuso pedido (uma execução às 23h em UTC cai no dia anterior em `America/Manaus`);
    - `listar_historico` devolve, por caso, data e modelo, uma linha por execução, com SDF ID e origem (SDF e MANUAL);
    - outra unidade e outro projeto não aparecem.
- [x] **T02. Casos do projeto para o histórico, com busca e filtros**
  - Feito no `HistoricoFormFactorRepository` (plan, "Execução"), junto com a T01.
  - Arquivos: `backend/src/domain/entities/interfaces/caso_teste_repository.py`, `backend/src/infrastructure/repositories/caso_teste_repository.py`, `backend/tests/integration/test_historico_form_factor_repository.py`.
  - Cobre: CA-01 (todos os casos), CA-10, CA-10a, CA-12 (consulta), RN-02, RN-10, RN-10a, RN-11.
  - Verificação: `cd backend && uv run pytest -p src.infrastructure.data.session tests/integration/test_historico_form_factor_repository.py` →
    - sem filtro, todos os casos ativos do projeto, com o `user_id` do responsável, sem limite de página;
    - a busca casa com o `user_id` do tester, com um SDF ID das execuções do caso e com o nome de um modelo (casos com execução nele);
    - `tc_id` filtra por texto; `modelo_dispositivo_id` filtra os casos com execução nesse modelo;
    - com período, só os casos com execução nele;
    - busca sem correspondência devolve lista vazia.
- [x] **T03. Service: histórico do projeto (pivô, modelo padrão, escopo)**
  - Arquivos: `backend/src/application/schemas/form_factor_historico.py` (novo), `backend/src/application/validators/semana.py`, `backend/src/application/services/interfaces/form_factor_service.py`, `backend/src/application/services/form_factor_service.py`, `backend/tests/unit/application/services/test_form_factor_historico.py` (novo), `backend/tests/unit/application/validators/test_semana.py`.
  - Cobre: CA-02, CA-05, CA-07, CA-08, CA-10 (service), RN-03, RN-04, RN-07, RN-14.
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_form_factor_historico.py tests/unit/application/validators/test_semana.py` →
    - a resposta traz os modelos do projeto na ordem de associação, as datas e, por caso, os resultados de todos os modelos;
    - duas execuções do mesmo modelo no mesmo dia → fica a mais recente;
    - `modelo_padrao_id` = modelo da execução mais recente; sem execução, o primeiro do projeto;
    - busca que casa com um modelo → `modelo_destacado_id` preenchido;
    - perfil sem `form_factor.consultar` ou dev → 403; projeto fora do escopo ou inativo → 404; gerente que só participa do time vê (ADR 0036);
    - intervalo de um dia no fuso, ao lado do de semana; dia inválido → erro.
- [x] **T04. Service: resumo de execuções do caso**
  - Arquivos: `backend/src/domain/entities/interfaces/resultado_form_factor_repository.py`, `backend/src/infrastructure/repositories/resultado_form_factor_repository.py`, `backend/src/application/schemas/form_factor_historico.py`, `backend/src/application/services/form_factor_service.py`, `backend/tests/unit/application/services/test_form_factor_historico.py`, `backend/tests/integration/test_historico_form_factor_repository.py`.
  - Cobre: CA-08 (resumo), CA-13 (service), RN-13.
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_form_factor_historico.py && uv run pytest -p src.infrastructure.data.session tests/integration/test_historico_form_factor_repository.py` →
    todas as datas do caso em ordem cronológica, todos os modelos do projeto, as duas execuções do mesmo dia na
    mesma célula, o `user_id` do tester; caso de projeto fora do escopo → 404.
- [x] **T05. Rotas do histórico e do resumo**
  - Arquivos: `backend/src/api/routers/form_factor_geral.py`, `backend/tests/functional/test_form_factor_geral_api.py`.
  - Cobre: CA-02, CA-10a, CA-12, CA-13 (API).
  - Verificação: `cd backend && uv run pytest tests/functional/test_form_factor_geral_api.py` →
    - `GET /api/form-factor/general/projetos/{id}/historico` repassa busca, `tc_id`, modelo, dia ou semana e fuso;
    - `dia` e `semana` juntos, dia ou semana em formato inválido → 422 ProblemDetails;
    - 403 e 404 saem como ProblemDetails;
    - `GET /api/form-factor/general/casos/{id}/execucoes` devolve o resumo.
- [x] **T05b. Suíte do backend do bloco**
  - Arquivos: nenhum.
  - Verificação: `cd backend && uv run pytest -p src.infrastructure.data.session && uv run ruff check . && uv run ruff format --check .` →
    verde (falhas antigas do backlog da 030 anotadas, se persistirem); decidir aqui se entra o índice de
    `execucoes_sdf` (plan, "Modelo de dados").

## Fase 2: abas e tabela com as colunas de data fixas

- [x] **T06. Tipos, API, hooks, mock e textos**
  - Arquivos: `frontend/src/modules/projetos/model/projeto.ts`, `frontend/src/modules/projetos/api/projetos.api.ts`, `frontend/src/modules/projetos/hooks/useProjetos.ts`, `frontend/src/core/mock/database.ts`, `frontend/src/core/mock/database.test.ts`, `frontend/src/core/i18n/resources.ts`, `frontend/src/core/i18n/resources.test.ts`.
  - Cobre: base das fases 2 a 4; CA-03, CA-05, CA-08 (modo mock).
  - Verificação: `cd frontend && npx vitest run src/core && npx tsc --noEmit` → o mock devolve o histórico com as 7
    datas mais recentes, o modelo padrão e o resumo; os textos novos ("SDF Result", origens, modal, resumo) existem
    em en, pt e ko.
- [x] **T07. Tabela do histórico**
  - Arquivos: `frontend/src/modules/projetos/components/resultados-gerais/HistoricoProjetoTabela.tsx` (novo) e teste.
  - Cobre: CA-03, CA-07, CA-14, CA-15, RN-05, RN-06, RN-07, RN-08.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/components/resultados-gerais` →
    - colunas TC ID, Form Factor, uma por data (até 7, da mais nova à mais antiga) e Actions; TC ID e Form Factor com `sticky`;
    - sem controle de datas anteriores nem paginação;
    - a célula mostra o chip do modelo da linha; sem execução, o marcador vazio com rótulo;
    - o título da data é focável e mostra "SDF Result" com o foco e com o mouse;
    - estados de carregando, erro (tentar de novo) e vazio.
- [x] **T08. Página com uma aba por projeto**
  - Arquivos: `frontend/src/modules/projetos/pages/ResultadosGeraisPage.tsx`, `ResultadosGeraisPage.test.tsx`.
  - Cobre: CA-01, CA-02 (tela), RN-01, RN-02.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/pages/ResultadosGeraisPage.test.tsx && npm run lint` →
    uma aba com o nome de cada projeto acessível, a primeira aberta; trocar de aba consulta o outro projeto; sem
    projeto, o estado vazio; perfil sem permissão continua negado.

## Fase 3: seletor de Form Factor por linha, busca e calendário

- [x] **T09. Form Factor por linha**
  - Arquivos: `frontend/src/modules/projetos/components/resultados-gerais/HistoricoProjetoTabela.tsx` e teste, `frontend/src/modules/projetos/pages/ResultadosGeraisPage.tsx` e teste.
  - Cobre: CA-05, CA-06, RN-03, RN-04.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos` → a linha abre no `modelo_padrao_id`; S26 na
    linha 1 e S27 na linha 2 mantêm as duas escolhas, sem nova chamada à API; a lista tem o rótulo "Form Factor
    {TC ID}"; trocar de aba esquece as escolhas.
- [x] **T10. Busca e filtros de cabeçalho**
  - Arquivos: `frontend/src/modules/projetos/pages/ResultadosGeraisPage.tsx` e teste, `HistoricoProjetoTabela.tsx` e teste.
  - Cobre: CA-10, CA-10a, CA-11, RN-10, RN-10a, RN-12.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos` → a lupa abre o campo de busca e envia o
    texto; com `modelo_destacado_id`, as linhas vêm nesse modelo; TC ID e Form Factor filtram pelo cabeçalho; sem
    correspondência, o estado "nenhum resultado" com limpar; limpar volta a tudo.
- [x] **T11. Calendário por dia ou semana**
  - Arquivos: `frontend/src/shared/ui/week-picker-hero.tsx` e teste, `frontend/src/modules/projetos/pages/ResultadosGeraisPage.tsx` e teste.
  - Cobre: CA-12, RN-11, RN-12.
  - Verificação: `cd frontend && npx vitest run src/shared/ui/week-picker-hero.test.tsx src/modules/projetos && npm run lint` →
    com `permitirDia`, clicar num dia escolhe o dia e clicar no número da semana escolhe a semana; sem a prop, nada
    muda nas telas que já usam o componente; a página envia `dia` ou `semana`; limpar volta às 7 datas.

## Fase 4: modal do resultado e Resumo de execuções

- [x] **T12. Modal do resultado**
  - Arquivos: `frontend/src/modules/projetos/components/resultados-gerais/ResultadoExecucaoModal.tsx` (novo) e teste, `HistoricoProjetoTabela.tsx`.
  - Cobre: CA-09, RN-09.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/components/resultados-gerais` → o chip é botão
    com nome acessível (resultado, device e data); abre o modal com TC ID, device e data no título, SDF ID e origem
    no corpo e só o botão Fechar; manual sem SDF ID mostra o marcador vazio; Esc e Fechar fecham.
- [x] **T13. Resumo de execuções**
  - Arquivos: `frontend/src/modules/projetos/components/resultados-gerais/ResumoExecucoesDrawer.tsx` (novo) e teste, `HistoricoProjetoTabela.tsx`, `ResultadosGeraisPage.tsx`.
  - Cobre: CA-08 (resumo), CA-13, RN-13.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos && npm run lint` → a ação da linha abre o painel
    com o ID do tester e a grade de todos os devices × todas as datas em ordem cronológica; duas execuções no mesmo
    dia aparecem na mesma célula; o resultado abre o modal da T12; erro na consulta mostra tentar de novo.

## Fase 5: e2e e limpeza da tela antiga

- [x] **T14. e2e da tela nova**
  - Arquivos: `frontend/e2e/resultados-gerais.spec.ts` (novo), `frontend/e2e/projetos-fixtures.ts`.
  - Cobre: fluxo dos CA-01, CA-06, CA-09, CA-12 e CA-13.
  - Verificação: `cd frontend && npx playwright test e2e/resultados-gerais.spec.ts` (API simulada com `page.route`) →
    trocar de aba, trocar o modelo de uma linha, abrir o modal e o resumo e filtrar por semana; numa janela estreita,
    TC ID e Form Factor continuam visíveis ao rolar para os lados.
- [x] **T15. Remover o backend da tela antiga**
  - Arquivos: `backend/src/api/routers/form_factor_geral.py`, `backend/src/application/services/form_factor_service.py` e interface, `backend/src/application/schemas/form_factor.py`, `backend/src/infrastructure/repositories/resultado_form_factor_repository.py` e interface, os testes desses métodos.
  - Cobre: limpeza (plan).
  - Verificação: `cd backend && uv run pytest -p src.infrastructure.data.session && uv run ruff check .` → verde;
    `grep -rn "listar_form_factor_global\|listar_execucoes_form_factor_global\|FormFactorGlobal" src tests` vazio.
- [x] **T16. Remover o frontend da tela antiga e verificação final**
  - Arquivos: `frontend/src/modules/projetos/components/form-factor/FormFactorGlobalTabela.tsx` e testes, `colunas-form-factor.tsx` (sem `aplicavel`), `useProjetos.ts`, `projetos.api.ts`, `core/mock/database.ts`, `model/projeto.ts` e os testes deles.
  - Cobre: limpeza (plan).
  - Verificação: `cd frontend && npx tsc --noEmit && npm test && npm run lint && npx playwright test e2e/resultados-gerais.spec.ts e2e/form-factor.spec.ts` →
    verde; `grep -rn "FormFactorGlobal\|listarGlobal\|useFormFactorGlobal" src` vazio.

## Backlog

- **Regra de "execução válida" repetida.** `_resultados_validos` (`historico_form_factor_repository.py`) é a
  terceira cópia da regra (as outras em `resultado_form_factor_repository.py`: inline em
  `listar_form_factor_por_projeto`, `_global_execucao_valida` e `listar_execucoes_form_factor_por_projeto`). Juntar
  num helper único de `infrastructure/repositories`. Fora do bloco: mexe no `ResultadoFormFactorRepositoryImpl`.
- **`IN` com todos os casos do projeto.** Sem paginação (ADR 0038), `historico_projeto` passa os IDs de todos os
  casos em três consultas. Trocar o `IN` por subconsulta com os filtros de `listar_casos` se projetos grandes
  pesarem.
- **Índice de `execucoes_sdf`** (plan, "Modelo de dados"): não entrou na T05b. A base local é pequena demais para o
  `EXPLAIN` decidir, e as telas por projeto já fazem as mesmas junções sem ele. Reavaliar com volume real
  (`(unidade_id, caso_teste_id, data_reportada)`).
- **`historico_repo` opcional no `FormFactorServiceImpl`.** Ficou com padrão `None`, como o `rodada_repo`, para não
  mexer nos construtores dos testes existentes. Torná-los obrigatórios é uma limpeza à parte.
- **Regra "pode ver Resultados Gerais" duplicada.** Perfil (Admin, Gerente ou KP) + `form_factor.consultar` está em
  `ResultadosGeraisPage.tsx` e em `core/layout/Sidebar.tsx`. Mover para um helper em `core/auth`. Anterior a esta spec.
- **Período como texto único.** `FiltrosHistoricoProjeto.periodo` guarda dia ou semana e a API e o mock distinguem
  pelo `-W`. Separar em `dia` e `semana` tiraria essa leitura de texto; não vale a troca agora.
- **Linhas redesenham ao trocar o modelo de uma.** `rowDependencies` da tabela inclui o `modeloDaLinha`, que muda a
  cada escolha. Sem paginação (ADR 0038), um projeto com milhares de casos pode pesar; o caminho é virtualizar as
  linhas (já previsto no ADR 0038).
- **Code-review: `%` e `_` na busca.** `busca` e `tc_id` entram no `ILIKE` sem escapar os curingas (buscar `dev_01`
  também acha `devX01`). Nenhum repositório do projeto escapa hoje: criar um helper comum e usar em todos.
- **Code-review: fuso aceito no Python e recusado no Postgres.** O `fuso_horario` é validado com o `tzdata` do
  Python, mas a conversão roda no `timezone()` do Postgres; um nome novo pode passar na validação e virar 500. Vale
  para o filtro de semana dos Test Cases também.
- **Code-review: limite de parâmetros.** O `IN` com todos os casos (item acima) passa de 32.767 parâmetros num
  projeto muito grande e o asyncpg recusa. Mesmo caminho: subconsulta ou `= ANY(array)`.

