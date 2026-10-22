# backend

API em **FastAPI + SQLAlchemy + Alembic + Pydantic**, em Clean Architecture (ADR 0003).

As pastas em `src/` são as quatro camadas:

| Camada | Contém | Depende de |
|---|---|---|
| `domain/` | entidades, `PagedResult`, interfaces de repositório/UnitOfWork (Protocol), exceções | nada |
| `application/` | schemas Pydantic, validações, services | domain |
| `infrastructure/` | models/config SQLAlchemy, repositories, UnitOfWork, migrations Alembic | domain |
| `api/` | routers FastAPI, exception handlers, composição (DI), `main` | application, infrastructure |

> Vazio por enquanto (`.gitkeep`). O código de infraestrutura comum e a primeira entidade entram
> pela spec `001-fundacao`. Para adicionar uma entidade, use a skill `python-crud`.
