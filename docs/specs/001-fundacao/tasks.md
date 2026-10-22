# 001. Fundação: esqueleto executável: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, **até ~10 min**, verificável. Os testes vão junto com o código que eles cobrem,
> em uma task própria logo depois da implementação. Implementar com a skill `implement-task`, um bloco
> (fase) por vez.

## Fase 1: Setup do backend
- [x] **T01. Inicializar o projeto Python (uv) e as dependências**
  - Arquivos: `backend/pyproject.toml`, `backend/uv.lock`, `backend/.python-version`
  - Cobre: —
  - Verificação: `uv sync` → sem erro; `uv run python --version` → Python 3.13.x

- [x] **T02. Configurar ruff e pytest**
  - Arquivos: `backend/pyproject.toml` (`[tool.ruff]`, `[tool.pytest.ini_options]`)
  - Cobre: —
  - Verificação: `uv run ruff check backend/src` → sem erros

- [x] **T03. Adicionar `DATABASE_URL` ao ambiente**
  - Arquivos: `.env`, `.env.example`
  - Cobre: —
  - Verificação: `uv run python -c "from dotenv import load_dotenv; import os; load_dotenv('../.env'); assert os.environ['DATABASE_URL']"` → sem erro.
    ✅ Verificado contra Postgres real: o ambiente tem Postgres 18 nativo instalado (não via Docker); banco
    `sdf_manager` criado à mão. `docker compose up -d` continua indisponível (ver Backlog), mas o fluxo
    completo foi validado contra Postgres de verdade.

## Fase 2: Domain comum
- [x] **T04. Criar `EntityBase`**
  - Arquivos: `backend/src/domain/common/entity_base.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.domain.common.entity_base import EntityBase"` → sem erro

- [x] **T05. Criar `PagedResult` com teste de unidade**
  - Arquivos: `backend/src/domain/common/paged_result.py`, `backend/tests/unit/domain/test_paged_result.py`
  - Cobre: —
  - Verificação: `uv run pytest backend/tests/unit/domain/test_paged_result.py -q` → verde

- [x] **T06. Criar as exceções de domínio**
  - Arquivos: `backend/src/domain/common/exceptions.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.domain.common.exceptions import NotFoundException, ConflictException"` → sem erro

- [x] **T07. Criar os Protocols `RepositoryBase` e `UnitOfWork`**
  - Arquivos: `backend/src/domain/entities/interfaces/repository_base.py`, `backend/src/domain/entities/interfaces/unit_of_work.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.domain.entities.interfaces.repository_base import RepositoryBase"` → sem erro

## Fase 3: Infraestrutura comum
- [x] **T08. Criar a `Base` declarativa do SQLAlchemy**
  - Arquivos: `backend/src/infrastructure/data/base.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.infrastructure.data.base import Base"` → sem erro

- [x] **T09. Criar a sessão assíncrona (engine lendo `DATABASE_URL`)**
  - Arquivos: `backend/src/infrastructure/data/session.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.infrastructure.data.session import get_session"` → sem erro

- [x] **T10. Implementar `UnitOfWorkImpl`**
  - Arquivos: `backend/src/infrastructure/data/unit_of_work.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.infrastructure.data.unit_of_work import UnitOfWorkImpl"` → sem erro

- [x] **T11. Implementar `RepositoryBaseImpl` genérico com teste de unidade**
  - Arquivos: `backend/src/infrastructure/repositories/repository_base.py`, `backend/tests/unit/infrastructure/test_repository_base.py`
  - Cobre: —
  - Verificação: `uv run pytest backend/tests/unit/infrastructure -q` → verde

- [x] **T12. Inicializar o Alembic**
  - Arquivos: `backend/alembic.ini` (local real, gerado pelo `alembic init`), `backend/src/infrastructure/data/migrations/env.py`, `.../script.py.mako`
  - Cobre: —
  - Verificação: `uv run alembic history` → roda sem erro. ✅ `uv run alembic upgrade head` também
    executado contra o Postgres nativo (`sdf_manager`): aplicou sem erro.

- [x] **T13. Criar o `migrations_runner` (aplicar no startup)**
  - Arquivos: `backend/src/infrastructure/data/migrations_runner.py`
  - Cobre: CA-08 (parcial)
  - Verificação: `uv run python -c "from src.infrastructure.data.migrations_runner import ALEMBIC_INI_PATH"` → resolve o caminho do `alembic.ini` corretamente. ✅ `aplicar_migrations()` executado de
    verdade (via `alembic upgrade head` contra o Postgres nativo).

## Fase 4: API comum
- [x] **T14. Criar o schema `ProblemDetails`**
  - Arquivos: `backend/src/api/error_handling/problem_details.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.api.error_handling.problem_details import ProblemDetails"` → sem erro

- [x] **T15. Criar os exception handlers com teste de unidade**
  - Arquivos: `backend/src/api/error_handling/handlers.py`, `backend/tests/unit/api/test_problem_details.py`
  - Cobre: —
  - Verificação: `uv run pytest backend/tests/unit/api -q` → verde

- [x] **T16. Criar `api/dependencies.py` (`get_session`)**
  - Arquivos: `backend/src/api/dependencies.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.api.dependencies import get_session"` → sem erro

- [x] **T17. Criar `api/main.py` (lifespan aplica migrations, Scalar em `/scalar`)**
  - Arquivos: `backend/src/api/main.py`
  - Cobre: CA-08
  - Verificação: `uv run uvicorn src.api.main:app --app-dir backend` sobe sem erro; `curl -s -o /dev/null -w '%{http_code}' localhost:8000/scalar` → `200`.
    ✅ Testado com Postgres real: `POST /api/usuarios` → 201, `GET /api/usuarios` → lista o criado,
    e-mail duplicado → 409. Achado e corrigido um bug real: psycopg (modo assíncrono) não roda sobre o
    `ProactorEventLoop` padrão do asyncio no Windows — ver Backlog.

- [x] **T18. Configurar o import-linter com teste de arquitetura**
  - Arquivos: `backend/pyproject.toml` (`[tool.importlinter]`), `backend/tests/architecture/test_dependencias.py`
  - Cobre: —
  - Verificação: `uv run lint-imports` → passa

## Fase 5: Usuário — domain
- [x] **T19. Criar a entidade `Usuario`**
  - Arquivos: `backend/src/domain/entities/usuario.py`
  - Cobre: RN-01
  - Verificação: `uv run python -c "from src.domain.entities.usuario import Usuario"` → sem erro

- [x] **T20. Criar a interface `UsuarioRepository`**
  - Arquivos: `backend/src/domain/entities/interfaces/usuario_repository.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.domain.entities.interfaces.usuario_repository import UsuarioRepository"` → sem erro

- [x] **T21. Teste de unidade da entidade `Usuario`**
  - Arquivos: `backend/tests/unit/domain/test_usuario.py`
  - Cobre: RN-01, RN-02
  - Verificação: `uv run pytest backend/tests/unit/domain/test_usuario.py -q` → verde

## Fase 6: Usuário — infrastructure
- [x] **T22. Criar `UsuarioModel`**
  - Arquivos: `backend/src/infrastructure/data/models/usuario_model.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.infrastructure.data.models.usuario_model import UsuarioModel"` → sem erro

- [x] **T23. Gerar e revisar a migration do `Usuario`**
  - Arquivos: migration em `backend/src/infrastructure/data/migrations/versions/`
  - Cobre: —
  - Verificação: migration escrita à mão (sem `--autogenerate`, que exige conexão em tempo de geração);
    `uv run alembic history` reconhece a revisão. ✅ `upgrade head` aplicado contra o Postgres nativo —
    tabela `usuarios` criada com o schema esperado (conferido com `\d usuarios`).

- [x] **T24. Implementar `UsuarioRepositoryImpl` (`existe_email`)**
  - Arquivos: `backend/src/infrastructure/repositories/usuario_repository.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.infrastructure.repositories.usuario_repository import UsuarioRepositoryImpl"` → sem erro

- [ ] **T25. Testes de integração do repositório `Usuario`** ⚠️ bloqueado por Docker, ver Backlog
  - Arquivos: `backend/tests/integration/repositories/test_usuario_repository.py`
  - Cobre: CA-06, RN-02 (falha: índice único)
  - Verificação: `uv run pytest backend/tests/integration -q` → verde (Testcontainers Postgres)

## Fase 7: Usuário — application
- [x] **T26. Criar os schemas (`CriarUsuarioRequest`, `AtualizarUsuarioRequest`, `UsuarioResponse`, `to_response`)**
  - Arquivos: `backend/src/application/schemas/usuario.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.application.schemas.usuario import CriarUsuarioRequest, to_response"` → sem erro

- [x] **T27. Teste de unidade dos schemas**
  - Arquivos: `backend/tests/unit/application/schemas/test_usuario_schema.py`
  - Cobre: CA-04 (parcial: formato)
  - Verificação: `uv run pytest backend/tests/unit/application/schemas -q` → verde

- [x] **T28. Implementar `UsuarioService` (6 métodos)**
  - Arquivos: `backend/src/application/services/interfaces/usuario_service.py`, `backend/src/application/services/usuario_service.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.application.services.usuario_service import UsuarioServiceImpl"` → sem erro

- [x] **T29. Testes de unidade do `UsuarioService` — sucesso**
  - Arquivos: `backend/tests/unit/application/services/test_usuario_service.py`
  - Cobre: CA-02, CA-05
  - Verificação: `uv run pytest backend/tests/unit/application/services -k "not falha" -q` → verde

- [x] **T30. Testes de unidade do `UsuarioService` — falha**
  - Arquivos: `backend/tests/unit/application/services/test_usuario_service.py`
  - Cobre: CA-03 (falha), CA-06, CA-07 (falha)
  - Verificação: `uv run pytest backend/tests/unit/application -q` → verde

## Fase 8: Usuário — api
- [x] **T31. Criar o router `usuarios` (6 ações)**
  - Arquivos: `backend/src/api/routers/usuarios.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.api.routers.usuarios import router"` → sem erro

- [x] **T32. Registrar o service (DI) e o router no `main`**
  - Arquivos: `backend/src/api/dependencies.py`, `backend/src/api/main.py`
  - Cobre: —
  - Verificação: API sobe; `curl -s localhost:8000/openapi.json | grep '/api/usuarios'` → encontra as rotas

- [ ] **T33. Testes funcionais dos endpoints `usuarios` — sucesso** ⚠️ bloqueado por Docker, ver Backlog
  - Arquivos: `backend/tests/functional/test_usuarios_api.py`
  - Cobre: CA-01, CA-02, CA-05, CA-06, CA-08
  - Verificação: `uv run pytest backend/tests/functional -k "not falha" -q` → verde

- [ ] **T34. Testes funcionais dos endpoints `usuarios` — falha** ⚠️ bloqueado por Docker, ver Backlog
  - Arquivos: `backend/tests/functional/test_usuarios_api.py`
  - Cobre: CA-03 (falha), CA-04 (falha), CA-07 (falha)
  - Verificação: `uv run pytest backend/tests/functional -q` → verde

## Fase 9: Setup do frontend
- [x] **T35. Inicializar o projeto Vite + React + TypeScript**
  - Arquivos: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/index.html`, `frontend/src/main.tsx`
  - Cobre: —
  - Verificação: `cd frontend && npm install` → sem erro

- [x] **T36. Configurar o proxy `/api` no Vite**
  - Arquivos: `frontend/vite.config.ts`
  - Cobre: —
  - Verificação: `npm run build` → build sem erro

- [x] **T37. Configurar Tailwind**
  - Arquivos: `frontend/tailwind.config.ts`, `frontend/postcss.config.js`
  - Cobre: —
  - Verificação: `npm run build` → build sem erro

- [x] **T38. Instalar os componentes base do shadcn/ui**
  - Arquivos: `frontend/components.json`, `frontend/src/shared/ui/{button,input,table,dialog,form,badge,sonner}.tsx`
  - Cobre: —
  - Verificação: `npm run build` → build sem erro

- [x] **T39. Configurar ESLint com `eslint-plugin-boundaries`**
  - Arquivos: `frontend/eslint.config.js`
  - Cobre: —
  - Verificação: `npm run lint` → passa

- [x] **T40. Configurar Vitest**
  - Arquivos: `frontend/vitest.config.ts`
  - Cobre: —
  - Verificação: `npm test` → roda sem erro (0 testes)

- [x] **T41. Configurar Playwright**
  - Arquivos: `frontend/playwright.config.ts`, `frontend/e2e/.gitkeep`
  - Cobre: —
  - Verificação: `npx playwright install --with-deps` → ok

## Fase 10: Core comum do frontend
- [x] **T42. Criar o cliente HTTP base**
  - Arquivos: `frontend/src/core/api/http-client.ts`
  - Cobre: —
  - Verificação: `npm run build` → build sem erro

- [x] **T43. Criar `PagedResult<T>`**
  - Arquivos: `frontend/src/shared/types/paged-result.ts`
  - Cobre: —
  - Verificação: `npm run build` → build sem erro

- [x] **T44. Criar o helper de ProblemDetails com teste**
  - Arquivos: `frontend/src/shared/api/problem-details.ts`, `frontend/src/shared/api/problem-details.test.ts`
  - Cobre: —
  - Verificação: `npm test -- problem-details` → verde

- [x] **T45. Criar os providers (QueryClient/Router)**
  - Arquivos: `frontend/src/core/providers/`
  - Cobre: —
  - Verificação: `npm run build` → build sem erro

- [x] **T46. Criar o `AppLayout` mínimo**
  - Arquivos: `frontend/src/core/layout/AppLayout.tsx`
  - Cobre: —
  - Verificação: `npm run dev` → app sobe e renderiza sem erro no console

- [x] **T47. Criar o router agregador e montar em `main.tsx`**
  - Arquivos: `frontend/src/core/router.tsx`, `frontend/src/main.tsx`
  - Cobre: —
  - Verificação: `npm run dev` → app sobe sem erro no console

## Fase 11: Módulo usuarios — dados
- [x] **T48. Criar `model/usuario.ts` (tipos + schema zod)**
  - Arquivos: `frontend/src/modules/usuarios/model/usuario.ts`
  - Cobre: —
  - Verificação: `npm run build` → build sem erro

- [x] **T49. Criar o cliente HTTP do módulo com teste**
  - Arquivos: `frontend/src/modules/usuarios/api/usuario.api.ts`, `frontend/src/modules/usuarios/api/usuario.api.test.ts`
  - Cobre: —
  - Verificação: `npm test -- usuario.api` → verde

- [x] **T50. Criar os hooks TanStack Query do módulo**
  - Arquivos: `frontend/src/modules/usuarios/hooks/useUsuarios.ts`
  - Cobre: —
  - Verificação: `npm run build` → build sem erro

## Fase 12: Módulo usuarios — componentes
- [x] **T51. Criar `UsuarioForm` (criar/editar)**
  - Arquivos: `frontend/src/modules/usuarios/components/UsuarioForm.tsx`
  - Cobre: —
  - Verificação: `npm run build` → build sem erro

- [x] **T52. Testes de `UsuarioForm` — sucesso e falha**
  - Arquivos: `frontend/src/modules/usuarios/components/UsuarioForm.test.tsx`
  - Cobre: CA-04 (falha, frontend)
  - Verificação: `npm test -- UsuarioForm` → verde

- [x] **T53. Criar `UsuariosTable` (paginação no servidor)**
  - Arquivos: `frontend/src/modules/usuarios/components/UsuariosTable.tsx`
  - Cobre: —
  - Verificação: `npm run build` → build sem erro

- [x] **T54. Teste de `UsuariosTable`**
  - Arquivos: `frontend/src/modules/usuarios/components/UsuariosTable.test.tsx`
  - Cobre: CA-06
  - Verificação: `npm test -- UsuariosTable` → verde

- [x] **T55. Criar `UsuarioToggleAtivo`**
  - Arquivos: `frontend/src/modules/usuarios/components/UsuarioToggleAtivo.tsx`
  - Cobre: —
  - Verificação: `npm run build` → build sem erro

## Fase 13: Módulo usuarios — integração final
- [x] **T56. Criar `UsuariosPage`**
  - Arquivos: `frontend/src/modules/usuarios/pages/UsuariosPage.tsx`
  - Cobre: —
  - Verificação: `npm run build` → build sem erro

- [x] **T57. Criar `routes.tsx` e `index.ts` do módulo**
  - Arquivos: `frontend/src/modules/usuarios/routes.tsx`, `frontend/src/modules/usuarios/index.ts`
  - Cobre: —
  - Verificação: `npm run build` → build sem erro

- [x] **T58. Registrar a rota no core e o item no menu**
  - Arquivos: `frontend/src/core/router.tsx`, `frontend/src/core/layout/AppLayout.tsx`
  - Cobre: CA-01, CA-02, CA-05, CA-06
  - Verificação: `npm run lint` → verde (boundaries); `npm run dev` → `/usuarios` lista, cria e edita manualmente

- [ ] **T59. Testes e2e (Playwright) — sucesso** ⚠️ bloqueado por Docker, ver Backlog
  - Arquivos: `frontend/e2e/usuarios.spec.ts`
  - Cobre: CA-02, CA-08
  - Verificação: `npm run e2e -- -g "sucesso"` → verde

- [ ] **T60. Testes e2e (Playwright) — falha** ⚠️ bloqueado por Docker, ver Backlog
  - Arquivos: `frontend/e2e/usuarios.spec.ts`
  - Cobre: CA-04 (falha)
  - Verificação: `npm run e2e` → verde

## Backlog
- **Docker indisponível neste ambiente** (`O sistema não pode conectar ao Docker Desktop; a máquina não
  aceita virtualização necessária para WSL2/Hyper-V`). **Atualização:** a máquina tem **Postgres 18
  nativo instalado** (serviço Windows `postgresql-x64-18`, já rodando, credenciais iguais às do `.env`).
  Criamos o banco `sdf_manager` à mão e validamos contra ele: migration aplicada, API sobe, CRUD completo
  de `Usuario` funciona de ponta a ponta (criar, listar, conflito de e-mail). Isso ainda **não** é
  Testcontainers — os testes de integração/funcionais (ADR 0010) continuam escritos mas não executados,
  porque Testcontainers em si precisa de Docker pra orquestrar o container efêmero, não só de "um Postgres
  em algum lugar". Decisão pendente com o usuário: (a) esperar o Docker ser resolvido e manter Testcontainers
  como está no ADR 0010, ou (b) propor um ADR novo permitindo rodar esses testes contra o Postgres nativo
  local como alternativa (ganha velocidade, perde isolamento/paridade com CI). `docker compose up -d`
  continua indisponível.
- **Bug real encontrado e corrigido ao testar contra Postgres de verdade:** no Windows, o `asyncio` usa
  por padrão o `ProactorEventLoop`, que o driver assíncrono do psycopg3 não suporta — toda chamada à API
  quebrava com `InterfaceError`. Corrigido em `backend/src/infrastructure/data/session.py`, trocando a
  política do event loop pra `WindowsSelectorEventLoopPolicy` quando `sys.platform == "win32"`. Isso só
  apareceu porque testamos contra um banco real; os testes de unidade (com dublês) nunca criavam uma
  conexão de verdade, então nunca pegariam esse bug — reforça por que os níveis de integração/funcional
  do ADR 0010 importam.
- **`UsuarioToggleAtivo` usa `confirm()` nativo do navegador** em vez do `AlertDialog` do shadcn (receita
  `react-crud` sugere `AlertDialog`). Troca rápida depois, não bloqueia nada — é só polimento visual.
- **Bundle único de produção acima de 500kB** (aviso do Vite no build). Considerar `React.lazy` por módulo
  quando houver mais de um módulo de domínio; prematuro otimizar agora com só `usuarios`.
- **Sem `components.json`** (metadado da CLI do shadcn/ui) — os componentes em `shared/ui` foram escritos à
  mão em vez de via `npx shadcn add`, então não há esse arquivo de config. Funcionalmente equivalente; só
  relevante se decidirem usar a CLI do shadcn no futuro.
