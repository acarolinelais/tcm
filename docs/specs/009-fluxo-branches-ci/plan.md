# 009. Fluxo de branches e verificação automática: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0002, 0010, 0011
- **ADRs novos propostos:** [0027](../../adr/0027-fluxo-de-branches-e-pull-requests.md) (branches e
  commits), [0028](../../adr/0028-ci-com-github-actions.md) (CI e ruleset),
  [0029](../../adr/0029-git-hooks-versionados.md) (hooks locais)

## Abordagem
As regras do ADR 0027 ficam num só script POSIX, `scripts/git/convencao.sh`, com subcomandos. Esse script
é chamado pelos hooks locais em `.githooks/` (ADR 0029) e pelo job `convencao` do CI (ADR 0028), então a
regra é escrita uma vez e vale nos dois lugares. O workflow `.github/workflows/ci.yml` roda `backend`
(com um Postgres 18 como *service container* e `SDF_TEST_DATABASE_URL`) e `frontend`; o
`convencao.yml` roda `convencao`, inclusive quando só o título do PR é editado.
O ruleset que protegeria `main` e `dev` fica só documentado no roteiro (repositório privado, limitação aceita).
Por último, o README, o `CLAUDE.md` e a skill `implement-task` ganham o passo a passo do fluxo.

Fluxo resultante:
```
main  ●───────────────────────●───────  (só PR vindo da dev)
       \                     /
dev     ●────●──────────●───●─────────  (só PR de branches de trabalho)
              \        /
feat/009-x     ●──●──●                  (um commit ou mais por bloco do tasks.md)

main  ●──────────●──────                (hotfix: sai da main e volta para a main)
       \        / \
hotfix/x ●──●──●   \
dev   ──────────────●───                (PR main → dev logo depois)
```

## Modelo de dados / Contrato da API
Não se aplica.

## `scripts/git/convencao.sh`: subcomandos
| Subcomando | Usado por | Regra |
|---|---|---|
| `mensagem <arquivo>` | `commit-msg` | 1ª linha casa com `^(feat\|fix\|docs\|chore\|refactor\|test\|style\|perf\|ci\|build)(\([a-z0-9._-]+\))?!?: .+` ou começa com `Merge ` / `Revert ` |
| `branch <nome>` | `pre-commit`, `pre-push`, CI | recusa `main`/`dev` como destino de commit; aceita `^(tipos\|hotfix)/[a-z0-9][a-z0-9._-]*$`; para `feat/` exige `^feat/[0-9]{3}-` |
| `push <ref-local> <ref-remota>` | `pre-push` | recusa `main`/`dev` como destino (inclusive exclusão); aplica `branch` à ref remota, exceto ao apagar uma branch de trabalho |
| `pr <base> <head-ref> <base-sha> <head-sha>` | CI | `base=main` exige `head` = `dev` ou `hotfix/*`; `base=dev` exige `head` = `main` ou branch de trabalho válida (não `hotfix/*`); aplica `mensagem` a cada commit de `base-sha..head-sha` que não seja merge |
| `pr-titulo <titulo>` | CI | mesma regex da mensagem |
| `spec <head-ref>` | CI | se `head-ref` é `feat/NNN-*`, existe uma pasta `docs/specs/NNN-*` |

A falha imprime o item fora do padrão e o formato esperado, e sai com código 1.

## Arquivos
**Novos**
- `scripts/git/convencao.sh`: as regras acima.
- `scripts/git/convencao.test.sh`: casos de sucesso e falha de cada subcomando, num repositório git
  temporário (ADR 0010).
- `.githooks/pre-commit`, `.githooks/commit-msg` e `.githooks/pre-push`: só chamam o script. O
  `pre-push` lê os refs do stdin e recusa `refs/heads/main` e `refs/heads/dev` como destino.
- `.gitattributes`: `*.sh` e `.githooks/*` com `eol=lf`, para o CRLF do Windows não quebrar o `sh`.
- `.github/workflows/ci.yml` (jobs `backend` e `frontend`) e `.github/workflows/convencao.yml` (job `convencao`, também em PR editado).
- `.github/pull_request_template.md`: campos "Spec", "O que muda" e "Como verifiquei".

**Alterados**
- 8 arquivos do backend que o `ruff format --check` acusa hoje (só formatação).
- `README.md`: seção "Fluxo de desenvolvimento", com setup (`git config core.hooksPath .githooks`),
  branch a partir da `dev`, blocos, PR para a `dev`, promoção para a `main` e o caminho do hotfix
  (incluindo o PR `main → dev`).
- `CLAUDE.md`: seção Git com o fluxo e as regras. Ao começar uma spec, a IA cria `feat/NNN-nome` a
  partir da `dev`.
- `.claude/skills/implement-task/SKILL.md`: antes do primeiro bloco, garantir que está na branch
  `feat/NNN-nome` (e não na `dev` nem na `main`).

O ADR 0011 não é editado (ADR aceito não muda). Quem fecha a pendência dele é o 0028.

**Configuração no GitHub** (com `gh`, e com a sua confirmação antes de cada passo). Os passos 2 e 3
exigem permissão **admin**. Hoje a conta usada tem `WRITE` em `acarolinelais/tcm`, então esses passos
ficam com a dona do repositório, seguindo um roteiro com os comandos `gh api` prontos em
`docs/specs/009-fluxo-branches-ci/configuracao-github.md`.
1. Criar a `dev` a partir da `main` e enviar.
2. Tornar a `dev` a branch padrão. Deixar só merge commit habilitado e ligar "apagar branch após merge".
3. Depois do primeiro run verde, criar o ruleset em `main` e `dev`: exigir PR, exigir os checks
   `backend`, `frontend` e `convencao`, bloquear force-push e exclusão, sem aprovação mínima.
4. Apagar a `origin/feature/abluble`.

## Critérios de aceite → testes
Os casos concretos de cada teste ficam na verificação da task correspondente (`tasks.md`).

| CA | Nível | Onde |
|---|---|---|
| CA-01, CA-11 | CI | PRs desta spec (`feat/009 → dev`, `dev → main`) e o `push` em `dev`/`main` verdes (T10, T15, T16) |
| CA-02, CA-03, CA-08 | CI | PRs de prova com checks vermelhos (T11) |
| CA-04 a CA-10 | Unidade (shell) | `scripts/git/convencao.test.sh`, que também roda no job `convencao` (T03–T06, T09) |
| CA-05, CA-07 | Manual | hook recusando commit e push no Git Bash do Windows (T06) |
| CA-12 | Revisão | README e `CLAUDE.md` (T12, T13) |

## Riscos e decisões pendentes
- **Ovo e galinha:** o ruleset só pode exigir checks que já rodaram uma vez. Se ele for aplicado um dia,
  é depois do primeiro run verde (roteiro da T14).
- **Merge commits da `dev` num PR `dev → main`:** o range inclui os merge commits (`Merge pull request
  #N ...`). O script pula commits de merge e aceita mensagens `Merge `.
- **Hooks no Windows e no WSL:** o Git for Windows roda os hooks com o `sh` dele, e o `.gitattributes`
  garante LF. O script evita bashismos e dependências fora do `git`, `grep` e `sed`.
- **Testes dependentes do ambiente Windows** (ex.: o loop assíncrono do psycopg) podem se comportar
  diferente no runner Linux. Se algum falhar só no CI, a correção entra nesta spec.
- **Plano do GitHub:** o repositório é privado e o ruleset não é aplicado (limitação aceita, ver
  ADR 0028). CA-02, CA-03 e CA-07 no servidor são verificados pelo check vermelho, não pelo bloqueio.
