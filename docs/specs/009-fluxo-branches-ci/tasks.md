# 009. Fluxo de branches e verificação automática: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo verificável, em torno de 30 min. Os testes vão junto com o código que cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> Comandos `sh` rodam no WSL ou no Git Bash, a partir da raiz do repositório.
> Tasks marcadas com 🌐 mexem no GitHub (`origin`) e exigem confirmação antes de rodar.

## Fase 1: Branches de partida

- [x] **T01. 🌐 Criar a `dev` a partir da `main` e enviar ao `origin`**
  - Arquivos: nenhum
  - Cobre: RN-01
  - Verificação: `git ls-remote --heads origin dev` → um ref `refs/heads/dev` com o mesmo SHA da `main`
- [x] **T02. Criar `feat/009-fluxo-branches-ci` a partir da `dev` e commitar a spec, o plan, as tasks e os ADRs 0027–0029**
  - Arquivos: `docs/specs/009-fluxo-branches-ci/*`, `docs/specs/README.md`, `docs/adr/0027-*`,
    `docs/adr/0028-*`, `docs/adr/0029-*`, `docs/adr/README.md`
  - Cobre: RN-02, RN-05
  - Verificação: `git log --oneline dev..HEAD` → um commit `docs(spec): ...` na branch `feat/009-fluxo-branches-ci`

## Fase 2: Script de convenção

- [x] **T03. Subcomando `mensagem` e esqueleto do teste**
  - Arquivos: `scripts/git/convencao.sh`, `scripts/git/convencao.test.sh`, `.gitattributes` (`*.sh` e
    `.githooks/*` com `eol=lf`)
  - Cobre: RN-04, CA-04, CA-05
  - Verificação: `sh scripts/git/convencao.test.sh` → passam `feat(usuarios): filtra por perfil`,
    `fix: x`, `refactor(api)!: x`, `Merge pull request #1 ...` e `Revert "..."`; falham `Feat: Abluble`,
    `feat:sem espaço`, `update stuff` e `hotfix: x`, com a mensagem de formato esperado
- [x] **T04. Subcomando `branch`**
  - Arquivos: `scripts/git/convencao.sh`, `scripts/git/convencao.test.sh`
  - Cobre: RN-01, RN-02, CA-06, CA-07
  - Verificação: `sh scripts/git/convencao.test.sh` → passam `feat/009-x`, `fix/login`, `hotfix/corrige-login`
    e `docs/adr-0027`; falham `main`, `dev`, `feature/abluble`, `minha-branch`, `feat/sem-numero` e `fix/Maiuscula`
- [x] **T05. Subcomandos `pr`, `pr-titulo` e `spec`**
  - Arquivos: `scripts/git/convencao.sh`, `scripts/git/convencao.test.sh` (repositório git temporário com
    commits de exemplo)
  - Cobre: RN-03, RN-05, CA-05, CA-08, CA-09, CA-10
  - Verificação: `sh scripts/git/convencao.test.sh` →
    - passam `pr main dev`, `pr main hotfix/x`, `pr dev main`, `pr dev feat/009-x`, um range com
      merge commits, `spec feat/009-x` (a pasta 009 existe) e `spec fix/x` (não se aplica);
    - falham `pr main feat/009-x`, `pr dev hotfix/x`, um range com `Feat: Abluble` (o SHA aparece na
      saída) e `spec feat/099-x` (spec inexistente)

## Fase 3: Hooks locais

- [x] **T06. Hooks `pre-commit`, `commit-msg` e `pre-push`**
  - Arquivos: `.githooks/pre-commit`, `.githooks/commit-msg`, `.githooks/pre-push` (só chamam o script);
    casos dos hooks em `scripts/git/convencao.test.sh` (repositório temporário com `core.hooksPath`)
  - Cobre: RN-07, CA-05, CA-06, CA-07
  - Verificação: `sh scripts/git/convencao.test.sh` →
    - `git commit --allow-empty -m "Feat: x"` → recusado;
    - `git commit --allow-empty -m "chore: x"` na `dev` → recusado;
    - push para `main` via `pre-push` → recusado;
    - `git commit --allow-empty -m "chore: x"` em `chore/teste` → aceito.

    Rodar uma vez também no Git Bash do Windows (o CI só cobre Linux).

## Fase 4: CI

- [ ] **T07. Formatar os arquivos do backend acusados pelo `ruff format --check`**
  - Arquivos: os 8 arquivos listados por `uv run ruff format --check .` (só formatação)
  - Cobre: pré-requisito de CA-01
  - Verificação: `cd backend && uv run ruff format --check . && uv run ruff check .` → `0 files would be
    reformatted` e `All checks passed!` (a suíte completa roda no CI da T10)
- [ ] **T08. Workflow com os jobs `backend` e `frontend`**
  - Arquivos: `.github/workflows/ci.yml`
  - Cobre: RN-06, RN-08, CA-01
  - Verificação: `backend` com Postgres 18 em *service container* e `SDF_TEST_DATABASE_URL`, `uv sync`,
    `ruff check`, `ruff format --check` e `pytest`. `frontend` com `npm ci`, `lint`, `test` e `build`.
    Dispara em `pull_request` e `push` para `dev`/`main`, com `concurrency` cancelando o run anterior
    do mesmo ref e cache de dependências (`setup-uv` com `enable-cache` no `uv.lock`, `setup-node` com
    `cache: npm` no `package-lock.json`). A validação real é na T10
- [ ] **T09. Job `convencao` e template de PR**
  - Arquivos: `.github/workflows/ci.yml`, `.github/pull_request_template.md`
  - Cobre: RN-03, RN-04, RN-05, CA-05, CA-08, CA-10
  - Verificação: o job roda só em `pull_request`, primeiro roda `sh scripts/git/convencao.test.sh`
    (regressão do próprio script) e depois chama `pr`, `pr-titulo` e `spec` com
    `github.base_ref`, `github.head_ref`, os SHAs e o título via `env` (nunca interpolados no
    script). Validação real na T10
- [ ] **T10. 🌐 Enviar a branch e abrir o PR `feat/009-fluxo-branches-ci → dev`**
  - Arquivos: nenhum
  - Cobre: CA-01, CA-04
  - Verificação: `gh pr checks <n>` → `backend`, `frontend` e `convencao` verdes. Se um teste falhar só
    no Linux, a correção entra nesta fase

## Fase 5: Provas de falha no CI

- [ ] **T11. 🌐 PR de prova com backend, frontend e branch de origem errados**
  - Arquivos: branch descartável `test/prova-ci` com um `assert False` num teste de unidade, um erro de
    lint no frontend e um commit `Feat: Abluble`; PR para a `dev`. Depois, uma branch limpa
    `fix/prova-main` (um commit válido, só em docs) com PR para a `main`
  - Cobre: CA-02, CA-03, CA-05, CA-08
  - Verificação: `gh pr checks` → `backend`, `frontend` e `convencao` vermelhos no PR para a `dev`, com
    o SHA do commit citado no log. No PR de `fix/prova-main` para a `main`, só o `convencao` vermelho
    ("main só aceita dev ou hotfix/*"). Fechar os dois PRs e apagar as duas branches

## Fase 6: Documentação do fluxo

- [ ] **T12. README: seção "Fluxo de desenvolvimento"**
  - Arquivos: `README.md`
  - Cobre: CA-12
  - Verificação: revisão. A seção cobre:
    - setup (`git config core.hooksPath .githooks`);
    - branch a partir da `dev`, blocos e PR para a `dev`;
    - promoção `dev → main`;
    - hotfix, incluindo o PR `main → dev`;
    - a tabela de tipos;
    - a limitação do repositório privado.
- [ ] **T13. `CLAUDE.md` e skill `implement-task`**
  - Arquivos: `CLAUDE.md` (seção Git e comandos), `.claude/skills/implement-task/SKILL.md`
  - Cobre: CA-12, RN-05
  - Verificação: revisão. A skill confere, antes do primeiro bloco, que está numa branch `feat/NNN-*`
    (cria a partir da `dev` se não estiver e recusa trabalhar em `main`/`dev`), e os commits sugeridos
    seguem a convenção
- [ ] **T14. Roteiro de configuração do GitHub para a dona do repositório**
  - Arquivos: `docs/specs/009-fluxo-branches-ci/configuracao-github.md`
  - Cobre: RN-01, RN-06
  - Verificação: revisão. O roteiro traz os comandos `gh api` para:
    - tornar a `dev` a branch padrão;
    - deixar só merge commit e apagar branch após o merge;
    - criar o ruleset de `main` e `dev`, marcado como "aplicar quando houver plano com suporte".

## Fase 7: Integração e promoção

- [ ] **T15. 🌐 Integrar o PR da T10 na `dev` com merge commit**
  - Arquivos: nenhum
  - Cobre: RN-08, CA-01
  - Verificação: `gh run list --branch dev --limit 1` → o workflow do `push` na `dev` verde
- [ ] **T16. 🌐 PR `dev → main`, integrar e conferir a `main`**
  - Arquivos: nenhum
  - Cobre: RN-03, CA-11
  - Verificação: `convencao` verde no PR. Depois do merge, `gh run list --branch main --limit 1` → verde
- [ ] **T17. 🌐 Apagar a `origin/feature/abluble`**
  - Arquivos: nenhum
  - Cobre: limpeza (a branch já está toda contida na `main`)
  - Verificação: `git merge-base --is-ancestor origin/feature/abluble origin/main` volta 0 antes de
    apagar. Depois, `git ls-remote --heads origin feature/abluble` → vazio

## Backlog
- ADR 0010 cita Testcontainers, mas os testes de integração/funcionais usam `SDF_TEST_DATABASE_URL`.
  Alinhar o ADR ou os testes.
- e2e (Playwright) no CI.
- Abrir automaticamente o PR `main → dev` depois de um hotfix.
