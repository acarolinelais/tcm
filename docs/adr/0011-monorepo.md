# 0011. Monorepo backend + frontend

- **Status:** Aceito
- **Data:** 2026-10-22

## Contexto
Backend e frontend evoluem juntos (o mesmo contrato, a mesma spec). Para estudar com IA,
é útil que uma única sessão enxergue os dois lados.

## Decisão
Um único repositório:
```
backend/              # app Python: src/, tests/
frontend/             # app React (Vite), e2e/
docs/                 # adr/, specs/, learning/
.claude/skills/       # skills do projeto
docker-compose.yml    # Postgres para desenvolvimento
```
Em desenvolvimento, o Vite usa um proxy que encaminha `/api` para o backend.

## Alternativas consideradas
- **Repositórios separados:** isolamento maior, mas uma spec ficaria dividida em dois PRs, e a IA perderia contexto.

## Consequências
- ✅ Uma spec e uma branch cobrem a feature de ponta a ponta.
- ⚠️ O CI precisa rodar os pipelines dos dois lados (fica para quando o fluxo de branches for definido).
