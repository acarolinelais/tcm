---
name: python-crud
description: Receita para criar ou alterar uma entidade/recurso CRUD no backend Python deste repositório (Clean Architecture com domain, application, infrastructure e api, Repository + UnitOfWork, Pydantic, routers FastAPI em /api, PagedResult). Use sempre que for adicionar uma entidade, um endpoint, um repositório, um service, um schema/validação ou uma migration no backend.
---

# Skill: python-crud

Regras completas nos ADRs 0003 a 0008 e 0010. Esta skill é a **receita passo a passo**.
Os exemplos usam `Usuario`. Para outra entidade, troque `Usuario`/`usuario`/`usuarios` pelo nome dela
(domínio em português, termos técnicos em inglês).

> A infraestrutura comum (`EntityBase`, `PagedResult`, `RepositoryBase`, `UnitOfWork`, a `Session`/engine,
> as exceções, os handlers de ProblemDetails e a composição de DI) é criada uma única vez, pela spec 001.
> Aqui só se **adiciona uma entidade** sobre essa base. Não recrie nem altere a base sem um ADR.

## Ordem dos passos (cada passo importa/roda antes do próximo)

### 1. domain: entidade (`domain/entities/usuario.py`)
```python
class Usuario(EntityBase):          # EntityBase: id, created_at, updated_at, ativo, ativar(), inativar()
    # Limites usados pelo UsuarioModel (banco) e pelos schemas (API): fonte única
    NOME_MAX_LENGTH = 150
    EMAIL_MAX_LENGTH = 254

    def __init__(self, nome: str, email: str) -> None:
        super().__init__()
        self.atualizar(nome, email)

    def atualizar(self, nome: str, email: str) -> None:
        self._nome = nome
        self._email = self.normalizar_email(email)

    @property
    def nome(self) -> str: return self._nome

    @property
    def email(self) -> str: return self._email

    # E-mail único sem diferenciar maiúsculas de minúsculas (RN de unicidade da spec)
    @staticmethod
    def normalizar_email(email: str) -> str:
        return email.strip().lower()
```
Estado alterado só por métodos com nome de negócio. A entidade de domínio **não** importa SQLAlchemy.

### 2. domain: interface do repositório (`domain/entities/interfaces/usuario_repository.py`)
```python
class UsuarioRepository(RepositoryBase[Usuario], Protocol):
    # Recebe o e-mail como foi digitado; a implementação normaliza e compara por igualdade,
    # para usar o índice único da coluna
    async def existe_email(self, email: str, ignorar_id: UUID | None) -> bool: ...
```
Só consultas **específicas** da entidade. O CRUD básico já vem de `RepositoryBase[T]`
(`obter_por_id`, `listar_paginado`, `adicionar` e, se o plan justificar, `remover`).
A remoção física (`remover`) é exceção; o padrão é `ativar`/`inativar`, e a API só expõe `DELETE` quando o
`plan.md` justificar que a entidade não tem valor histórico (ADRs 0004 e 0008).

### 3. infrastructure: model SQLAlchemy (`infrastructure/data/models/usuario_model.py`)
```python
class UsuarioModel(Base):
    __tablename__ = "usuarios"
    id: Mapped[UUID] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(Usuario.NOME_MAX_LENGTH))
    email: Mapped[str] = mapped_column(String(Usuario.EMAIL_MAX_LENGTH))
    ativo: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime | None]
    __table_args__ = (UniqueConstraint("email", name="uq_usuarios_email"),)
```
Os tamanhos vêm das constantes da entidade (as mesmas dos schemas, passo 7). Nunca escreva o número aqui.
O mapeamento entre `UsuarioModel` e a entidade `Usuario` (ida e volta) fica no repositório (passo 4).

### 4. infrastructure: repositório (`infrastructure/repositories/usuario_repository.py`)
```python
class UsuarioRepositoryImpl(RepositoryBaseImpl[Usuario, UsuarioModel]):
    model = UsuarioModel

    async def existe_email(self, email: str, ignorar_id: UUID | None) -> bool:
        # Normaliza aqui, e não em cada chamador; igualdade simples usa o índice único
        normalizado = Usuario.normalizar_email(email)
        stmt = select(UsuarioModel.id).where(UsuarioModel.email == normalizado)
        if ignorar_id is not None:
            stmt = stmt.where(UsuarioModel.id != ignorar_id)
        return (await self.session.execute(stmt)).first() is not None
```
**Nunca** dê `commit` em um repositório (ADR 0004). O repositório só usa a `Session`.

### 5. api: composição de DI (`api/dependencies.py`)
Acrescente a fábrica do service e do repositório:
```python
def get_usuario_service(session: AsyncSession = Depends(get_session)) -> UsuarioService:
    repo = UsuarioRepositoryImpl(session)
    uow = UnitOfWorkImpl(session)
    return UsuarioServiceImpl(repo, uow)
```

### 6. Migration (Alembic)
```bash
uv run alembic revision --autogenerate -m "adicionar usuario"
```
Revise o arquivo gerado em `infrastructure/data/migrations/versions/`: tabela, colunas `snake_case`,
índice único e tamanhos. **Não** rode `alembic upgrade head` à mão: a migration é aplicada automaticamente
na próxima inicialização da API (ADR 0012). Por isso, revise com atenção qualquer migration que remova colunas/tabelas.

### 7. application: schemas e validação (`application/schemas/usuario.py`)
```python
class CriarUsuarioRequest(BaseModel):
    nome: str = Field(min_length=1, max_length=Usuario.NOME_MAX_LENGTH)
    email: EmailStr = Field(max_length=Usuario.EMAIL_MAX_LENGTH)

class AtualizarUsuarioRequest(CriarUsuarioRequest):
    pass

class UsuarioResponse(BaseModel):
    id: UUID
    nome: str
    email: str
    ativo: bool
    created_at: datetime

def to_response(u: Usuario) -> UsuarioResponse:
    return UsuarioResponse(id=u.id, nome=u.nome, email=u.email, ativo=u.ativo, created_at=u.created_at)
```
Limites sempre pelas constantes da entidade. Mensagens de validação em português (ADR 0006).
Regras que dependem de dados (e-mail único) ficam no service, não no schema.

### 8. application: service (`application/services/interfaces/usuario_service.py` + `.../usuario_service.py`)
Interface (`Protocol`):
```python
class UsuarioService(Protocol):
    async def listar(self, page: int, page_size: int) -> PagedResult[UsuarioResponse]: ...
    async def obter(self, id: UUID) -> UsuarioResponse: ...
    async def criar(self, request: CriarUsuarioRequest) -> UsuarioResponse: ...
    async def atualizar(self, id: UUID, request: AtualizarUsuarioRequest) -> UsuarioResponse: ...
    async def ativar(self, id: UUID) -> None: ...
    async def inativar(self, id: UUID) -> None: ...
```
Implementação:
```python
class UsuarioServiceImpl(UsuarioService):
    def __init__(self, repo: UsuarioRepository, uow: UnitOfWork) -> None:
        self._repo = repo
        self._uow = uow

    async def listar(self, page: int, page_size: int) -> PagedResult[UsuarioResponse]:
        return (await self._repo.listar_paginado(page, page_size)).map(to_response)

    async def criar(self, request: CriarUsuarioRequest) -> UsuarioResponse:
        await self._garantir_email_unico(request.email, None)
        usuario = Usuario(request.nome, request.email)
        await self._repo.adicionar(usuario)
        await self._uow.commit()
        return to_response(usuario)

    async def atualizar(self, id: UUID, request: AtualizarUsuarioRequest) -> UsuarioResponse:
        usuario = await self._obter_entidade(id)
        if Usuario.normalizar_email(request.email) != usuario.email:
            await self._garantir_email_unico(request.email, id)
        usuario.atualizar(request.nome, request.email)
        await self._uow.commit()
        return to_response(usuario)

    async def inativar(self, id: UUID) -> None:
        (await self._obter_entidade(id)).inativar()
        await self._uow.commit()

    async def _obter_entidade(self, id: UUID) -> Usuario:
        usuario = await self._repo.obter_por_id(id)
        if usuario is None:
            raise NotFoundException(f"Usuário {id} não encontrado.")
        return usuario

    async def _garantir_email_unico(self, email: str, ignorar_id: UUID | None) -> None:
        if await self._repo.existe_email(email, ignorar_id):
            raise ConflictException("Já existe um usuário com este e-mail.")
```
Regra: validar (schema) → carregar → regra de negócio → alterar a entidade → **um** `commit` → devolver o schema.

### 9. api: router (`api/routers/usuarios.py`)
Copie o router de referência do **ADR 0008**: `APIRouter(prefix="/api/usuarios")`, as 6 ações
(`listar`, `obter`, `criar`, `atualizar`, `ativar`, `inativar`), `Query(ge=..., le=...)` em `page` e `page_size`,
`Location` no `criar` e `status_code=204` em ativar e inativar. Registre o router no `api/main.py`.
Nenhuma lógica no router. Se o `plan.md` justificar o `DELETE` (ADR 0008), acrescente a ação `excluir` (204).

### 10. Testes: **sucesso e falha em cada nível** (ADR 0010)
| Pasta | Mínimo por entidade |
|---|---|
| `tests/unit` | Service: criar válido chama `adicionar` + `commit`. **Falha:** request inválido levanta erro de validação e `commit` **não** é chamado; e-mail duplicado levanta `ConflictException`; id inexistente levanta `NotFoundException`. |
| `tests/integration` | Repositório: adicionar + commit + `obter_por_id`; `listar_paginado` com total correto. **Falha:** violar o índice único levanta `IntegrityError`. |
| `tests/functional` | `POST` → 201 + `Location`; `GET` por id → 200; `PATCH /inativar` → 204. **Falha:** payload inválido → 422 com `errors`; `page_size=101` → 422; id inexistente → 404; e-mail duplicado → 409. |

Exemplo de teste de unidade de falha:
```python
async def test_criar_email_duplicado_levanta_conflict(usuario_service, repo):
    repo.existe_email = AsyncMock(return_value=True)

    with pytest.raises(ConflictException):
        await usuario_service.criar(CriarUsuarioRequest(nome="Ana", email="ana@x.com"))

    repo.adicionar.assert_not_called()
```

## Checklist de pronto
- [ ] Entidade com estado encapsulado e métodos de negócio; sem dependência de SQLAlchemy
- [ ] `UsuarioRepository(RepositoryBase[Usuario], Protocol)` em `domain/entities/interfaces/`
- [ ] `UsuarioModel` com tabela, tamanhos e índices; mapeamento model↔entidade no repositório; migration revisada
- [ ] Service registrado em `api/dependencies.py`
- [ ] Limites de tamanho como constantes na entidade, usadas pelo model e pelos schemas (nenhum número repetido)
- [ ] Schemas/validações com mensagens em português; testes com nome `test_<metodo>_<cenario>_<resultado>` (ADR 0010)
- [ ] Service com exatamente um `commit` por operação de escrita
- [ ] Router com as 6 ações REST, sem lógica, registrado no `main`
- [ ] Testes de unidade, integração e funcional com sucesso **e** falha; `uv run pytest` verde
- [ ] Testes de arquitetura (import-linter) continuam verdes
- [ ] A API sobe, aplica a migration sem erro, e os endpoints aparecem no `/scalar`
