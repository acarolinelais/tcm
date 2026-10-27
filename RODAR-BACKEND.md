# Como rodar o backend em modo reload

Guia rápido para subir a API FastAPI localmente com recarga automática a cada alteração no código.

## Pré-requisitos
- **Docker** (para o Postgres local).
- **Python 3.13** e **uv** instalados.

## 1. Configurar o `.env` (uma vez por clone)
Na raiz do repositório:

```bash
cp .env.example .env
```

Ajuste no `.env`:
- `JWT_SECRET_KEY`: obrigatório, a API não sobe sem ele. Gere um valor com:
  ```bash
  python -c "import secrets; print(secrets.token_hex(32))"
  ```
- `DATABASE_URL`: o padrão (`postgresql+psycopg://postgres:postgres@localhost:5432/sdf_manager`) já bate
  com o `docker-compose.yml`.
- `VITE_USE_MOCK=false`, se quiser que o frontend use a API real.

O backend encontra o `.env` da raiz sozinho (via `python-dotenv`), mesmo rodando de dentro de `backend/`.

## 2. Subir o Postgres
Na raiz:

```bash
docker compose up -d
```

## 3. Instalar as dependências (primeira vez ou quando o `uv.lock` mudar)

```bash
cd backend
uv sync
```

## 4. Subir a API em modo reload
De dentro de `backend/`:

```bash
uv run uvicorn src.api.main:app --reload
```

As migrations do Alembic são aplicadas automaticamente quando a API inicia (ADR 0012).

Opções úteis:

```bash
# observar só o código-fonte (evita reiniciar por mudanças em testes, cache etc.)
uv run uvicorn src.api.main:app --reload --reload-dir src

# trocar a porta (o proxy do Vite aponta para 8000; mude lá também se trocar aqui)
uv run uvicorn src.api.main:app --reload --port 8001
```

Rodando a partir da raiz, sem `cd`:

```bash
uv run --project backend uvicorn src.api.main:app --app-dir backend --reload --reload-dir backend/src
```

## 5. Conferir
- API: <http://localhost:8000>
- Documentação (Scalar): <http://localhost:8000/scalar>
- Login local de bootstrap: `admin@sdfmanager.com`, com a senha definida em `BOOTSTRAP_ADMIN_SENHA` no `.env`.

## Problemas comuns
| Sintoma | Causa provável |
|---|---|
| `JWT_SECRET_KEY deve ter pelo menos 32 bytes.` | Variável vazia ou curta no `.env`. Gere um valor (passo 1). |
| `Defina BOOTSTRAP_ADMIN_SENHA antes de aplicar as migrations.` | Falta `BOOTSTRAP_ADMIN_SENHA` no `.env`. |
| `KeyError: 'DATABASE_URL'` | O `.env` não existe ou não tem `DATABASE_URL`. |
| Conexão recusada no Postgres | O container não está de pé: `docker compose ps` / `docker compose up -d`. |
| `ModuleNotFoundError: No module named 'src'` | O comando foi rodado fora de `backend/` sem `--app-dir backend`. |
| Porta 8000 em uso | Outra instância rodando; encerre-a ou use `--port`. |

> A autenticação ainda não está pronta para produção: não exponha a API fora do ambiente local.
