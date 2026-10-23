# 0029. Git hooks versionados no repositório

- **Status:** Aceito
- **Data:** 2026-10-23

## Contexto
O CI (ADR 0028) barra commits e branches fora do padrão do ADR 0027, mas só depois do push, quando
corrigir exige reescrever commits. Feedback no momento do commit é mais barato. O repositório roda no
Windows (Git for Windows, que executa hooks em `sh`) e no WSL.

## Decisão
- Os hooks ficam versionados em `.githooks/` e são ativados por clone com um comando:
  ```bash
  git config core.hooksPath .githooks
  ```
- A lógica fica em `scripts/git/convencao.sh`, compartilhado com o CI. Os hooks só chamam esse script:

  | Hook | Regra |
  |---|---|
  | `pre-commit` | recusa commit nas branches `main` e `dev`; recusa commit numa branch com nome fora do padrão |
  | `commit-msg` | recusa mensagem fora de Conventional Commits (aceita `Merge ...` e `Revert ...`) |
  | `pre-push` | recusa push para `main` e `dev`, e de uma branch com nome fora do padrão |

- Os hooks são escritos em POSIX `sh`, sem Node, Python ou framework de hooks.
- O README e o `CLAUDE.md` mandam ativar os hooks no setup.

## Alternativas consideradas
- **pre-commit (framework Python) ou husky (Node):** adicionam dependência de runtime e instalação. O
  husky ficaria preso ao `frontend/`, e o pre-commit obrigaria quem só mexe no frontend a ter Python.
- **Só CI, sem hooks:** funciona, mas o erro aparece depois do push e exige reescrever o histórico.

## Consequências
- ✅ O erro aparece na hora do commit, com a mesma regra que o CI aplica.
- ✅ Sem dependências novas: só `sh` e `git`.
- ⚠️ Hooks não são instalados automaticamente pelo `git clone`. Quem esquece o `core.hooksPath` só
  descobre o erro no CI.
- ⚠️ `git commit --no-verify` pula os hooks. Por isso o CI e o ruleset (ADR 0028) continuam valendo.
