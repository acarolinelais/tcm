# 0049. Deploy em servidor com Docker Compose e deploy.sh

- **Status:** Aceito
- **Data:** 2026-11-06
- **Relacionado:** ADRs 0005, 0008, 0009, 0012 e 0050

## Contexto

O TCM só roda em ambiente local: o `docker-compose.yml` da raiz sobe apenas o Postgres, e a API e o
frontend rodam com `uv` e `vite`. Para o time usar o sistema, ele precisa subir num servidor com um
comando só, sem instalar Python nem Node. O servidor pode já ter um nginx na porta 80 e outro Postgres
na 5432, então o deploy não pode ocupar essas portas.

## Decisão

- O deploy fica em `deploy/`, separado do `docker-compose.yml` de desenvolvimento, que continua igual.
- `bash deploy.sh`, na raiz, é o único comando de deploy e de atualização. Ele:
  1. cria `deploy/.env` na primeira execução, com o segredo do JWT, a senha do Postgres e a senha do
     admin geradas aleatoriamente (o arquivo não vai para o git);
  2. roda `docker compose -f deploy/docker-compose.yml up -d --build`, com o projeto `tcm-servidor` (outro nome que o do compose de desenvolvimento, para não reaproveitar o volume dele);
  3. espera a API responder e mostra o endereço e o login do admin.
- São três serviços:

| Serviço | Imagem | Porta no servidor |
|---|---|---|
| `web` | nginx com o build do frontend; encaminha `/api` para a API | `5173` |
| `api` | Python 3.13 com `uv sync --frozen --no-dev` | `8080` (Swagger em `/docs`) |
| `postgres` | `postgres:18-alpine` com volume nomeado | `127.0.0.1:5544`, só no próprio servidor |

- As portas são configuráveis em `deploy/.env` (`WEB_PORT`, `API_PORT`, `POSTGRES_HOST_PORT`).
- O frontend é buildado com `VITE_USE_MOCK=false` e chama a API em `/api`, na mesma origem.
- As migrations continuam sendo aplicadas quando a API inicia (ADR 0012).
- Atualizar o servidor é `git pull` seguido de `bash deploy.sh`. Os dados ficam no volume do Postgres.

## Alternativas consideradas

- **Só `docker compose up -d` na raiz:** obrigaria trocar o compose de desenvolvimento, que hoje sobe só
  o Postgres na 5432 para quem roda a API com `uv`. Também deixaria para a pessoa gerar os segredos
  e criar o `.env` à mão, que é onde um deploy costuma dar errado.
- **Publicar imagens num registry e só baixar no servidor:** exige um registry e um pipeline de
  publicação que o projeto não tem. Buildar no servidor resolve com o que já existe.
- **Postgres na porta 5432:** conflita com um Postgres que já esteja no servidor. Ligar só em
  `127.0.0.1` também evita expor o banco na rede.

## Consequências

- ✅ Subir e atualizar o sistema é `git clone`, depois `bash deploy.sh`.
- ✅ O fluxo de desenvolvimento local não muda.
- ⚠️ O servidor precisa de Docker com o plugin Compose e de acesso à internet para baixar imagens e
  dependências no build.
- ⚠️ O build roda no servidor e leva alguns minutos na primeira vez.
- ⚠️ Não há HTTPS. O acesso é por HTTP na rede interna, com o cookie de sessão sem `Secure` (ADR 0050).
  Isso não serve para expor o sistema na internet.
- ⚠️ Não há backup automático do volume do Postgres; fica a cargo de quem opera o servidor.
