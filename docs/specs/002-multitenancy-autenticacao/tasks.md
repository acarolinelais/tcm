# 002. Multi-tenancy e autenticação: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, **até ~10 min**, verificável. Os testes vão junto com o código que eles cobrem,
> em uma task própria logo depois da implementação. Implementar com a skill `implement-task`, um bloco
> (fase) por vez.

> Concluído em 2026-10-22: T01–T59 implementadas. Migration do schema e seed aplicadas ao
> Postgres local; login do admin bootstrap validado. Suíte completa: 78 testes passando
> (incluindo API, integração com Postgres e arquitetura), com Ruff sem erros.

## Fase 1: Base comum nova
- [x] **T01. Criar `EntidadeTenant`**
  - Arquivos: `backend/src/domain/common/entidade_tenant.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.domain.common.entidade_tenant import EntidadeTenant"` → sem erro

- [x] **T02. Criar `PapelTime`**
  - Arquivos: `backend/src/domain/common/papel_time.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.domain.common.papel_time import PapelTime"` → sem erro

- [x] **T03. Criar `ForbiddenException` e `CredenciaisInvalidasException`**
  - Arquivos: `backend/src/domain/common/exceptions.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.domain.common.exceptions import ForbiddenException, CredenciaisInvalidasException"` → sem erro

- [x] **T04. Atualizar `RepositoryBase` (Protocol) com `unidade_id`**
  - Arquivos: `backend/src/domain/entities/interfaces/repository_base.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.domain.entities.interfaces.repository_base import RepositoryBase"` → sem erro

- [x] **T05. Atualizar `RepositoryBaseImpl` para filtrar por `unidade_id`**
  - Arquivos: `backend/src/infrastructure/repositories/repository_base.py`, `backend/tests/unit/infrastructure/test_repository_base.py` (ajustar fixtures com `unidade_id`)
  - Cobre: —
  - Verificação: `uv run pytest backend/tests/unit/infrastructure -q` → verde

## Fase 2: Entidades novas — domain
- [x] **T06. Criar a entidade `Unidade`**
  - Arquivos: `backend/src/domain/entities/unidade.py`
  - Cobre: RN-01
  - Verificação: `uv run python -c "from src.domain.entities.unidade import Unidade"` → sem erro

- [x] **T07. Criar a interface `UnidadeRepository`**
  - Arquivos: `backend/src/domain/entities/interfaces/unidade_repository.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.domain.entities.interfaces.unidade_repository import UnidadeRepository"` → sem erro

- [x] **T08. Criar a entidade `Setor`**
  - Arquivos: `backend/src/domain/entities/setor.py`
  - Cobre: RN-02
  - Verificação: `uv run python -c "from src.domain.entities.setor import Setor"` → sem erro

- [x] **T09. Criar a interface `SetorRepository`**
  - Arquivos: `backend/src/domain/entities/interfaces/setor_repository.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.domain.entities.interfaces.setor_repository import SetorRepository"` → sem erro

- [x] **T10. Teste de unidade da entidade `Setor`**
  - Arquivos: `backend/tests/unit/domain/test_setor.py`
  - Cobre: RN-02
  - Verificação: `uv run pytest backend/tests/unit/domain/test_setor.py -q` → verde

- [x] **T11. Criar a entidade `Time`**
  - Arquivos: `backend/src/domain/entities/time.py`
  - Cobre: RN-02, RN-03
  - Verificação: `uv run python -c "from src.domain.entities.time import Time"` → sem erro

- [x] **T12. Criar a entidade `TimeMembro`**
  - Arquivos: `backend/src/domain/entities/time_membro.py`
  - Cobre: RN-02, RN-04
  - Verificação: `uv run python -c "from src.domain.entities.time_membro import TimeMembro"` → sem erro

- [x] **T13. Criar as interfaces `TimeRepository` e `TimeMembroRepository`**
  - Arquivos: `backend/src/domain/entities/interfaces/time_repository.py`, `backend/src/domain/entities/interfaces/time_membro_repository.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.domain.entities.interfaces.time_repository import TimeRepository"` → sem erro

- [x] **T14. Teste de unidade das entidades `Time`/`TimeMembro`**
  - Arquivos: `backend/tests/unit/domain/test_time.py`
  - Cobre: RN-03, RN-04
  - Verificação: `uv run pytest backend/tests/unit/domain/test_time.py -q` → verde

## Fase 3: Retrofit `Usuario` — domain
- [x] **T15. Alterar a entidade `Usuario`** (estende `EntidadeTenant`; `+unidade_id`, `+admin_unidade`, `+senha_hash`, `+definir_senha_hash`)
  - Arquivos: `backend/src/domain/entities/usuario.py`
  - Cobre: RN-01, RN-06
  - Verificação: `uv run python -c "from src.domain.entities.usuario import Usuario"` → sem erro

- [x] **T16. Atualizar o teste de unidade de `Usuario`** (construtor agora pede `unidade_id`)
  - Arquivos: `backend/tests/unit/domain/test_usuario.py`
  - Cobre: RN-01
  - Verificação: `uv run pytest backend/tests/unit/domain/test_usuario.py -q` → verde

- [x] **T17. Alterar `UsuarioRepository`** (`+ obter_por_email`)
  - Arquivos: `backend/src/domain/entities/interfaces/usuario_repository.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.domain.entities.interfaces.usuario_repository import UsuarioRepository"` → sem erro

## Fase 4: Infraestrutura — models e repositórios
- [x] **T18. Criar `UnidadeModel`**
  - Arquivos: `backend/src/infrastructure/data/models/unidade_model.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.infrastructure.data.models.unidade_model import UnidadeModel"` → sem erro

- [x] **T19. Criar `UnidadeRepositoryImpl`**
  - Arquivos: `backend/src/infrastructure/repositories/unidade_repository.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.infrastructure.repositories.unidade_repository import UnidadeRepositoryImpl"` → sem erro

- [x] **T20. Criar `SetorModel`**
  - Arquivos: `backend/src/infrastructure/data/models/setor_model.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.infrastructure.data.models.setor_model import SetorModel"` → sem erro

- [x] **T21. Criar `SetorRepositoryImpl`**
  - Arquivos: `backend/src/infrastructure/repositories/setor_repository.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.infrastructure.repositories.setor_repository import SetorRepositoryImpl"` → sem erro

- [x] **T22. Criar `TimeModel` e `TimeMembroModel`**
  - Arquivos: `backend/src/infrastructure/data/models/time_model.py`, `backend/src/infrastructure/data/models/time_membro_model.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.infrastructure.data.models.time_model import TimeModel; from src.infrastructure.data.models.time_membro_model import TimeMembroModel"` → sem erro

- [x] **T23. Criar `TimeRepositoryImpl` e `TimeMembroRepositoryImpl`**
  - Arquivos: `backend/src/infrastructure/repositories/time_repository.py`, `backend/src/infrastructure/repositories/time_membro_repository.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.infrastructure.repositories.time_repository import TimeRepositoryImpl"` → sem erro

- [x] **T24. Alterar `UsuarioModel`** (`+unidade_id`, `+admin_unidade`, `+senha_hash`)
  - Arquivos: `backend/src/infrastructure/data/models/usuario_model.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.infrastructure.data.models.usuario_model import UsuarioModel"` → sem erro

- [x] **T25. Alterar `UsuarioRepositoryImpl`** (filtro por `unidade_id`, `+ obter_por_email`)
  - Arquivos: `backend/src/infrastructure/repositories/usuario_repository.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.infrastructure.repositories.usuario_repository import UsuarioRepositoryImpl"` → sem erro

- [x] **T26. Teste de unidade de `obter_por_email`**
  - Arquivos: `backend/tests/unit/infrastructure/test_usuario_repository.py`
  - Cobre: —
  - Verificação: `uv run pytest backend/tests/unit/infrastructure/test_usuario_repository.py -q` → verde

## Fase 5: Migration de schema
- [x] **T27. Escrever a migration do schema novo** (tabelas `unidades`, `setores`, `times`, `time_membros`; altera `usuarios`)
  - Arquivos: migration em `backend/src/infrastructure/data/migrations/versions/`
  - Cobre: —
  - Verificação: `uv run alembic history` reconhece a revisão

- [x] **T28. Aplicar a migration contra o Postgres real e conferir o schema**
  - Arquivos: —
  - Cobre: —
  - Verificação: `uv run alembic upgrade head` → sem erro; `\d unidades`, `\d setores`, `\d times`, `\d time_membros`, `\d usuarios` conferem com o `plan.md`

## Fase 6: Segurança
- [x] **T29. Criar `senha_hasher` (Argon2) com teste**
  - Arquivos: `backend/src/infrastructure/security/senha_hasher.py`, `backend/tests/unit/infrastructure/test_senha_hasher.py`
  - Cobre: RN-06
  - Verificação: `uv run pytest backend/tests/unit/infrastructure/test_senha_hasher.py -q` → verde

- [x] **T30. Criar `jwt.py` (criar/decodificar token) com teste**
  - Arquivos: `backend/src/infrastructure/security/jwt.py`, `backend/tests/unit/infrastructure/test_jwt.py`
  - Cobre: —
  - Verificação: `uv run pytest backend/tests/unit/infrastructure/test_jwt.py -q` → verde

- [x] **T31. Criar a interface `Autenticador`**
  - Arquivos: `backend/src/domain/entities/interfaces/autenticador.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.domain.entities.interfaces.autenticador import Autenticador"` → sem erro

- [x] **T32. Criar `AutenticadorLocal` com teste**
  - Arquivos: `backend/src/infrastructure/security/autenticador_local.py`, `backend/tests/unit/infrastructure/test_autenticador_local.py`
  - Cobre: CA-01, CA-02 (falha)
  - Verificação: `uv run pytest backend/tests/unit/infrastructure/test_autenticador_local.py -q` → verde

## Fase 7: Application — schemas e services
- [x] **T33. Criar os schemas de `Setor`**
  - Arquivos: `backend/src/application/schemas/setor.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.application.schemas.setor import CriarSetorRequest, to_response"` → sem erro

- [x] **T34. Implementar `SetorService`** (criar, listar — sem checagem de papel ainda)
  - Arquivos: `backend/src/application/services/interfaces/setor_service.py`, `backend/src/application/services/setor_service.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.application.services.setor_service import SetorServiceImpl"` → sem erro

- [x] **T35. Teste de unidade do `SetorService` — sucesso**
  - Arquivos: `backend/tests/unit/application/services/test_setor_service.py`
  - Cobre: CA-04
  - Verificação: `uv run pytest backend/tests/unit/application/services/test_setor_service.py -q` → verde

- [x] **T36. Criar os schemas de `Time`** (criar time, adicionar membro, atualizar papel)
  - Arquivos: `backend/src/application/schemas/time.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.application.schemas.time import CriarTimeRequest, AdicionarMembroRequest"` → sem erro

- [x] **T37. Implementar `TimeService`** (criar time, listar, adicionar membro, atualizar papel — sem checagem de papel ainda)
  - Arquivos: `backend/src/application/services/interfaces/time_service.py`, `backend/src/application/services/time_service.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.application.services.time_service import TimeServiceImpl"` → sem erro

- [x] **T38. Teste de unidade do `TimeService` — sucesso**
  - Arquivos: `backend/tests/unit/application/services/test_time_service.py`
  - Cobre: CA-06, CA-07, CA-09
  - Verificação: `uv run pytest backend/tests/unit/application/services/test_time_service.py -q` → verde

- [x] **T39. Alterar `UsuarioServiceImpl`** (`listar`/`obter` passam a receber `unidade_id`)
  - Arquivos: `backend/src/application/services/usuario_service.py`, `backend/src/application/services/interfaces/usuario_service.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.application.services.usuario_service import UsuarioServiceImpl"` → sem erro

- [x] **T40. Atualizar os testes de unidade do `UsuarioService`** (passar `unidade_id` nos mocks)
  - Arquivos: `backend/tests/unit/application/services/test_usuario_service.py`
  - Cobre: —
  - Verificação: `uv run pytest backend/tests/unit/application/services/test_usuario_service.py -q` → verde

- [x] **T41. Criar os schemas de `auth`**
  - Arquivos: `backend/src/application/schemas/auth.py`
  - Cobre: —
  - Verificação: `uv run python -c "from src.application.schemas.auth import LoginRequest, TokenResponse"` → sem erro

- [x] **T42. Implementar `AuthService` com testes de sucesso e falha**
  - Arquivos: `backend/src/application/services/interfaces/auth_service.py`, `backend/src/infrastructure/services/auth_service.py`, `backend/tests/unit/application/services/test_auth_service.py`
  - Cobre: CA-01, CA-02 (falha)
  - Verificação: `uv run pytest backend/tests/unit/application/services/test_auth_service.py -q` → verde

## Fase 8: API — erros, dependencies e routers
- [x] **T43. Registrar os handlers de `ForbiddenException` (403) e `CredenciaisInvalidasException` (401)**
  - Arquivos: `backend/src/api/error_handling/handlers.py`, `backend/tests/unit/api/test_problem_details.py` (novos casos)
  - Cobre: —
  - Verificação: `uv run pytest backend/tests/unit/api -q` → verde

- [x] **T44. Criar a dependency `get_usuario_atual`** (decodifica `Authorization: Bearer`)
  - Arquivos: `backend/src/api/dependencies.py`
  - Cobre: CA-03 (falha, parcial)
  - Verificação: `uv run python -c "from src.api.dependencies import get_usuario_atual"` → sem erro

- [x] **T45. Criar o router `auth` e registrar**
  - Arquivos: `backend/src/api/routers/auth.py`, `backend/src/api/dependencies.py` (`+ get_auth_service`), `backend/src/api/main.py`
  - Cobre: —
  - Verificação: API sobe; `curl -s localhost:8000/openapi.json | grep '/api/auth/login'` → encontra a rota

- [x] **T46. Proteger o router `usuarios`** (`Depends(get_usuario_atual)`, repassa `unidade_id`)
  - Arquivos: `backend/src/api/routers/usuarios.py`
  - Cobre: CA-03 (falha)
  - Verificação: `uv run python -c "from src.api.routers.usuarios import router"` → sem erro

- [x] **T47. Criar o router `setores` e registrar** (sem checagem de papel ainda)
  - Arquivos: `backend/src/api/routers/setores.py`, `backend/src/api/dependencies.py` (`+ get_setor_service`), `backend/src/api/main.py`
  - Cobre: —
  - Verificação: `curl -s localhost:8000/openapi.json | grep '/api/setores'` → encontra a rota

- [x] **T48. Adicionar a checagem de `admin_unidade` ao `SetorService.criar`, com teste de falha**
  - Arquivos: `backend/src/application/services/setor_service.py`, `backend/tests/unit/application/services/test_setor_service.py`
  - Cobre: CA-05 (falha)
  - Verificação: `uv run pytest backend/tests/unit/application/services/test_setor_service.py -q` → verde

- [x] **T49. Criar o router `times` e registrar** (sem checagem de papel ainda)
  - Arquivos: `backend/src/api/routers/times.py`, `backend/src/api/dependencies.py` (`+ get_time_service`), `backend/src/api/main.py`
  - Cobre: —
  - Verificação: `curl -s localhost:8000/openapi.json | grep '/api/times'` → encontra a rota

- [x] **T50. Adicionar a checagem de posse (admin ou gerente do time) ao `TimeService`, com teste de falha**
  - Arquivos: `backend/src/application/services/time_service.py`, `backend/tests/unit/application/services/test_time_service.py`
  - Cobre: CA-08 (falha)
  - Verificação: `uv run pytest backend/tests/unit/application/services/test_time_service.py -q` → verde

## Fase 9: Seed/bootstrap
- [x] **T51. Adicionar `BOOTSTRAP_ADMIN_SENHA` ao `.env`/`.env.example`**
  - Arquivos: `.env`, `.env.example`
  - Cobre: —
  - Verificação: leitura via `python-dotenv` confirma o valor presente

- [x] **T52. Escrever a migration de seed** (Unidade Manaus + admin bootstrap)
  - Arquivos: migration em `backend/src/infrastructure/data/migrations/versions/`
  - Cobre: RN-07
  - Verificação: `uv run alembic history` reconhece a revisão

- [x] **T53. Aplicar a migration de seed e conferir**
  - Arquivos: —
  - Cobre: CA-11
  - Verificação: `uv run alembic upgrade head` → sem erro; `SELECT * FROM unidades; SELECT email, admin_unidade FROM usuarios;` mostra a Unidade Manaus e a admin

## Fase 10: Testes funcionais e de integração (Postgres real)
- [x] **T54. Teste funcional de login — sucesso e falha**
  - Arquivos: `backend/tests/functional/test_auth_api.py`
  - Cobre: CA-01, CA-02 (falha)
  - Verificação: `uv run pytest backend/tests/functional/test_auth_api.py -q` → verde

- [x] **T55. Teste funcional de endpoint protegido sem token**
  - Arquivos: `backend/tests/functional/test_auth_api.py`
  - Cobre: CA-03 (falha)
  - Verificação: `uv run pytest backend/tests/functional/test_auth_api.py -q` → verde

- [x] **T56. Teste funcional de `setores` — sucesso e falha**
  - Arquivos: `backend/tests/functional/test_setores_api.py`
  - Cobre: CA-04, CA-05 (falha)
  - Verificação: `uv run pytest backend/tests/functional/test_setores_api.py -q` → verde

- [x] **T57. Teste funcional de `times` e membros — sucesso e falha**
  - Arquivos: `backend/tests/functional/test_times_api.py`
  - Cobre: CA-06, CA-07, CA-08 (falha), CA-09
  - Verificação: `uv run pytest backend/tests/functional/test_times_api.py -q` → verde

- [x] **T58. Teste de integração de isolamento cross-tenant**
  - Arquivos: `backend/tests/integration/test_isolamento_tenant.py`
  - Cobre: CA-10 (falha)
  - Verificação: `uv run pytest backend/tests/integration/test_isolamento_tenant.py -q` → verde

- [x] **T59. Teste de integração do bootstrap**
  - Arquivos: `backend/tests/integration/test_bootstrap.py`
  - Cobre: CA-11
  - Verificação: `uv run pytest backend/tests/integration/test_bootstrap.py -q` → verde

## Backlog
- Nenhum item pendente desta spec.
