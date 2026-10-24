# 022. Deploy inicial: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0005, 0008, 0011, 0012, 0014, 0027, 0028, 0030
- **ADRs novos propostos:** [0037](../../adr/0037-deploy-com-imagens-docker-e-compose.md) (imagens Docker e Compose de produção)

## Abordagem

Cada lado ganha um `Dockerfile` em estágios ao lado do código. A API vira uma imagem Python 3.13 com as
dependências do `uv.lock` (sem as de desenvolvimento) e um único `uvicorn`. O frontend é compilado com
`VITE_USE_MOCK=false` fixo e servido por um nginx, que também faz proxy de `/api` para a API, de modo que o
navegador fala com um único endereço. O `docker-compose.yml` da raiz continua só com o Postgres; o novo
`deploy/docker-compose.prod.yml` sobe Postgres, API e frontend com `restart: always`, healthchecks em
cadeia e segredos obrigatórios lidos de `deploy/.env`. Um teste de fumaça em shell sobe o Compose de
produção e verifica os critérios de aceite; o CI roda esse teste em todo PR.

## Estrutura de arquivos

```
backend/Dockerfile, backend/.dockerignore
frontend/Dockerfile, frontend/.dockerignore, frontend/nginx.conf
docker-compose.yml                 # inalterado (dev: só Postgres)
deploy/docker-compose.prod.yml     # produção
deploy/.env.example                # variáveis de produção, sem valores reais
deploy/smoke-test.sh               # sobe o Compose de produção e verifica os CAs
deploy/README.md                   # como subir, atualizar e parar em produção
```

## Imagens

| Imagem | Build | Execução |
|---|---|---|
| API (`backend/Dockerfile`) | `python:3.13-slim` + binário do `uv` (`ghcr.io/astral-sh/uv`), `uv sync --locked --no-dev --no-install-project`; copia `src/` e `alembic.ini` | Usuário sem root, `PYTHONUNBUFFERED=1`, `uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --proxy-headers`. Healthcheck chama `/api/health` com o Python da imagem (sem curl). |
| Frontend (`frontend/Dockerfile`) | `node:24-alpine`, `npm ci`, `VITE_USE_MOCK=false npm run build` (o `.env` da raiz fica fora do contexto de build) | `nginx:stable-alpine` sem root (porta 8080 no contêiner), servindo `dist/` com `frontend/nginx.conf`. |

`frontend/nginx.conf`:
- `try_files $uri /index.html` para as rotas do SPA (RN-05, CA-02).
- `location /api/` → `proxy_pass http://backend:8000`, com `X-Forwarded-*` e `client_max_body_size 25m` (limite de upload das planilhas).
- `index.html` com `Cache-Control: no-cache`; `/assets/` (nomes com hash) com cache longo `immutable`; gzip para texto.
- A documentação Scalar (`/scalar`) e o `/openapi.json` não são expostos em produção.

## Compose de produção

| Serviço | Imagem | Portas | Restart | Saúde / dependência |
|---|---|---|---|---|
| `postgres` | `postgres:18-alpine`, volume `postgres-data` | nenhuma | `always` | `pg_isready` |
| `backend` | build `../backend` | nenhuma (rede interna) | `always` | `/api/health`; espera `postgres` saudável |
| `frontend` | build `../frontend` | `${FRONTEND_PORT:-80}:8080` | `always` | espera `backend` saudável |

Variáveis (`deploy/.env`, todas obrigatórias com `${VAR:?...}`, exceto a porta): `POSTGRES_PASSWORD`,
`JWT_SECRET_KEY`, `BOOTSTRAP_ADMIN_SENHA`, `SENHA_INICIAL_USUARIOS`. `POSTGRES_DB`/`POSTGRES_USER` têm
padrão; o `DATABASE_URL` é montado no próprio Compose a partir delas. Nome de projeto fixo (`name: tcm`)
para o volume não depender da pasta de onde o comando roda.

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/health` | — | 200 `{ "status": "ok" }` | — (sem autenticação; só indica que o processo subiu e as migrations rodaram) |

## Backend: arquivos
- `backend/src/api/routers/health.py` e registro em `api/main.py` — rota pública de saúde (ADR 0008).
- `backend/tests/functional/test_health_api.py` — 200 sem token.
- `backend/Dockerfile`, `backend/.dockerignore` (exclui `.venv`, `tests`, caches, `.env`).

## Frontend: arquivos
- `frontend/Dockerfile`, `frontend/.dockerignore` (exclui `node_modules`, `dist`, `test-results`, `e2e`), `frontend/nginx.conf`.

## Infra, CI e documentação
- `deploy/*` conforme a estrutura acima.
- `.github/workflows/ci.yml` — job `deploy`: `docker compose -f deploy/docker-compose.prod.yml build` e `deploy/smoke-test.sh` com segredos de teste.
- `README.md` (raiz) e `CLAUDE.md` — seção de deploy; a regra de exposição passa a ser "somente rede interna até existir HTTPS".

## Critérios de aceite → testes

| CA | Nível | Verificação |
|---|---|---|
| CA-01 | Fumaça (CI) | `smoke-test.sh`: Compose sobe, três serviços `healthy`, `GET /` devolve o `index.html` e `POST /api/auth/login` com o admin inicial devolve 200 |
| CA-02 | Fumaça | `GET /projetos/qualquer-id` devolve 200 com o `index.html` |
| CA-03 | Fumaça | login e `GET /api/auth/me` pelo endereço do frontend com o token devolvem 200 |
| CA-04 | Fumaça | `docker kill` na API e no frontend → voltam a `healthy` sozinhos; `restart: always` conferido em `docker compose config` |
| CA-05 | Fumaça | cria um registro via API, `down` (sem `-v`) + `up` → o registro continua lá |
| CA-06 | Fumaça | `depends_on: service_healthy` em `config`; log da API mostra migrations aplicadas antes de aceitar requisições |
| CA-07 | Fumaça | `docker compose config` sem `JWT_SECRET_KEY` falha e cita a variável |
| CA-08 | Fumaça | `docker compose port` não publica API nem Postgres; conexão em `localhost:8000` e `:5432` recusada |
| CA-09 | Fumaça | o bundle servido não contém o banco mock (texto `sdf.mock.database`), e o login real funciona |
| CA-10 | Fumaça | `docker compose -f docker-compose.yml config --services` lista só `postgres` |
| CA-11 | CI | o job `deploy` falha quando o build de alguma imagem falha (o passo `build` precede o teste) |
| — | Funcional | `test_health_api.py`: `/api/health` responde 200 sem autenticação |

## Riscos e decisões pendentes
- Sem HTTPS: tokens trafegam em texto claro; o acesso precisa ficar restrito à rede interna (fora de escopo, registrado no ADR 0037).
- O job `deploy` precisa ser adicionado aos checks obrigatórios da proteção de branch no GitHub (passo manual, ADR 0028).
- `BOOTSTRAP_ADMIN_SENHA` só vale na primeira subida (a migration cria o admin uma vez); depois, a senha deve ser trocada pelo próprio admin.
- O build no servidor consome CPU e disco; `docker image prune` periódico fica a cargo do operador (documentado no `deploy/README.md`).
- Escalar a API para mais de uma instância exige tirar as migrations do startup (ADR 0012).
