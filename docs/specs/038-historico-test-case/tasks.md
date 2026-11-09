# 038. Histórico de alterações do Test Case: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> Os testes de integração e funcionais precisam do Postgres (`docker compose up -d`).

## Fase 1: Auditoria no banco
- [x] **T01. Migration com a tabela `auditoria_alteracoes` e a função de log**
  - Arquivos: `backend/src/infrastructure/data/migrations/versions/e038a1b2c3d4_auditoria_test_case.py`
  - Cobre: RN-02, RN-03
  - Detalhe: `down_revision = "e036a1b2c3d4"`.
    - `auditoria_alteracoes` e índices, como no plan.
    - `auditoria_registrar()` como no ADR 0044: `NEW.id`/`OLD.id`, `unidade_id` da linha, `TG_ARGV` com as
      colunas ignoradas e `UPDATE` sem mudança sem registro.
    - `auditoria_ativar(regclass, VARIADIC text[])`.
    - O `downgrade` remove tudo.
  - Verificação: `cd backend && uv run alembic upgrade head && uv run alembic downgrade -1 && uv run alembic upgrade head && uv run alembic heads` → sem erro e um único head
- [x] **T02. Histórico imutável e auditoria ligada em `casos_teste` e `links_pull_request`**
  - Arquivos: a mesma migration, `backend/tests/integration/test_auditoria_caso_teste.py` (novo)
  - Cobre: CA-01, CA-05, CA-07, CA-09, RN-01
  - Detalhe: trigger `BEFORE UPDATE OR DELETE` em `auditoria_alteracoes` que levanta exceção; `enable_tracking` nas
    duas tabelas, ignorando `updated_at`.
  - Testes:
    - com `set_config('app.usuario_id', …, true)`, um `UPDATE` de Status grava `changed_fields = {status}`, o
      antes, o depois, o usuário e `origem = api`;
    - `INSERT` do caso e do link de PR gravam registro;
    - um `ROLLBACK` não deixa registro;
    - um `UPDATE` com os mesmos valores não grava registro;
    - `UPDATE` e `DELETE` em `auditoria_alteracoes` falham.
  - Verificação: `cd backend && uv run pytest tests/integration/test_auditoria_caso_teste.py` → verde

## Fase 2: Quem e de onde
- [x] **T03. Contexto de auditoria na transação**
  - Arquivos: `backend/src/domain/entities/interfaces/contexto_auditoria.py`,
    `backend/src/infrastructure/data/auditoria.py`, `backend/src/api/dependencies.py`,
    `backend/tests/integration/test_contexto_auditoria.py` (novo)
  - Cobre: RN-02
  - Detalhe:
    - a `ContextVar` `usuario_auditoria`, preenchida no `_obter_usuario_atual` antes da primeira leitura;
    - o listener `after_begin` na `Session`, que grava o usuário com `set_config(..., true)` quando houver;
    - `ContextoAuditoriaImpl.definir_origem`, que grava a origem só na transação aberta (a simplify tirou a
      `ContextVar` de origem, que vazaria entre escritas).
  - Testes:
    - com a `ContextVar` preenchida, uma transação nova depois de um `commit` grava o usuário;
    - a origem definida vale na transação aberta e some depois do `commit`;
    - sem contexto, `usuario_id` fica nulo e a origem fica `api`.
  - Verificação: `cd backend && uv run pytest tests/integration/test_contexto_auditoria.py` → verde
- [x] **T04. Origem Form Factor ao registrar resultados**
  - Arquivos: `backend/src/application/services/form_factor_service.py`, `backend/src/api/dependencies.py`,
    os testes de unidade do `FormFactorServiceImpl`
  - Cobre: RN-04, CA-03
  - Detalhe: o `FormFactorServiceImpl` recebe `ContextoAuditoria` e chama `definir_origem("form_factor")`
    antes de `caso.registrar_resultado_form_factor`.
  - Testes:
    - o registro de resultados chama `definir_origem("form_factor")`;
    - uma rodada recusada (sem permissão) não chama.
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_form_factor_service.py` → verde

## Fase 3: Leitura do histórico
- [x] **T05. Repositório de leitura do histórico**
  - Arquivos: `backend/src/domain/queries/registro_auditoria.py`,
    `backend/src/domain/entities/interfaces/historico_caso_teste_repository.py`,
    `backend/src/infrastructure/repositories/historico_caso_teste_repository.py`,
    `backend/tests/integration/test_historico_caso_teste_repository.py` (novo)
  - Cobre: RN-06, RN-07
  - Detalhe: `listar(unidade_id, caso_id)` devolve as linhas de `auditoria_alteracoes` do caso e dos links de PR
    dele, da mais recente para a mais antiga, sempre filtrando por `unidade_id`.
  - Testes:
    - devolve os registros do caso e dos PRs dele, em ordem;
    - com outra `unidade_id`, devolve lista vazia.
  - Verificação: `cd backend && uv run pytest tests/integration/test_historico_caso_teste_repository.py` → verde
- [x] **T06. Caso de uso `historico` e a transformação em itens**
  - Arquivos: `backend/src/application/services/caso_teste_service.py` e a interface,
    `backend/src/application/schemas/caso_teste.py`, `backend/tests/unit/application/services/test_caso_teste_service.py`
  - Cobre: CA-01, CA-02, CA-04, CA-06, CA-08
  - Detalhe:
    - reaproveita a checagem de acesso do `obter`;
    - cada coluna de `changed_fields` vira um item;
    - `responsavel_id` e `backup_id` viram nomes, com uma busca em lote;
    - as colunas técnicas ficam ocultas;
    - `INSERT` do caso vira `criacao`;
    - `INSERT` e inativação de link viram `pull_request`;
    - `HistoricoCasoTesteResponse` com mapeamento manual.
  - Testes:
    - um `UPDATE` com dois campos vira dois itens;
    - os nomes vêm resolvidos;
    - `updated_at` não aparece;
    - um caso fora do escopo dá `CasoTesteNaoEncontrado`.
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_caso_teste_service.py` → verde
- [x] **T07. Rota `GET /api/test-cases/{id}/historico` e os testes funcionais**
  - Arquivos: `backend/src/api/routers/test_cases.py`, `backend/src/api/dependencies.py`,
    `backend/tests/functional/test_historico_caso_teste_api.py` (novo), `.claude/skills/python-crud/SKILL.md`
  - Cobre: CA-01 a CA-06, CA-08
  - Detalhe: a rota injeta o repositório no service. Na skill `python-crud`, entra uma linha sobre
    `auditoria_ativar` para as entidades que precisarem de histórico.
  - Testes:
    - o dev move o Status e lê "In Progress → In Review" com o nome dele;
    - exclusão com justificativa;
    - FAIL numa rodada com `origem = form_factor`;
    - transferência para o Backup;
    - mudança de Category;
    - uma mudança recusada não acrescenta itens;
    - outra unidade recebe 404;
    - sem token, 401.
  - Verificação: `cd backend && uv run pytest tests/functional/test_historico_caso_teste_api.py` → verde

- [x] **T07b. Nome, perfil e tela no registro** (pedido depois da Fase 3)
  - Arquivos: `backend/src/infrastructure/data/migrations/versions/e038b1c2d3e4_auditoria_nome_perfil_tela.py`,
    `backend/src/infrastructure/data/auditoria.py`, `backend/src/api/dependencies.py`, o repositório, o schema
    e o `RegistroAuditoria` do histórico, `frontend/src/core/api/http-client.ts` e o teste
  - Cobre: RN-02, CA-10
  - Detalhe:
    - as colunas `usuario_nome`, `perfil_nome` e `tela`;
    - o trigger copia nome e perfil pelo `usuario_id`;
    - o front manda `X-Tela`, que a API reduz ao caminho (`tela_da_requisicao`) e o listener repassa como
      `app.tela`;
    - a resposta do histórico ganha `usuario_perfil`.
  - Testes:
    - o trigger grava nome, perfil e tela e não muda depois de renomear a pessoa;
    - sem usuário, as três ficam vazias;
    - o saneamento do cabeçalho;
    - o listener repassa a tela;
    - a migration sobe e desce;
    - o cliente HTTP manda o cabeçalho.
  - Verificação: `cd backend && uv run pytest` e `cd frontend && npx vitest run src/core/api` → verde

## Fase 4: Frontend
- [ ] **T08. Cliente, modo mock e hook**
  - Arquivos: `frontend/src/modules/projetos/api/projetos.api.ts`, `frontend/src/modules/projetos/model/*`,
    `frontend/src/modules/projetos/hooks/useProjetos.ts` e o teste, `frontend/src/core/mock/database.ts` e o
    teste
  - Cobre: CA-01 (modo mock)
  - Detalhe:
    - `historicoCasoTeste(id)`;
    - tipo `AlteracaoCasoTeste`;
    - `useHistoricoCasoTeste`, invalidado junto com o caso quando ele é editado, transferido ou recebe um PR;
    - no mock, `historicoCasosTeste` acrescentado nas operações de editar, transferir, excluir e PR.
  - Testes:
    - o mock registra a mudança de Status com o autor;
    - um caso de outra unidade no mock dá "não encontrado";
    - o hook refaz a consulta depois de uma edição.
  - Verificação: `cd frontend && npx vitest run src/core/mock src/modules/projetos/hooks` → verde
- [ ] **T09. Seção Histórico no painel de detalhes**
  - Arquivos: `frontend/src/modules/projetos/components/casos-teste/HistoricoCasoTeste.tsx` e o teste,
    `DetalhesCasoTesteDrawer.tsx`, `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-01, CA-02, CA-03, CA-08, RN-07
  - Detalhe:
    - lista em HeroUI (ADR 0037), abaixo dos PRs;
    - cada item mostra "Campo: anterior → novo", o autor com o perfil ("Ana Souza (Key Person)") ou "Sistema", a origem Form Factor quando houver, e
      data e hora;
    - estados carregando, vazio e erro;
    - textos nos três idiomas, revisados com `better-writing` e `better-accessibility`.
  - Testes:
    - renderiza os itens com os rótulos traduzidos;
    - estado vazio;
    - erro com "Tentar de novo".
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/components/casos-teste && npm run lint` → verde
- [ ] **T10. E2E e fechamento**
  - Arquivos: `frontend/e2e/historico-test-case.spec.ts` (novo), `docs/specs/038-historico-test-case/spec.md`,
    `docs/specs/README.md`
  - Cobre: CA-01 (navegador)
  - Detalhe: com a API simulada por `page.route` (o `playwright.config.ts` roda com `VITE_USE_MOCK=false`),
    abrir o painel de um caso mostra os itens do Histórico. No fim, a spec
    fica `Concluída` e o roadmap é atualizado.
  - Verificação: `cd frontend && npx playwright test e2e/historico-test-case.spec.ts && npm test && npm run lint` e `cd backend && uv run pytest` → verde

## Backlog
- **`test_bootstrap.py` falha neste ambiente, com ou sem a 038.** Num banco limpo e sem a migration 038, 3
  testes já falham (senha do admin, 401). No `sdf_manager_test`, que tem dados de outras execuções, falha um
  quarto, por uma unidade sem perfil `USUARIO_PADRAO`. É o mesmo problema dos backlogs das specs 017 e 023
  (testes sensíveis ao estado do banco e à senha do admin no `.env`). Não é desta spec.
