# CLAUDE.md

Repositório de estudos: CRUD em **Python (FastAPI) + React**, construído com IA seguindo um fluxo spec-driven.
Documentação em PT-BR. Termos de domínio no código em português; termos técnicos em inglês.
**Feature flags não fazem parte deste projeto.**

## Antes de qualquer coisa
1. Leia os ADRs em `docs/adr/` (índice em `docs/adr/README.md`). **Eles são lei.** Se uma tarefa exigir
   contrariar um ADR, pare e proponha um novo ADR (skill `adr`). Não desvie em silêncio.
2. Trabalhe a partir de uma spec em `docs/specs/NNN-nome/`. Sem spec, crie uma (skill `spec`).
3. Implemente **um bloco por vez** (uma fase do `tasks.md`, skill `implement-task`): as tasks em sequência,
   cada uma com a sua verificação, e um relatório só no fim do bloco. Por padrão, pare entre blocos e
   peça aprovação. **Se o usuário pedir pra seguir rápido por todas as fases** (ex.: "implementa tudo
   rápido", "pode seguir sem parar"), encadeie os blocos sem pausa de aprovação entre eles — mas sempre
   rode a verificação de cada bloco e nunca marque uma task com verificação vermelha como concluída.

## Skills do projeto (`.claude/skills/`)
| Skill | Quando usar |
|---|---|
| `spec` | Nova feature ou mudança de comportamento: cria spec.md → plan.md → tasks.md |
| `adr` | Qualquer decisão técnica nova ou mudança de uma decisão existente |
| `implement-task` | Executar o próximo bloco (fase) de tasks abertas de um `tasks.md` |
| `python-crud` | Criar ou alterar uma entidade/recurso CRUD no backend |
| `react-crud` | Criar ou alterar uma feature CRUD no frontend |
| `study-log` | Ao concluir uma task ou spec: registrar o que foi aprendido |
| `table-rules` | **Sempre** que criar, alterar ou revisar uma tabela/listagem no frontend: paginação (padrão 20), filtros, estados, ações por linha, badges |
| `ui-density` | Revisar/reajustar proporção e densidade de uma tela React (cards, ícones, tipografia, espaçamento), principalmente depois de portar um design do Figma |
| `better-*` e `interface-review` | Regras de interface com valores exatos: `better-ui`, `better-typography`, `better-colors`, `better-accessibility`, `better-layout`, `better-writing`; `better-interface` orquestra todas; `interface-review` revisa só o diff (o usuário invoca). Origem e licença no `ORIGEM.md` de cada pasta |
| `impeccable`, `emil-design-eng`, `apple-design` | Critério de design, polimento de UI e movimento (as `better-*` dão os valores exatos; estas, o gosto) |
| `web-design-guidelines`, `vercel-react-best-practices` | Revisão de UI contra guidelines e performance de React |
| `tailwind-v4` | Convenções do Tailwind v4 (`@theme`, migração da v3, classes dinâmicas) |
| `adversarial-review` | Revisão cética de um diff: tenta quebrar e só reporta o que sobrevive à refutação |
| `ponytail` | Toda tarefa de código, principalmente alterações pontuais: a menor mudança que resolve a tarefa inteira, sem abstração, opção ou dependência que ninguém pediu. Não corta validação, tratamento de erro, segurança, acessibilidade nem a estrutura dos ADRs. Atalhos conscientes ficam marcados com `shortcut: <limite>, <quando evoluir>` |
| `ponytail-review`, `ponytail-audit`, `ponytail-debt` | Revisão do diff (`ponytail-review`) ou do repositório inteiro (`ponytail-audit`) focada em correção, carga e código que sobra; `ponytail-debt` lista os comentários `shortcut:`. Relatório em PT-BR |
| `humanizer` | Textos em prosa: specs, ADRs, descrições de PR, mensagens de commit, comentários de código e textos de interface. Remove vícios de texto gerado por IA sem mudar o conteúdo. Não reescreve código |
| `caveman` | Respostas enxutas no chat para economizar tokens (`/caveman` liga, "stop caveman" desliga). Código, commits, docs e ADRs continuam em texto normal. Origem e licença em `.claude/skills/caveman/ORIGEM.md` |

## Skills globais e quando usar
- `andrej-karpathy-skills:karpathy-guidelines`: toda tarefa de código.
- `ponytail` e `humanizer` são o padrão do projeto: o hook `SessionStart` em `.claude/settings.json`
  (script `.claude/hooks/session-start.mjs`, precisa de Node) liga a `ponytail` no nível full e lembra a
  `humanizer` para prosa em toda sessão. Em conflito com um ADR, o ADR vence.
- `simplify`: **obrigatória** uma vez por bloco (sobre o diff do bloco inteiro), antes do relatório e de commitar.
  Nunca pule, nem em blocos pequenos. Achados fora do escopo do bloco vão para o `## Backlog` do `tasks.md`.
- `code-review`: ao terminar todas as tasks de uma spec.
- `security-review`: ao mexer em input do usuário, acesso a dados, autenticação ou permissões.
- `better-accessibility` e `better-writing`: em telas React (a11y e textos de interface).
- `anthropic-skills:skill-creator`: para criar ou ajustar skills deste projeto.

## Regras rápidas (detalhes nos ADRs)
- **Backend:** Clean Architecture com `domain`, `application`, `infrastructure` e `api` (ADR 0003). A composição
  de dependências fica na camada `api` (ADR 0003). Repository + UnitOfWork + `PagedResult` (ADR 0004); o
  UnitOfWork encapsula a `Session` do SQLAlchemy e o service dá **um** `commit` por caso de uso. PostgreSQL +
  SQLAlchemy 2.0 com uma config/model por entidade (ADR 0005). Pydantic v2 valida a entrada e os erros saem como
  ProblemDetails RFC 9457 (ADR 0006). Schemas com mapeamento manual (ADR 0007). Routers FastAPI em `/api/<recurso>`,
  sem DELETE (exclusão lógica por padrão; DELETE físico só com justificativa no `plan.md`, ADRs 0004 e 0008),
  documentação com Scalar em `/scalar` (ADR 0008). As migrations Alembic são aplicadas automaticamente quando a
  API inicia (ADR 0012).
- **Frontend:** React + Vite + TypeScript com arquitetura Modular (`core`/`shared`/`modules`) + Tailwind
  (ADR 0009). Cada domínio é um módulo autossuficiente. Dados com TanStack Query; formulários com
  react-hook-form + zod. A base de UI é o **HeroUI v3**, com migração gradual a partir do shadcn/ui (ADR 0037):
  tela nova ou redesenhada usa só HeroUI, tela não migrada continua em shadcn, sem misturar as duas na mesma
  página e sem adicionar componentes shadcn novos.
- **Testes:** unidade, integração, funcional, e2e e arquitetura, sempre com um cenário de sucesso
  e um de falha (ADR 0010).
- **Multi-tenancy:** `Unidade` é a fronteira do tenant; hierarquia `Unidade → Setor → Time → TimeMembro`,
  isolamento por `unidade_id` filtrado no `RepositoryBaseImpl` (ADR 0013).
- **Autenticação:** e-mail + senha com JWT emitido pelo backend, atrás de uma interface `Autenticador`
  trocável no futuro por uma API corporativa (ADR 0014). **Ainda não implementada** — enquanto isso, a
  API não deve ser exposta fora do ambiente local.
- **Autorização:** quatro papéis fixos — `admin_unidade`, `gerente`, `kp` (Key Person, gerencia tasks só
  do próprio time) e `dev` — com regras de posse sobre as tasks (ADR 0015).

## Git e pull requests
Regras para **todas as pessoas e agentes** do projeto (ADRs 0027, 0029 e 0035). O CI (`convencao`) recusa
o que estiver fora delas, então siga antes de abrir o PR, não depois.

**Antes do primeiro commit no clone:** confira os hooks com `git config --get core.hooksPath`. Se não
responder `.githooks`, rode `git config core.hooksPath .githooks`. Sem isso nada é barrado localmente.

**Branch**
- Branch de trabalho sai da `dev` atualizada (`git switch dev && git pull`): `<tipo>/<descricao-em-kebab-case>`,
  só `a-z`, `0-9`, `.` e `-`. Tipos: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`, `perf`, `ci`, `build`.
- Spec = branch `feat/NNN-nome`, com a pasta `docs/specs/NNN-nome` já criada. **Antes de escolher o NNN**, confira o
  roadmap (`docs/specs/README.md`), as branches remotas (`git branch -r`) e os PRs abertos (`gh pr list`):
  duas specs com o mesmo número colidem no roadmap e nas migrations.
- `hotfix/<descricao>` é a única branch que sai da `main` (fluxo no ADR 0027).
- **Nunca** commite nem dê push direto na `main`. A `dev` aceita commit direto só para mudanças pequenas (ADR 0035).

**Commits**
- Conventional Commits: `tipo(escopo): descrição`, escopo em minúsculas e descrição em português.
  Ex.: `feat(casos-teste): justificativa obrigatoria ao excluir Test Case`.
- **Sem** `Co-Authored-By` nem qualquer atribuição ao Claude. Não use `--no-verify`.
- Agentes só commitam quando o usuário pedir.

**Pull request**
- **Alvo:** sempre a `dev` (`gh pr create --base dev`). A `main` só recebe PR da `dev` (promoção) ou de
  `hotfix/*`. Um PR de `feat/`, `fix/` etc. para a `main` é recusado pelo CI.
- **Título:** no mesmo formato dos commits, ex.: `feat(form-factor): recusa SDF ID repetido ao criar rodada`.
- **Descrição:** o template `.github/pull_request_template.md`, com as três seções: `## Spec` (a pasta
  `docs/specs/NNN-nome`; em `fix/` sem spec, o problema corrigido), `## O que muda` e `## Como verifiquei`
  (comandos rodados, resultados e o que **não** foi verificado). **Sem** atribuição ao Claude: nada de
  "🤖 Generated with Claude Code" nem linha parecida.
- **Antes de abrir:** atualize a branch com a `dev` (`git merge origin/dev`, sem rebase nem push forçado em branch
  compartilhada), rode as suítes e, se houver migration, confira que `uv run alembic heads` mostra um único head
  (o `down_revision` aponta para o head atual da `dev`).
- Integração por merge commit, com as verificações verdes. A branch é apagada depois do merge.

## Ambiente
- O repositório roda no **Windows**. O backend usa Python 3.13 com ambiente gerenciado por **uv**
  (`uv venv`, `uv sync`, `uv run ...`); o fallback é `venv` + `pip`. O frontend usa Node LTS.
- O **Docker** é necessário para o Postgres local e para os testes de integração/funcionais com Testcontainers.
- Os detalhes de setup (versões exatas, scripts) serão fixados na spec `001-fundacao`.

## Comandos
```bash
docker compose up -d                       # Postgres
# a partir da spec 001 (quando o backend existir):
uv run uvicorn <pacote>.api.main:app --reload   # sobe a API; docs em /scalar
uv run pytest                                   # testes do backend
cd frontend && npm run dev                      # sobe o frontend (Vite)
cd frontend && npm test && npm run lint && npm run e2e
sh scripts/git/convencao.test.sh                # testes das regras de branch/commit/PR
```
