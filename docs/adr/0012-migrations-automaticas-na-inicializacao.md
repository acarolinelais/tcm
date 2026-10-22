# 0012. Migrations aplicadas automaticamente na inicialização

- **Status:** Aceito
- **Data:** 2026-10-22

## Contexto
Rodar `alembic upgrade head` à mão depois de cada migration nova é fácil de esquecer, e a API
sobe com o schema desatualizado. Para estudar, o ciclo precisa ser: subir o Postgres, iniciar a API e tudo funcionar.

## Decisão
- A API aplica as migrations pendentes **toda vez que inicia**, antes de começar a aceitar requisições,
  no evento de startup (lifespan) do FastAPI.
- A lógica fica na infrastructure, para que a camada `api` não conheça o Alembic diretamente:
  ```python
  # infrastructure/data/migrations_runner.py
  def aplicar_migrations() -> None:
      config = Config(ALEMBIC_INI_PATH)
      command.upgrade(config, "head")

  # api/main.py (lifespan)
  @asynccontextmanager
  async def lifespan(app: FastAPI):
      aplicar_migrations()
      yield
  ```
- Se o banco estiver fora do ar ou a migration falhar, a API **não sobe**. O erro aparece no console e
  é melhor falhar cedo do que rodar com o schema errado.
- Os testes funcionais herdam esse comportamento: o app sobe e as migrations são aplicadas no Postgres do Testcontainers.

## Alternativas consideradas
- **`alembic upgrade head` manual:** é o mais seguro para produção, mas fácil de esquecer no dia a dia.
- **Aplicar só em ambiente de desenvolvimento:** o pedido é que qualquer inicialização aplique. Quando houver
  um ambiente de produção, um ADR novo pode restringir esse comportamento.

## Consequências
- ✅ `docker compose up -d` + iniciar a API é tudo o que se precisa para ter o banco atualizado.
- ⚠️ Com várias instâncias da API subindo ao mesmo tempo, elas disputariam a migration. Não é um problema
  enquanto houver uma só instância local.
- ⚠️ Uma migration destrutiva é aplicada sem confirmação. Revise toda migration gerada antes de iniciar a API.
