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
(com um Postgres 18 como *service container* e `SDF_TEST_DATABASE_URL`), `frontend` e `convencao`.
Depois do primeiro run verde, um ruleset do GitHub protege `main` e `dev` exigindo PR e os três checks.
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
| `pr <base> <head-ref> <base-sha> <head-sha>` | CI | `base=main` exige `head` = `dev` ou `hotfix/*`; `base=dev` exige `head` = `main` ou branch de trabalho válida (não `hotfix/*`); aplica `mensagem` a cada commit de `base-sha..head-sha` que não seja merge |
| `pr-titulo <titulo>` | CI | mesma regex da mensagem |
| `pr-spec <head-ref> <corpo>` | CI | se `head-ref` é `feat/NNN-*`, o corpo cita `docs/specs/NNN-` e essa pasta existe |

A falha imprime o item fora do padrão e o formato esperado, e sai com código 1.

## Arquivos
**Novos**
- `scripts/git/convencao.sh`: as regras acima.
- `scripts/git/convencao.test.sh`: casos de sucesso e falha de cada subcomando, num repositório git
  temporário (ADR 0010).
- `.githooks/pre-commit`, `.githooks/commit-msg` e `.githooks/pre-push`: só chamam o script. O
  `pre-push` lê os refs do stdin e recusa `refs/heads/main` e `refs/heads/dev` como destino.
- `.gitattributes`: `*.sh` e `.githooks/*` com `eol=lf`, para o CRLF do Windows não quebrar o `sh`.
- `.github/workflows/ci.yml`: jobs `backend`, `frontend` e `convencao`.
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
| CA | Nível | Verificação |
|---|---|---|
| CA-01 | CI | PR desta spec para a `dev` com os três jobs verdes |
| CA-02 | CI | PR de prova com um teste de backend quebrado → `backend` vermelho, merge bloqueado |
| CA-03 | CI | O mesmo PR de prova com um erro de lint no frontend → `frontend` vermelho |
| CA-04 | Unidade (shell) | `convencao.test.sh`: `mensagem` e `branch` válidas → código 0 |
| CA-05 | Unidade (shell) + manual | `convencao.test.sh`: `Feat: Abluble` → código 1. Manual: `git commit -m "Feat: x"` recusado pelo hook |
| CA-06 | Unidade (shell) | `convencao.test.sh`: `feature/abluble`, `minha-branch` e `feat/sem-numero` → código 1 |
| CA-07 | Unidade (shell) + manual | `convencao.test.sh`: commit em `main`/`dev` → código 1. Manual: `git push origin main` recusado pelo hook e, com `--no-verify`, pelo ruleset |
| CA-08 | Unidade (shell) + CI | `convencao.test.sh`: `pr main feat/x ...` e `pr dev hotfix/x ...` → código 1. CI: PR de prova `fix/x → main` com `convencao` vermelho |
| CA-08a | Unidade (shell) | `convencao.test.sh`: `pr main hotfix/x ...`, `pr main dev ...` e `pr dev main ...` → código 0 |
| CA-09 | Unidade (shell) | `convencao.test.sh`: `pr-spec feat/099-x` sem citação ou com spec inexistente → código 1 |
| CA-10 | CI | PR `dev → main` desta spec verde, e o workflow verde no `push` da `main` |
| CA-11 | Revisão | README e `CLAUDE.md` descrevem o fluxo completo |

## Riscos e decisões pendentes
- **Ovo e galinha:** o ruleset só pode exigir checks que já rodaram uma vez. Por isso a ordem é: criar
  a `dev`, abrir o PR desta spec com o CI e só então criar o ruleset.
- **Esta própria spec:** os documentos já escritos na `main` (spec, plan, ADRs) ainda não foram
  commitados. Eles vão para a branch `feat/009-fluxo-branches-ci`, criada a partir da `dev`.
- **Merge commits da `dev` num PR `dev → main`:** o range inclui os merge commits (`Merge pull request
  #N ...`). O script pula commits de merge e aceita mensagens `Merge `.
- **Hooks no Windows e no WSL:** o Git for Windows roda os hooks com o `sh` dele, e o `.gitattributes`
  garante LF. O script evita bashismos e dependências fora do `git`, `grep` e `sed`.
- **Testes dependentes do ambiente Windows** (ex.: o loop assíncrono do psycopg) podem se comportar
  diferente no runner Linux. Se algum falhar só no CI, a correção entra nesta spec.
- **ADR 0010 x realidade:** o ADR 0010 cita Testcontainers, mas os testes usam `SDF_TEST_DATABASE_URL`.
  Isso vai para o backlog.
- **Plano do GitHub:** o repositório é **privado** (verificado em 2026-10-23). Rulesets e proteção de
  branch em repositório privado de conta pessoal exigem GitHub Pro. Sem Pro, o GitHub não bloqueia o
  merge nem o push. O CI continua marcando o PR de vermelho, e os hooks continuam barrando localmente,
  mas o bloqueio vira convenção. **Decisão (2026-10-23): a limitação foi aceita.** O ruleset fica
  documentado no roteiro de configuração para ser aplicado se o repositório ganhar suporte. Os CAs que
  dependem dele (CA-02, CA-03 e CA-07 no servidor) são verificados pelo check vermelho, não pelo bloqueio.
