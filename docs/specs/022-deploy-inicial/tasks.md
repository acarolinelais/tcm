# 022. Deploy inicial: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> As verificações com `docker` precisam do Docker Desktop/Engine rodando.

## Fase 1: imagem da API

- [x] **T01. Expor a rota de saúde da API**
  - Arquivos: `backend/src/api/routers/health.py`, `backend/src/api/main.py`, `backend/tests/functional/test_health_api.py`
  - Cobre: CA-01, CA-06
  - Verificação: `cd backend && uv run pytest tests/functional/test_health_api.py` → `GET /api/health` responde 200 `{ "status": "ok" }` sem token; rota inexistente segue em 404.
- [x] **T02. Criar a imagem da API**
  - Arquivos: `backend/Dockerfile`, `backend/.dockerignore`
  - Cobre: CA-01, CA-11
  - Verificação: `docker build -t tcm-backend backend` → imagem construída sem `tests/` nem `.venv`; `docker run --rm tcm-backend id -u` → diferente de 0; `docker run --rm tcm-backend python -c "import src.api.main"` falha só por falta de `DATABASE_URL` (dependências presentes).

## Fase 2: imagem do frontend

- [ ] **T03. Configurar o nginx do frontend**
  - Arquivos: `frontend/nginx.conf`
  - Cobre: CA-02, CA-03
  - Verificação: `docker run --rm -v "$PWD/frontend/nginx.conf:/etc/nginx/conf.d/default.conf:ro" --add-host backend:127.0.0.1 nginx:stable-alpine nginx -t` → configuração válida (fallback do SPA, proxy de `/api`, `client_max_body_size 25m`, cache de `/assets`).
- [ ] **T04. Criar a imagem do frontend**
  - Arquivos: `frontend/Dockerfile`, `frontend/.dockerignore`
  - Cobre: CA-09, CA-11
  - Verificação: `docker build -t tcm-frontend frontend` → imagem construída; `docker run --rm tcm-frontend sh -c "grep -rl 'sdf.mock.database' /usr/share/nginx/html"` não encontra nada; `docker run --rm tcm-frontend id -u` → diferente de 0.

## Fase 3: Compose de produção e teste de fumaça

- [ ] **T05. Criar o Compose de produção e o exemplo de variáveis**
  - Arquivos: `deploy/docker-compose.prod.yml`, `deploy/.env.example`, `.gitignore`
  - Cobre: CA-04, CA-06, CA-07, CA-08, CA-10
  - Verificação: `docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.example config` → `restart: always` nos três serviços, só o frontend com porta publicada, `depends_on` com `service_healthy`; sem `JWT_SECRET_KEY` o `config` falha citando a variável; `docker compose config --services` na raiz → só `postgres`; `deploy/.env` ignorado pelo Git.
- [ ] **T06. Escrever o teste de fumaça da produção**
  - Arquivos: `deploy/smoke-test.sh`
  - Cobre: CA-01–CA-10
  - Verificação: `sh deploy/smoke-test.sh` → sobe o Compose com segredos de teste num projeto isolado, verifica cada CA (saúde, login, rota do SPA, API pela mesma origem, restart após `kill`, persistência após `down`/`up`, portas fechadas, bundle sem mock, falta de segredo) e derruba tudo, inclusive o volume de teste; termina com código 0.
- [ ] **T07. Documentar a operação e atualizar a regra de exposição**
  - Arquivos: `deploy/README.md`, `README.md`, `CLAUDE.md`
  - Cobre: RN-01, RN-09
  - Verificação: leitura → o `deploy/README.md` explica preparar o `.env`, subir, atualizar (`git pull` + `up -d --build`), ver logs, parar e limpar imagens antigas; o `CLAUDE.md` passa a dizer "somente rede interna até existir HTTPS".

## Fase 4: verificação contínua

- [ ] **T08. Rodar o build das imagens e o teste de fumaça no CI**
  - Arquivos: `.github/workflows/ci.yml`
  - Cobre: CA-11
  - Verificação: PR com o workflow novo → job `deploy` verde; um build quebrado de propósito (num commit descartado) deixa o job vermelho apontando a imagem. Registrar no PR que o job deve entrar nos checks obrigatórios da proteção de branch.

## Backlog
