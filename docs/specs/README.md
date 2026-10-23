# Specs

Cada feature fica em `NNN-nome-em-kebab-case/`, com três documentos revisados em ordem (ADR 0002):

| Arquivo | Pergunta | Regra |
|---|---|---|
| `spec.md` | O quê? Por quê? | Sem tecnologia. Critérios de aceite testáveis (`CA-xx`), incluindo os de falha. |
| `plan.md` | Como? | Segue os ADRs. Decisão nova exige um ADR novo. |
| `tasks.md` | Em que passos? | Tasks de até ~30 min, cada uma com o comando de verificação. |

Para criar: skill `spec`. Para implementar: skill `implement-task`. Templates em [`_templates/`](_templates/).

**Status de uma spec:** `Rascunho` → `Aprovada` → `Em andamento` → `Concluída`.

## Roadmap
| # | Spec | Status |
|---|---|---|
| 001 | Fundação: esqueleto executável (API FastAPI, app React, Postgres) | Aprovada |
| 002 | Multi-tenancy e autenticação (hierarquia Unidade/Setor/Time, login JWT, RBAC) | Aprovada |
| 003 | Perfis, permissões e ciclo de vida do JWT | Implementada (validação pendente) |
| 004 | Listagem filtrável de usuários e padronização de tabela | Em andamento |
| 005 | Gestão de perfis e permissões por módulo | Aprovada |

> O repositório tem a governança (ADRs, skills, templates) pronta. A spec `001-fundacao` cria a
> infraestrutura comum dos dois lados e a primeira entidade de referência. As demais specs de contexto
> entram depois.
