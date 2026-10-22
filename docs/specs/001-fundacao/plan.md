# 001. Fundação: esqueleto executável: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0001, 0002, 0003, 0004, 0005, 0006, 0007, 0008, 0009, 0010, 0011, 0012
- **ADRs novos propostos:** nenhum

## Abordagem
Construímos, de uma vez, a infraestrutura comum dos dois lados e a primeira entidade de referência,
**Usuário**, exatamente como os exemplos das skills `python-crud` e `react-crud` já descrevem. No backend:
Clean Architecture (`domain/application/infrastructure/api`), Postgres via SQLAlchemy assíncrono +
Alembic (migrations aplicadas no startup), `Usuario` com os 6 endpoints padrão. No frontend: Vite + React
+ TypeScript em arquitetura Modular (`core/shared/modules`), shadcn/ui + Tailwind, TanStack Query e
react-hook-form + zod, com o módulo `usuarios` (listagem paginada, criar/editar, ativar/inativar). O
layout do `core/` nasce funcional e sem estilo elaborado — a identidade visual (Figma) é uma spec futura.
Testes nos cinco níveis do ADR 0010, cobrindo cada `CA-xx` com sucesso e falha.

## Versões e ferramentas
| Área | Ferramenta | Versão |
|---|---|---|
| Backend | Python | 3.13 (CLAUDE.md) |
| Backend | Gerenciador de ambiente | uv |
| Backend | FastAPI | ^0.115 |
| Backend | SQLAlchemy | ^2.0 (assíncrono, `AsyncSession`) |
| Backend | Driver Postgres | psycopg ^3 |
| Backend | Alembic | ^1.13 |
| Backend | Pydantic | ^2 |
| Backend | pytest / httpx / testcontainers-python / import-linter | últimas versões estáveis compatíveis |
| Backend | Scalar (docs da API) | `scalar-fastapi` última estável |
| Frontend | Node | 24 LTS (versão já instalada no ambiente) |
| Frontend | Vite + React + TypeScript | últimas versões estáveis (React 18+) |
| Frontend | Tailwind + shadcn/ui | últimas versões estáveis |
| Frontend | TanStack Query / react-hook-form / zod | últimas versões estáveis |
| Frontend | Vitest + Testing Library / Playwright | últimas versões estáveis |
| Frontend | ESLint + `eslint-plugin-boundaries` | última versão estável |

As versões exatas (patch) ficam a cargo do `uv sync` / `npm install` dentro dessas faixas; não são decisão
de arquitetura, então não exigem ADR novo.

## Modelo de dados
| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| Usuario | id | UUID | gerado no construtor da entidade; chave primária |
| Usuario | nome | string(150) | obrigatório, 1 a 150 caracteres |
| Usuario | email | string(254) | obrigatório, formato de e-mail, único (normalizado para minúsculas) |
| Usuario | ativo | bool | padrão `true`; alterado só por `ativar()`/`inativar()` |
| Usuario | created_at | datetime | preenchido na infraestrutura ao persistir |
| Usuario | updated_at | datetime \| null | preenchido na infraestrutura ao atualizar |

## Contrato da API
| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/usuarios?page=&page_size=` | — | 200 `PagedResult<UsuarioResponse>` | 422 |
| GET | `/api/usuarios/{id}` | — | 200 `UsuarioResponse` | 404 |
| POST | `/api/usuarios` | `CriarUsuarioRequest` | 201 + `Location` | 422, 409 |
| PUT | `/api/usuarios/{id}` | `AtualizarUsuarioRequest` | 200 `UsuarioResponse` | 422, 404, 409 |
| PATCH | `/api/usuarios/{id}/ativar` | — | 204 | 404 |
| PATCH | `/api/usuarios/{id}/inativar` | — | 204 | 404 |

Erros no formato ProblemDetails (ADR 0006), `Content-Type: application/problem+json`.

## Backend: arquivos
**Infraestrutura comum (nova, construída uma única vez):**
- `backend/pyproject.toml`, `backend/uv.lock`, config de lint/format (ruff)
- `backend/src/domain/common/entity_base.py` — `EntityBase` (id, created_at, updated_at, ativo, ativar/inativar)
- `backend/src/domain/common/paged_result.py` — `PagedResult[T]`
- `backend/src/domain/common/exceptions.py` — `NotFoundException`, `ConflictException`
- `backend/src/domain/entities/interfaces/repository_base.py` — `RepositoryBase[T]` (Protocol)
- `backend/src/domain/entities/interfaces/unit_of_work.py` — `UnitOfWork` (Protocol)
- `backend/src/infrastructure/data/base.py` — `Base` declarativa do SQLAlchemy
- `backend/src/infrastructure/data/session.py` — engine/`AsyncSession`, lê `DATABASE_URL` do ambiente
- `backend/src/infrastructure/data/unit_of_work.py` — `UnitOfWorkImpl`
- `backend/src/infrastructure/repositories/repository_base.py` — `RepositoryBaseImpl[T, Model]` genérico
- `backend/src/infrastructure/data/migrations/` — `alembic.ini`, `env.py`, `script.py.mako`, `versions/`
- `backend/src/infrastructure/data/migrations_runner.py` — `aplicar_migrations()`
- `backend/src/api/error_handling/problem_details.py` — schema ProblemDetails + exception handlers
- `backend/src/api/dependencies.py` — `get_session` e composição de DI
- `backend/src/api/main.py` — app FastAPI, `lifespan` (aplica migrations), registra routers, Scalar em `/scalar`
- `backend/tests/architecture/test_dependencias.py` + config do import-linter — regras de dependência do ADR 0003

**Entidade `Usuario`** (receita `python-crud`):
- `backend/src/domain/entities/usuario.py`
- `backend/src/domain/entities/interfaces/usuario_repository.py`
- `backend/src/infrastructure/data/models/usuario_model.py`
- `backend/src/infrastructure/repositories/usuario_repository.py`
- `backend/src/application/schemas/usuario.py`
- `backend/src/application/services/interfaces/usuario_service.py`
- `backend/src/application/services/usuario_service.py`
- `backend/src/api/routers/usuarios.py`
- Migration gerada (`alembic revision --autogenerate`), revisada à mão
- `backend/tests/unit/application/services/test_usuario_service.py`
- `backend/tests/integration/repositories/test_usuario_repository.py`
- `backend/tests/functional/test_usuarios_api.py`

## Frontend: arquivos
**Base comum (nova, construída uma única vez):**
- `frontend/package.json`, `frontend/vite.config.ts` (proxy `/api` → backend), `tsconfig.json`,
  `tailwind.config.ts`, `postcss.config.js`, `components.json` (shadcn)
- `frontend/src/main.tsx`
- `frontend/src/core/providers/` — `QueryClientProvider`, `RouterProvider`
- `frontend/src/core/api/http-client.ts` — cliente HTTP base, trata ProblemDetails
- `frontend/src/core/layout/AppLayout.tsx` — layout mínimo (sem identidade visual elaborada)
- `frontend/src/core/router.tsx` — agrega as `routes` de cada módulo
- `frontend/src/shared/ui/` — componentes shadcn copiados (`button`, `input`, `table`, `dialog`, `form`,
  `badge`, `sonner`)
- `frontend/src/shared/api/problem-details.ts` — helper de erro (mapeia `errors` por campo)
- `frontend/src/shared/types/paged-result.ts` — `PagedResult<T>`
- `frontend/eslint.config.js` — regras de boundaries `core`/`shared`/`modules`
- `frontend/vitest.config.ts`, `frontend/playwright.config.ts`

**Módulo `usuarios`** (receita `react-crud`):
- `frontend/src/modules/usuarios/model/usuario.ts`
- `frontend/src/modules/usuarios/api/usuario.api.ts`
- `frontend/src/modules/usuarios/hooks/useUsuarios.ts`
- `frontend/src/modules/usuarios/components/UsuariosTable.tsx`
- `frontend/src/modules/usuarios/components/UsuarioForm.tsx`
- `frontend/src/modules/usuarios/components/UsuarioToggleAtivo.tsx`
- `frontend/src/modules/usuarios/pages/UsuariosPage.tsx`
- `frontend/src/modules/usuarios/routes.tsx`
- `frontend/src/modules/usuarios/index.ts`
- `frontend/src/modules/usuarios/api/usuario.api.test.ts`
- `frontend/src/modules/usuarios/components/UsuarioForm.test.tsx`
- `frontend/src/modules/usuarios/components/UsuariosTable.test.tsx`
- `frontend/e2e/usuarios.spec.ts`

## Critérios de aceite → testes
| CA | Nível | Teste |
|---|---|---|
| CA-01 | Funcional | `test_listar_sem_usuarios_retorna_vazio` |
| CA-02 | Funcional | `test_criar_request_valido_retorna_201` |
| CA-02 | E2E | `usuarios.spec.ts`: cadastra e vê o usuário na tabela |
| CA-03 (falha) | Unidade | `test_criar_email_duplicado_levanta_conflict` |
| CA-03 (falha) | Funcional | `test_criar_email_duplicado_retorna_409` |
| CA-04 (falha) | Funcional | `test_criar_payload_invalido_retorna_422` |
| CA-04 (falha) | Componente | `UsuarioForm.test.tsx`: form vazio não chama a API e mostra erros |
| CA-05 | Funcional | `test_atualizar_usuario_valido_retorna_200` |
| CA-06 | Funcional | `test_inativar_usuario_retorna_204` |
| CA-06 | Integração | `test_listar_paginado_oculta_inativos_por_padrao` |
| CA-07 (falha) | Funcional | `test_obter_id_inexistente_retorna_404` |
| CA-08 | Funcional | `test_app_inicia_e_aplica_migrations` |
| CA-08 | E2E | `usuarios.spec.ts`: app carrega e lista usuários do banco |

## Riscos e decisões pendentes
- Testcontainers exige Docker rodando nos testes de integração e funcionais (já é pré-requisito do
  projeto, CLAUDE.md).
- O `AppLayout` de `core/` nasce sem estilo elaborado; a spec seguinte (identidade visual a partir do
  Figma) estiliza por cima sem mudar a estrutura de pastas.
- `import-linter` precisa de uma config nova (`.importlinter` ou `[tool.importlinter]` no `pyproject.toml`);
  é ferramental de verificação do ADR 0003/0010, não uma decisão de arquitetura — não exige ADR novo.
