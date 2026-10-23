# Architecture Decision Records

Um ADR registra **uma** decisão técnica: o contexto, o que foi decidido, as alternativas e as consequências.
Formato MADR enxuto ([template.md](template.md)). Para criar um novo, use a skill `adr`.

## Regras
- Numeração sequencial de 4 dígitos. O número nunca é reutilizado.
- ADR aceito não se edita. Para mudar a decisão, crie um novo ADR e marque o antigo como `Substituído por NNNN`.
- Correções de texto (typo, link) podem ser feitas direto.
- Status: `Proposto` → `Aceito` ou `Rejeitado`. Depois, opcionalmente, `Substituído por NNNN`.

## Índice
| # | Título | Status |
|---|---|---|
| [0001](0001-registrar-decisoes-em-adrs.md) | Registrar decisões em ADRs | Aceito |
| [0002](0002-fluxo-spec-driven-com-ia.md) | Fluxo spec-driven com IA | Aceito |
| [0003](0003-backend-clean-architecture.md) | Backend em Clean Architecture | Aceito |
| [0004](0004-repository-unit-of-work-paginacao.md) | Repository, Unit of Work e PagedResult | Aceito |
| [0005](0005-postgresql-sqlalchemy-alembic.md) | PostgreSQL + SQLAlchemy + Alembic | Aceito |
| [0006](0006-validacao-pydantic-problemdetails.md) | Validação com Pydantic e erros como ProblemDetails | Aceito |
| [0007](0007-schemas-com-mapeamento-manual.md) | Schemas com mapeamento manual | Aceito |
| [0008](0008-api-rest-com-fastapi.md) | API REST com FastAPI | Aceito |
| [0009](0009-frontend-react-modular-shadcn.md) | Frontend React com arquitetura Modular e shadcn/ui | Aceito |
| [0010](0010-estrategia-de-testes.md) | Estratégia de testes | Aceito |
| [0011](0011-monorepo.md) | Monorepo backend + frontend | Aceito |
| [0012](0012-migrations-automaticas-na-inicializacao.md) | Migrations aplicadas automaticamente na inicialização | Aceito |
| [0013](0013-multi-tenancy-hierarquia-organizacional.md) | Multi-tenancy e hierarquia organizacional | Aceito |
| [0014](0014-autenticacao-jwt.md) | Autenticação com JWT | Aceito |
| [0015](0015-autorizacao-papeis-rbac.md) | Autorização e papéis (RBAC) | Aceito |
| [0016](0016-repositorio-atualizar-com-merge.md) | Repositório ganha `atualizar()` via `session.merge()` | Aceito |
| [0017](0017-filtros-em-endpoints-de-listagem.md) | Filtros explícitos em endpoints de listagem | Aceito |
| [0018](0018-perfil-administrador-e-perfil-obrigatorio.md) | Perfil administrador da unidade e perfil obrigatório | Aceito |
| [0019](0019-senha-inicial-e-troca-obrigatoria.md) | Senha inicial local com troca obrigatória | Substituído por 0023 |
| [0020](0020-sessoes-jwt-e-refresh-rotativo.md) | Sessões JWT e refresh token rotativo | Aceito |
| [0021](0021-escopo-gerente-por-setor.md) | Escopo de gestão de times definido pelo setor | Aceito |
| [0022](0022-padrao-universal-de-tabelas.md) | Padrão visual universal para tabelas | Aceito |
| [0023](0023-senha-sem-minimo-de-caracteres.md) | Troca de senha sem mínimo de caracteres | Aceito |
| [0024](0024-responsavel-por-usuario.md) | Responsável direto por usuários criados por gerente | Aceito |
| [0025](0025-idioma-preferido-por-conta.md) | Idioma preferido por conta | Aceito |
| [0026](0026-perfil-kp-com-escopo-por-associacao.md) | Perfil KP com escopo por participação em times | Aceito |
| [0027](0027-fluxo-de-branches-e-pull-requests.md) | Fluxo de branches (`main` + `dev`) e convenção de commits | Aceito |
| [0028](0028-ci-com-github-actions.md) | Verificação contínua e proteção de branches no GitHub | Aceito |
| [0029](0029-git-hooks-versionados.md) | Git hooks versionados no repositório | Aceito |
| [0030](0030-modo-mock-frontend.md) | Modo mock persistido no frontend | Aceito |
| [0031](0031-administrador-edita-permissoes-de-perfis-seedados.md) | Administrador edita permissões de perfis seedados | Aceito |
| [0032](0032-permissao-para-consultar-perfis-de-usuarios-no-escopo.md) | Permissão para consultar perfis de usuários no escopo | Aceito |
