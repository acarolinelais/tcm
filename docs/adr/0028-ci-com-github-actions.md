# 0028. Verificação contínua e proteção de branches no GitHub

- **Status:** Aceito
- **Data:** 2026-10-23

## Contexto
O ADR 0011 previu que o CI rodaria os pipelines de backend e frontend. O fluxo do ADR 0027 tem regras
(nome de branch, mensagem de commit, origem dos PRs para a `main`) que precisam ser impostas no servidor,
porque hooks locais podem ser pulados. Os testes de integração e funcionais do backend precisam de um
Postgres real (`SDF_TEST_DATABASE_URL`).

## Decisão
- Usamos **GitHub Actions**, num único workflow `.github/workflows/ci.yml`, disparado em `pull_request`
  para `dev` e `main` e em `push` para `dev` e `main`.
- Três jobs paralelos. Cada um é uma verificação obrigatória:
  - `backend`: `uv sync`, `ruff check`, `ruff format --check` e `pytest`. O pytest inclui os testes de
    arquitetura (import-linter) e roda contra um Postgres em *service container*, com
    `SDF_TEST_DATABASE_URL` definida para os testes de integração não serem pulados.
  - `frontend`: `npm ci`, `npm run lint`, `npm test` e `npm run build`.
  - `convencao` (só em PR): aplica as regras do ADR 0027 (commits, título, nome e origem da branch,
    spec existente) chamando `scripts/git/convencao.sh`, o mesmo script dos hooks locais (ADR 0029).
- Proteção de branch (ruleset do GitHub) em `main` e `dev`:
  - exige PR;
  - exige os três checks verdes;
  - bloqueia force-push e exclusão da branch;
  - não exige aprovação mínima.
  Enquanto o repositório for privado sem plano pago, o ruleset não é aplicado (limitação aceita em
  2026-10-23): os checks ficam vermelhos, mas não bloqueiam o merge nem o push.
- As versões das ferramentas vêm do repositório (Python 3.13 do `pyproject.toml`, `uv.lock`,
  `package-lock.json`, Node LTS) para o CI rodar o mesmo que a máquina local.
- O e2e (Playwright) fica fora do CI até uma spec própria.

## Alternativas consideradas
- **Workflows separados por pasta (`paths`):** economizam minutos, mas um check obrigatório que não roda
  deixa o PR travado como "pendente". O repositório é pequeno e rodar tudo é mais simples.
- **Testcontainers no CI:** funcionaria (o runner tem Docker), mas os testes atuais usam
  `SDF_TEST_DATABASE_URL`, e um *service container* não exige mudar o código de teste.
- **commitlint ou actions de terceiros para a convenção:** traz dependência Node e de terceiros para
  regras que cabem em expressões regulares, e não serviria aos hooks locais.

## Consequências
- ✅ Todo PR mostra em minutos se backend e frontend continuam verdes.
- ✅ As regras do ADR 0027 valem mesmo para quem não instalou os hooks ou usou `--no-verify`.
- ⚠️ O e2e não roda no CI. Uma quebra só visível no e2e ainda pode chegar à `dev` e à `main`.
- ⚠️ Os nomes dos jobs (`backend`, `frontend`, `convencao`) fazem parte do ruleset. Renomear um job
  exige atualizar o ruleset.
- ⚠️ Rulesets em repositório privado exigem plano pago do GitHub. No plano gratuito, a proteção só vale
  em repositório público.
