# 030. Links de PR do Test Case e painel de detalhes em todas as tabelas: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> Os testes de integração e funcionais do backend usam Testcontainers: o Docker precisa estar ligado.

## Fase 1: backend, domínio e banco

- [x] **T01. Entidade `LinkPullRequest` e validação da URL**
  - Arquivos: `backend/src/domain/entities/link_pull_request.py`, `backend/tests/unit/domain/test_link_pull_request.py`.
  - Cobre: CA-05, CA-06, CA-07 (domínio), RN-02, RN-05.
  - Verificação: `cd backend && uv run pytest tests/unit/domain/test_link_pull_request.py` →
    - `URL_MAX_LENGTH = 2000` e `DOMINIO = "github.sec.samsung.net"`;
    - `normalizar_url` tira os espaços das pontas; aceita `https://github.sec.samsung.net/org/repo/pull/12` e
      `https://GitHub.sec.samsung.net/...` (sem mudar o texto);
    - recusa com `ValueError`: sem protocolo, `http://`, `ftp://`, `https://`, branco, `github.com`, subdomínio,
      usuário/senha na URL, porta, espaço interno, 2.001 caracteres; 2.000 passa;
    - a entidade nasce ativa com `caso_teste_id`, `url` e `created_by`; `inativar()` a desativa.
- [x] **T02. Model, migration e repositório**
  - Arquivos: `backend/src/infrastructure/data/models/link_pull_request_model.py`, `backend/src/infrastructure/data/models/__init__.py`, `backend/src/infrastructure/data/migrations/versions/d030a1b2c3d4_links_pull_request.py` (`down_revision = "c028a1b2c3d4"`), `backend/src/domain/queries/link_pull_request_com_autor.py`, `backend/src/domain/entities/interfaces/link_pull_request_repository.py`, `backend/src/infrastructure/repositories/link_pull_request_repository.py`, `backend/tests/integration/test_link_pull_request_repository.py` (novo).
  - Cobre: CA-03, CA-08 (índice), CA-12 (persistência).
  - Verificação: `cd backend && uv run pytest tests/integration/test_link_pull_request_repository.py && uv run alembic heads` →
    - três links voltam ativos em `created_at` desc (desempate por `id`), com o nome do autor;
    - link inativo não volta na listagem nem em `existe_ativo`; link de outra unidade não volta;
    - o índice parcial recusa dois ativos iguais no mesmo caso e aceita a mesma URL em outro caso e depois de
      inativar;
    - `alembic heads` mostra uma cabeça só.

## Fase 2: backend, service e API

- [x] **T03. Schemas e casos de uso no service**
  - Arquivos: `backend/src/application/schemas/link_pull_request.py`, `backend/src/application/services/interfaces/caso_teste_service.py`, `backend/src/application/services/caso_teste_service.py`, `backend/src/api/dependencies.py`, `backend/tests/unit/application/services/test_caso_teste_service.py`.
  - Cobre: CA-02, CA-08, CA-09, CA-10, CA-12, CA-13, CA-14 (service), RN-04.
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_caso_teste_service.py` →
    - `adicionar_pull_request` grava `created_by` = usuário atual, um único `commit`, e devolve o nome do autor;
    - URL ativa repetida (com espaços) → `ConflictException`, sem `adicionar` nem `commit`;
    - `listar_pull_requests` devolve `pode_remover` verdadeiro para admin, gerente e KP no escopo e falso para dev;
    - `remover_pull_request`: KP e gerente inativam link de outra pessoa; dev → `ForbiddenException`, inclusive no
      próprio link; link inativo ou de outro caso → `NotFoundException`;
    - caso inexistente ou de projeto fora do escopo → `NotFoundException` nos três.
- [x] **T04. Rotas `/api/test-cases/{caso_id}/pull-requests`**
  - Arquivos: `backend/src/api/routers/test_cases.py`, `backend/tests/functional/test_casos_teste_api.py`.
  - Cobre: CA-02, CA-07, CA-08, CA-09, CA-10, CA-13, CA-14 (API).
  - Verificação: `cd backend && uv run pytest tests/functional/test_casos_teste_api.py` →
    - GET 200 com `itens` e `pode_remover`; POST válido 201 com `created_by_nome`; PATCH `.../inativar` 204;
    - POST com URL sem protocolo, `http`, outro domínio, 2.001 caracteres ou campo extra → 422 ProblemDetails, sem
      chamar o service;
    - 409 (duplicado), 403 (dev ao inativar) e 404 (caso ou link) saem como ProblemDetails;
    - as rotas aparecem no OpenAPI (`/scalar`).
- [x] **T05. Importação não toca nos links**
  - Arquivos: `backend/tests/integration/test_link_pull_request_repository.py`.
  - Cobre: CA-16, RN-08.
  - Verificação: `cd backend && uv run pytest tests/integration/test_link_pull_request_repository.py -k importacao` →
    com um caso que tem links, importar uma planilha pelo `ImportacaoProjetoServiceImpl` com repositórios reais
    mantém os mesmos links (ids, URLs, `ativo`).
- [x] **T05b. Suíte do backend do bloco**
  - Arquivos: nenhum.
  - Cobre: regressão das fases 1 e 2.
  - Verificação: `cd backend && uv run pytest && uv run ruff check . && uv run ruff format --check .` → verde
    (as falhas antigas de `tests/integration/test_bootstrap.py`, registradas na spec 028, ficam anotadas se
    persistirem).
  - Resultado: 686 passaram e 2 falharam, nenhuma desta spec (Postgres 18 local, banco `sdf_manager_test`, sem
    Docker): `test_resultado_form_factor_repository.py` (fuso do Postgres local, já falhava antes da spec) e
    `test_bootstrap.py::test_migration_seed_perfil_kp...`, que só falha a partir da 2ª rodada por sujeira deixada
    por `test_usuario_user_id_persistence.py` (ver Backlog). O ruff ficou verde.

## Fase 3: frontend, dados e modo mock

- [x] **T06. Tipos, schema zod, API e textos i18n**
  - Arquivos: `frontend/src/modules/projetos/model/projeto.ts`, `frontend/src/modules/projetos/model/projeto.test.ts` (novo, se não existir), `frontend/src/modules/projetos/api/projetos.api.ts`, `frontend/src/core/i18n/resources.ts`, `frontend/src/core/i18n/resources.test.ts`.
  - Cobre: CA-05, CA-06 (front), RN-02.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/model src/core/i18n && npx tsc --noEmit` →
    - `linkPullRequestSchema` aceita e recusa a mesma lista de exemplos da T01;
    - `casosTesteApi` tem `listarPullRequests`, `adicionarPullRequest` e `removerPullRequest`;
    - as chaves da seção, das validações, do vazio, da confirmação e dos toasts existem em en, pt e ko.
- [x] **T07. Mock guarda os links com as mesmas regras**
  - Arquivos: `frontend/src/core/mock/database.ts`, `frontend/src/core/mock/database.test.ts`.
  - Cobre: CA-02, CA-08, CA-10, CA-12, CA-13 (modo mock).
  - Verificação: `cd frontend && npx vitest run src/core/mock` → adicionar grava autor e data; duplicado entre
    ativos é recusado; remover é lógico e libera a URL; `pode_remover` falso para `USUARIO_PADRAO` e remoção
    recusada para ele; link já removido dá não encontrado.
- [x] **T08. Hooks de links de PR**
  - Arquivos: `frontend/src/modules/projetos/hooks/useProjetos.ts`.
  - Cobre: base das T09 e T10.
  - Verificação: `cd frontend && npx tsc --noEmit && npm run lint` → `usePullRequestsCasoTeste`,
    `useAdicionarPullRequest` e `useRemoverPullRequest` existem; as mutações invalidam a lista do caso; sem retry
    em 4xx. (Comportamento coberto pelos testes de componente da T09.)

## Fase 4: frontend, painel e tabelas

- [x] **T09. Seção `PullRequestsCasoTeste` no painel**
  - Arquivos: `frontend/src/modules/projetos/components/casos-teste/PullRequestsCasoTeste.tsx` (novo), `PullRequestsCasoTeste.test.tsx` (novo), `DetalhesCasoTesteDrawer.tsx`, `DetalhesCasoTesteDrawer.test.tsx`.
  - Cobre: CA-01 a CA-06, CA-08 a CA-11, CA-13, CA-15, RN-07, RN-10, RN-11.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/components/casos-teste && npm run lint` →
    - vazio mostra "Nenhum PR registrado"; itens na ordem da API, com link (`target="_blank"`,
      `rel="noopener noreferrer"`), data e hora e autor;
    - URL inválida ou de outro domínio mostra erro no campo e não chama a API; 409 vira erro no campo;
    - adicionar mostra o item e o toast de sucesso; o campo é limpo;
    - sem `pode_remover`, nenhum botão de remover; com ele, remover pede confirmação, cancelar mantém, confirmar
      remove e mostra o toast; 404 mostra toast de erro e recarrega a lista;
    - erro na listagem mostra mensagem e "tentar de novo", e os textos da planilha continuam;
    - o painel aceita `{ id, tc_id }`; a URL digitada some ao fechar e reabrir.
- [x] **T10. `TcIdBotao` nas tabelas de Test Cases e de Form Factor do projeto**
  - Arquivos: `frontend/src/modules/projetos/components/casos-teste/TcIdBotao.tsx` (novo), `TcIdBotao.test.tsx` (novo), `frontend/src/modules/projetos/pages/ProjetoDetalhePage.tsx`, `ProjetoDetalhePage.test.tsx`, `frontend/src/modules/projetos/components/form-factor/FormFactorTabela.tsx`, `FormFactorResultadosTabela.tsx`.
  - Cobre: CA-17, CA-18 (Test Cases, Form Factor e Resultados), RN-09.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos && npm run lint && npx tsc --noEmit` →
    - nos perfis dev e gestão, clique e Enter no TC ID das três tabelas abrem o painel daquele caso;
    - ao fechar, filtros e página continuam;
    - clicar no TC ID não abre edição inline nem o registro de resultado.
- [x] **T11. Painel nas tabelas de Resultados gerais**
  - Arquivos: `frontend/src/modules/projetos/components/form-factor/FormFactorGlobalTabela.tsx`, `frontend/src/modules/projetos/pages/ResultadosGeraisPage.tsx`, `ResultadosGeraisPage.test.tsx`.
  - Cobre: CA-17 (Resultados gerais), RN-09.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/pages/ResultadosGeraisPage.test.tsx && npm run lint && npx tsc --noEmit` →
    nas duas tabelas (resumo e histórico), clique e Enter no TC ID abrem o painel do caso, e ao fechar a tabela
    mantém filtros e página; o link do nome do projeto continua navegando.

## Fase 5: e2e

- [x] **T12. Fluxo de ponta a ponta dos links de PR**
  - Arquivos: `frontend/e2e/projetos.spec.ts`, `frontend/e2e/projetos-fixtures.ts`.
  - Cobre: CA-02, CA-06, CA-09, CA-17 (fluxo completo).
  - Verificação: `cd frontend && npx playwright test e2e/projetos.spec.ts -g "pull request"` (API simulada com
    `page.route`) → como gestão, abrir o painel pelo TC ID da tabela de Form Factor, ver o erro de um link do
    `github.com`, adicionar um do `github.sec.samsung.net`, vê-lo na lista e removê-lo com confirmação; como dev,
    adicionar funciona e não há botão de remover.

## Backlog
- Corrida na duplicidade de link de PR: o índice parcial barra o segundo POST igual, mas o `IntegrityError` sai como
  500, como já acontece com o TC ID. Um tratamento global (UnitOfWork convertendo violação de unicidade em
  `ConflictException`, ou handler na `api`) cobriria todos os casos sem trazer SQLAlchemy para `application`
  (decisão da fase 2).
- `tests/integration/test_usuario_user_id_persistence.py` grava duas unidades com commit e não apaga; a partir da 2ª
  rodada no mesmo banco, `test_bootstrap.py::test_migration_seed_perfil_kp_por_unidade_e_idempotente` falha
  (unidade sem perfil `USUARIO_PADRAO`). Mesma família do item de `test_bootstrap` da spec 028 (achado na T05b).
- `test_resultado_form_factor_repository.py::test_form_factor_mostra_resultado_mais_recente_por_modelo_na_mesma_linha`
  falha num Postgres com fuso diferente de UTC (data volta 4h). O teste ou a coluna deveriam fixar o fuso (achado na
  T05b, já falhava antes da spec).
- Os testes de integração rodados isoladamente no Windows falham com `ProactorEventLoop`; a política só é aplicada
  quando `src/infrastructure/data/session.py` é importado (na suíte completa, pelos funcionais). Um `conftest.py`
  de integração que a aplique resolveria; hoje é preciso `pytest -p src.infrastructure.data.session` (achado na T02).
- Migrations do mock (`readDb`): cada degrau termina com `return writeDb(db)`, então uma leitura sobe uma versão só e
  os testes precisam de `toBeGreaterThanOrEqual`. Tirar os `return` intermediários e gravar uma vez no fim deixaria a
  cascata numa leitura só (achado da `simplify` da fase 3).
- "Não repetir 4xx" (`semRetryEm4xx` em `useProjetos.ts`) vale para qualquer query; poderia ser o `retry` padrão do
  `QueryClient` em `core/providers`. Muda o comportamento global, então precisa de aprovação (achado da `simplify` da
  fase 3).
- No modo mock, `getMockCase` lança `Error` comum em vez de `ApiError` 404: um caso inexistente é tentado 3 vezes e o
  painel mostra "erro ao carregar" em vez de "não encontrado" (afeta o detalhe da spec 028 e os links desta spec).
  `mockCasosTesteApi.atualizar` também usa outra variante da regra de gestão; poderia usar `podeGerenciarCasosMock`
  (achado da `simplify` da fase 3).
- `ProjetosEntradaPage.tsx` repete a marcação de erro com "Tentar de novo" que virou `shared/ui/retry-alert.tsx`
  nesta spec; trocar por `RetryAlert` (achado da `simplify` da fase 4, arquivo de outra spec).
- `timestamp_utc` (antes `_timestamp_utc`) vive em `schemas/caso_teste.py` e o schema de links o importa de lá; um
  `schemas/comum.py` tiraria o acoplamento entre schemas de entidades diferentes (achado da `code-review`).
- Os casos de uso que partem de um Test Case (`obter`, `atualizar`, links de PR) não conferem `caso.ativo`; hoje a
  exclusão é pelo Status `Cancelled`, mas se a inativação lógica do caso passar a ser usada, todos precisam da
  checagem (achado da `code-review`).
