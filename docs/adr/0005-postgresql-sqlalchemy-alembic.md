# 0005. PostgreSQL + SQLAlchemy + Alembic

- **Status:** Aceito
- **Data:** 2026-10-22

## Contexto
É preciso um banco relacional robusto, gratuito e fácil de subir localmente e em testes, acessado por
um ORM maduro e com migrations versionadas.

## Decisão
- **PostgreSQL**, acessado via **SQLAlchemy 2.0** (estilo declarativo com `Mapped`/`mapped_column`),
  com o driver `psycopg` (v3). O acesso é assíncrono (`AsyncSession`, `create_async_engine`).
- Postgres local via `docker compose` (`docker-compose.yml` na raiz). Nos testes, Testcontainers (ADR 0010).
- **Cada entidade tem um model SQLAlchemy** em `infrastructure/data/models/xxx_model.py`, separado da
  entidade de domínio (que não conhece o ORM). O model descreve tabela, colunas, tamanhos e índices:
  ```python
  class UsuarioModel(Base):
      __tablename__ = "usuarios"
      id: Mapped[UUID] = mapped_column(primary_key=True)
      nome: Mapped[str] = mapped_column(String(Usuario.NOME_MAX_LENGTH))
      email: Mapped[str] = mapped_column(String(Usuario.EMAIL_MAX_LENGTH))
      __table_args__ = (UniqueConstraint("email", name="uq_usuarios_email"),)
  ```
  Os tamanhos vêm de constantes da entidade de domínio (fonte única, usada também pelos validators).
- Nomes de tabelas e colunas em `snake_case`.
- O schema evolui por **migrations do Alembic**, versionadas em `infrastructure/data/migrations/` e
  aplicadas automaticamente quando a API inicia (ADR 0012). As migrations são autogeradas
  (`alembic revision --autogenerate`) e **revisadas à mão** antes de entrar.
- A URL de conexão vem de variável de ambiente (`DATABASE_URL`). Segredos nunca vão para o repositório.

## Alternativas consideradas
- **Django ORM:** vem com migrations e admin, mas acopla o projeto ao Django e foge da Clean Architecture.
- **SQLModel:** une Pydantic e SQLAlchemy, mas mistura schema de API com model de banco — queremos separados (ADR 0007).
- **SQLite nos testes:** simples, mas difere do Postgres em tipos e constraints, e os testes deixariam de ser fiéis.
- **Tortoise ORM / raw SQL:** menos maduros ou exigem escrever mapeamentos e migrations à mão.

## Consequências
- ✅ O mapeamento fica isolado na infrastructure, e o `domain` continua limpo.
- ✅ Os testes de integração rodam contra um Postgres real.
- ⚠️ Exige Docker instalado para desenvolver e testar.
- ⚠️ Manter o model SQLAlchemy separado da entidade de domínio custa um pouco de código de mapeamento.
