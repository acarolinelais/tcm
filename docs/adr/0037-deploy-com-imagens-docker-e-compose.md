# 0037. Deploy com imagens Docker e Compose de produção

- **Status:** Aceito
- **Data:** 2026-10-24

## Contexto
Até aqui o sistema só roda na máquina de desenvolvimento: o Postgres sobe pelo `docker-compose.yml` da raiz
(ADR 0005) e API e frontend são iniciados à mão (`uvicorn`, `vite`). Para o deploy inicial (spec 022) é
preciso empacotar API e frontend e subir o sistema completo num servidor único, de forma repetível, sem
HTTPS por enquanto (acesso restrito à rede interna) e sem registro de imagens.

## Decisão
- **Cada lado tem o seu `Dockerfile`**, ao lado do código: `backend/Dockerfile` e `frontend/Dockerfile`,
  com `.dockerignore` próprio. Os dois usam build em estágios e a imagem final roda sem root.
  - API: Python 3.13 + `uv sync --locked --no-dev`; um único processo `uvicorn` (as migrations rodam no
    startup, ADR 0012, então não há mais de uma instância).
  - Frontend: Node faz o `vite build` com `VITE_USE_MOCK=false` fixo; a imagem final é um **nginx** que
    serve os arquivos estáticos, devolve `index.html` para rotas do SPA e faz proxy de `/api` para a API.
- **O navegador fala só com o nginx.** API e Postgres não publicam portas: ficam na rede interna do
  Compose. Mesma origem para páginas e API, sem CORS.
- **Dois arquivos Compose com papéis distintos:**
  - `docker-compose.yml` (raiz): desenvolvimento, só o Postgres, como hoje.
  - `deploy/docker-compose.prod.yml`: produção, Postgres + API + frontend, `restart: always`, healthchecks
    e `depends_on: condition: service_healthy`. Os segredos vêm de `deploy/.env` (fora do Git), lidos com
    `${VAR:?mensagem}` para a subida falhar quando faltar algum.
- **Build no servidor:** a atualização é `git pull` + `docker compose -f deploy/docker-compose.prod.yml up -d --build`.
  O CI constrói as duas imagens e sobe o Compose de produção num teste de fumaça a cada PR.
- A API ganha `GET /api/health` (200 quando o processo está pronto) para o healthcheck.

```yaml
# deploy/docker-compose.prod.yml (trecho)
backend:
  build: ../backend
  restart: always
  environment:
    JWT_SECRET_KEY: ${JWT_SECRET_KEY:?Defina JWT_SECRET_KEY em deploy/.env}
  depends_on:
    postgres: { condition: service_healthy }
```

## Alternativas consideradas
- **Composes em `docs/`:** `docs/` guarda documentação; arquivos executáveis de infraestrutura ali confundem
  o papel da pasta e quebram os caminhos relativos de build.
- **Um único Compose com perfis (`profiles: [prod]`):** mistura configuração de dev e prod no mesmo arquivo
  e muda o comando que todos já usam localmente; dois arquivos deixam cada ambiente explícito.
- **Frontend servido pela própria API (FastAPI `StaticFiles`):** junta dois ciclos de build numa imagem e
  põe o Python para servir estáticos, função em que o nginx é mais simples e eficiente.
- **Publicar imagens no GHCR pelo CI:** mais robusto, mas exige registro, credenciais no servidor e
  versionamento de imagens; desnecessário para um servidor único no primeiro deploy.

## Consequências
- ✅ Um comando sobe ou atualiza o sistema; os serviços voltam sozinhos depois de quedas e reinícios.
- ✅ Só a porta do frontend fica exposta; API e banco ficam na rede interna.
- ⚠️ Sem HTTPS: o acesso precisa ficar restrito à rede interna até uma spec de TLS.
- ⚠️ O servidor precisa do código-fonte e constrói as imagens (mais tempo e disco no deploy).
- ⚠️ Uma única instância da API; escalar exige tirar as migrations do startup (revisar ADR 0012).
- ⚠️ O job novo do CI precisa entrar nos checks obrigatórios da proteção de branch (ADR 0028).
