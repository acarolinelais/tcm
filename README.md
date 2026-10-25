# sdf-manager

CRUD em **Python (FastAPI) + React**, construído com IA seguindo um fluxo **spec-driven** (SDD).
Documentação em PT-BR. Termos de domínio no código em português; termos técnicos em inglês.

A arquitetura e o fluxo de trabalho vêm de um estudo anterior em .NET + Angular, reaproveitados aqui
e traduzidos de stack. **Feature flags não fazem parte deste projeto.**

## Stack
- **Backend:** FastAPI + SQLAlchemy 2.0 + Alembic + Pydantic v2, em Clean Architecture (ADRs 0003–0008, 0012).
- **Frontend:** React + Vite + TypeScript + shadcn/ui + Tailwind, arquitetura Modular (core/shared/modules),
  TanStack Query, react-hook-form + zod (ADR 0009).
- **Banco:** PostgreSQL via Docker (ADR 0005).

## Como funciona o repositório
1. As decisões técnicas estão em `docs/adr/` e **são lei**.
2. Cada feature nasce de uma spec em `docs/specs/NNN-nome/` (`spec.md` → `plan.md` → `tasks.md`).
3. As skills em `.claude/skills/` são as receitas que a IA segue. Veja o `CLAUDE.md`.

> Esta é a **fundação** do repositório: governança (ADRs, specs, skills) e o esqueleto de pastas.
> O código executável entra pela primeira spec (`001-fundacao`), ainda a escrever.

## Ambiente
- **Pré-requisitos:** Docker (Postgres e testes com Testcontainers), Python 3.13 e Node LTS.
- Subir o banco: `docker compose up -d`.

### Abrir o frontend com dados de demonstração
O frontend inclui dados de demonstração persistidos no navegador para explorar as telas e fluxos sem iniciar
API ou Postgres. Ao clonar, copie `.env.example` para `.env` e mantenha `VITE_USE_MOCK=true`; depois inicie
somente o frontend:

```bash
cp .env.example .env
cd frontend && npm install && npm run dev
```

Entre com `admin@sdfmanager.com` (a senha pode ser qualquer valor). Há também contas de gerente, KP,
desenvolvedor e usuário padrão para explorar permissões diferentes. Criações e alterações ficam salvas no
`localStorage` do navegador. Para restaurar a base inicial, apague a chave `sdf.mock.database.v1` no
armazenamento local do site. Para conectar ao backend, defina `VITE_USE_MOCK=false` e inicie API e Postgres.

## Fluxo de desenvolvimento
Regras nos ADRs [0027](docs/adr/0027-fluxo-de-branches-e-pull-requests.md) (branches e commits),
[0028](docs/adr/0028-ci-com-github-actions.md) (CI), [0029](docs/adr/0029-git-hooks-versionados.md) (hooks) e
[0035](docs/adr/0035-commits-diretos-na-dev.md) (commits diretos na `dev`).

```
main  ●───────────────────────●───   estável: só recebe PR da dev ou de hotfix/*
       \                     /
dev     ●────●──────────●───●──●──   integração: PR de branches de trabalho (e da main) ou commit direto
              \        /
feat/009-x     ●──●──●              uma branch e um PR por spec
```

### Uma vez por clone
```bash
git config core.hooksPath .githooks   # ativa os hooks: recusam commit/push fora do padrão
```
Usando o git do **Windows** num repositório dentro do WSL (`\\wsl.localhost\...`), o git recusa o
repositório por "dubious ownership". Rode o comando que ele sugere (`git config --global --add
safe.directory ...`) ou use o git de dentro do WSL.

### Dia a dia (uma spec)
```bash
git switch dev && git pull
git switch -c feat/009-fluxo-branches-ci        # feat/ começa com o número da spec
# implemente por blocos (skill implement-task), um ou mais commits por bloco
git push -u origin feat/009-fluxo-branches-ci
gh pr create --base dev                         # preencha o template; os checks rodam sozinhos
```
Com `backend`, `frontend` e `convencao` verdes, integre com **merge commit**. Para promover o que está
estável, abra um PR `dev → main`.

### Ajuste pequeno, direto na dev
```bash
git switch dev && git pull
git commit -m "fix(projetos): corrige rótulo do filtro"   # mensagem no padrão, sem spec
git push                                        # o CI roda depois do push; se quebrar, corrija logo
```

### Hotfix
```bash
git switch main && git pull
git switch -c hotfix/corrige-login              # commits com o tipo fix
gh pr create --base main
```
Depois do merge, abra **logo** um PR `main → dev` para a correção chegar à `dev`.

### Convenção
| | Formato | Exemplo |
|---|---|---|
| Branch | `<tipo>/<descricao-em-kebab-case>` ou `hotfix/<descricao>` | `fix/login-sem-idioma` |
| Commit e título do PR | `<tipo>(<escopo opcional>): <descrição>` | `feat(usuarios): filtra por perfil` |

Tipos e regras completas no ADR 0027. Elas são aplicadas por `scripts/git/convencao.sh`, usado pelos
hooks e pelo CI (testes: `sh scripts/git/convencao.test.sh`).

> **Limitação aceita:** o repositório é privado num plano sem suporte a rulesets. Os checks ficam
> vermelhos, mas o GitHub não bloqueia o merge nem o push direto. Respeitar o check é convenção.
> Roteiro para ligar o bloqueio: [`configuracao-github.md`](docs/specs/009-fluxo-branches-ci/configuracao-github.md).
