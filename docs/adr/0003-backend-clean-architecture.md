# 0003. Backend em Clean Architecture

- **Status:** Aceito
- **Data:** 2026-10-22

## Contexto
O backend precisa de uma estrutura previsível, em que cada tipo de código tenha um lugar óbvio,
para que a IA e as pessoas sigam o mesmo padrão em todas as entidades.

## Decisão
Quatro pacotes em `backend/src/`, um por camada, com dependências só para dentro:

| Camada | Contém | Referencia |
|---|---|---|
| `domain` | `common/` (`EntityBase`, `PagedResult`, `exceptions`) e `entities/` (entidades + `interfaces/` com `RepositoryBase`, `UnitOfWork` e `XxxRepository` como `Protocol`) | nada |
| `application` | `schemas/`, `validators/`, `services/` (+ `services/interfaces/`) | domain |
| `infrastructure` | `data/` (`AppSession`/engine, `UnitOfWork`, `models/`, `migrations/` do Alembic), `repositories/` | domain |
| `api` | `routers/`, `error_handling/`, composição de dependências e `main.py` | application, infrastructure |

Convenções de pasta e nome (exemplo com `Usuario`):
```
domain/entities/usuario.py
domain/entities/interfaces/usuario_repository.py        # Protocol, estende RepositoryBase[Usuario]
application/services/usuario_service.py
application/services/interfaces/usuario_service.py       # Protocol
infrastructure/data/models/usuario_model.py
infrastructure/repositories/usuario_repository.py
api/routers/usuarios.py
```

**Injeção de dependências:** a composição vive na camada `api`. Os routers declaram o que precisam com
`Depends` do FastAPI, e um módulo de composição (`api/dependencies.py`) liga cada interface à sua
implementação (service → repository → session). Nenhum `Depends` do FastAPI aparece em `application`
ou `domain`: lá as dependências são parâmetros de construtor tipados pelas interfaces (`Protocol`).

```python
# api/dependencies.py (esboço)
def get_usuario_service(session: Session = Depends(get_session)) -> UsuarioService:
    uow = UnitOfWork(session)
    repo = UsuarioRepository(session)
    return UsuarioService(repo, uow, ...)
```

**Nomenclatura:** termos de domínio e casos de uso em português (`Usuario`, `listar`, `CriarUsuarioRequest`);
termos técnicos em inglês (`Repository`, `Service`, `Model`, `UnitOfWork`).

As regras de dependência são verificadas por testes de arquitetura com import-linter (ADR 0010).

## Alternativas consideradas
- **Vertical slice (pasta por feature):** menos arquivos, mas o objetivo aqui é estudar Clean Architecture.
- **Pacote único com módulos:** nenhuma regra de dependência seria garantida.
- **Estrutura idiomática enxuta (routers/services/models):** menos cerimônia, mas foge do estudo de camadas.

## Consequências
- ✅ Cada arquivo tem um lugar óbvio, e a skill `python-crud` vira uma receita mecânica.
- ✅ O `domain` não depende de SQLAlchemy nem de FastAPI, o que facilita testes de unidade.
- ⚠️ Mais arquivos por entidade (cerca de 8). É aceitável em troca da previsibilidade.
