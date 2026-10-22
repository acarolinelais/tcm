# 0004. Repository, Unit of Work e PagedResult

- **Status:** Aceito
- **Data:** 2026-10-22

## Contexto
Os services precisam de operações de dados comuns a todas as entidades, de uma forma única de confirmar
uma transação e de um formato padronizado de resposta paginada.

## Decisão

**`RepositoryBase[T]`** (domain, como `Protocol`) com as operações básicas, implementado por um
`RepositoryBase` concreto na infrastructure sobre a `Session` do SQLAlchemy:
```python
class RepositoryBase(Protocol[T]):
    async def obter_por_id(self, id: UUID) -> T | None: ...
    async def listar_paginado(self, page: int, page_size: int) -> PagedResult[T]: ...
    async def adicionar(self, entity: T) -> None: ...
    # "atualizar" não precisa de método: uma entidade rastreada é persistida no commit.
```
- Cada entidade tem uma interface própria que estende a base: `UsuarioRepository(RepositoryBase[Usuario])`.
  Consultas específicas (por exemplo `existe_email`) entram só na interface da entidade.
- **Os repositórios nunca dão `commit`.** Eles só rastreiam as mudanças na `Session`.
- A exclusão é lógica por padrão (`ativar()` e `inativar()`). A remoção física (`remover`) existe no
  repositório, mas só é exposta pela API quando o `plan.md` justificar que a entidade não tem valor histórico (ADR 0008).

**`UnitOfWork`** (domain, `Protocol`) confirma a transação encapsulando a `Session`. O service chama
`commit` **uma vez** por caso de uso:
```python
class UnitOfWork(Protocol):
    async def commit(self) -> None: ...
    async def rollback(self) -> None: ...
```
A implementação na infrastructure recebe a mesma `Session` dos repositórios e chama `session.commit()`.

**`PagedResult[T]`** (domain/common) é o formato único de toda listagem:
```python
@dataclass(frozen=True)
class PagedResult(Generic[T]):
    items: Sequence[T]
    page: int
    page_size: int
    total_count: int

    @property
    def total_pages(self) -> int:
        return 0 if self.page_size == 0 else ceil(self.total_count / self.page_size)

    def map(self, fn: Callable[[T], R]) -> "PagedResult[R]":
        return PagedResult([fn(x) for x in self.items], self.page, self.page_size, self.total_count)
```
O repositório devolve `PagedResult[Entidade]`, e o service converte com `.map(to_response)`.

**`EntityBase`** (domain/common): `id` (UUID), `created_at`, `updated_at` e `ativo` (padrão `True`),
com os métodos `ativar()` e `inativar()`. As datas são preenchidas por eventos/defaults na camada de
infraestrutura, não pela entidade de domínio.

## Alternativas consideradas
- **`Session` direta no service:** menos código, mas acopla a `application` ao SQLAlchemy e foge do ADR 0003.
- **Repositório genérico sem interfaces por entidade:** não comporta consultas específicas de forma tipada.
- **`commit` dentro do repositório:** impede juntar várias operações em uma transação.

## Consequências
- ✅ O service controla a transação, e cada caso de uso tem exatamente um commit.
- ✅ Todo endpoint de listagem responde no mesmo formato, e o frontend tem um único tipo `PagedResult<T>`.
- ⚠️ A `Session` do SQLAlchemy já é um Unit of Work. Esta camada é uma abstração a mais, aceita para
  manter o `domain` e a `application` livres de SQLAlchemy.
