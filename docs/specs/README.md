# Specs

Cada feature fica em `NNN-nome-em-kebab-case/`, com três documentos revisados em ordem (ADR 0002):

| Arquivo | Pergunta | Regra |
|---|---|---|
| `spec.md` | O quê? Por quê? | Sem tecnologia. Critérios de aceite testáveis (`CA-xx`), incluindo os de falha. |
| `plan.md` | Como? | Segue os ADRs. Decisão nova exige um ADR novo. |
| `tasks.md` | Em que passos? | Tasks de até ~30 min, cada uma com o comando de verificação. |

Para criar: skill `spec`. Para implementar: skill `implement-task`. Templates em [`_templates/`](_templates/).

**Status de uma spec:** `Rascunho` → `Aprovada` → `Em andamento` → `Concluída`.

## Padrão universal de tabelas

Toda tabela nova ou existente deve usar os componentes compartilhados de `shared/ui/table.tsx` e
seguir a mesma composição visual: `TableLayout` organiza cabeçalho, corpo/estado vazio e paginação
com espaçamento uniforme; `TableEmptyState` usa painel cinza claro arredondado, separado do cabeçalho;
`TablePagination` fica ao final, alinhada à direita e com 20 itens por página como padrão ([ADR 0034](../adr/0034-paginacao-padrao-vinte-itens.md)). O conteúdo
das colunas e os filtros dependem do domínio, mas a estrutura, espaçamento, estados de carregamento/vazio
e paginação são comuns a todas as tabelas. A coluna de ações não recebe filtro. Exceções visuais devem
ser registradas em ADR antes de serem introduzidas.

## Roadmap
| # | Spec | Status |
|---|---|---|
| 001 | Fundação: esqueleto executável (API FastAPI, app React, Postgres) | Aprovada |
| 002 | Multi-tenancy e autenticação (hierarquia Unidade/Setor/Time, login JWT, RBAC) | Aprovada |
| 003 | Perfis, permissões e ciclo de vida do JWT | Implementada (validação pendente) |
| 004 | Listagem filtrável de usuários e padronização de tabela | Concluída |
| 005 | Gestão de perfis e permissões por módulo | Aprovada |
| 006 | Administração da unidade (usuários, setores, gerentes e times) | Concluída |
| 007 | Internacionalização do frontend (inglês, português e coreano) | Concluída |
| 008 | Perfil de conta KP e permissões adicionais | Em andamento |
| 009 | Fluxo de branches (`main` + `dev` + hotfix), hooks e CI | Concluída |
| 010 | Modo mock persistido do frontend | Concluída |
| 011 | Projetos e Test Cases | Concluída |
| 012 | Perfil Dev em Projetos e Test Cases | Concluída |
| 012 | Identificador externo de usuário | Concluída |
| 013 | Seed organizacional SVP | Concluída |
| 014 | Catálogo de modelos de dispositivo (descrição, gestão pelo KP, item no sidebar) | Concluída |
| 015 | Descrição do modelo no seletor de projetos | Concluída |
| 016 | Upload da planilha no padrão do Figma (progresso, remover com Desfazer, prévia) | Concluída |
| 017 | Status In Validation do Test Case | Concluída |
| 018 | Form Factor em matriz por modelo (uma linha por Test Case, coluna por modelo, filtro Assignee) | Concluída |
| 019 | Escopo do gerente inclui os times em que participa (ADR 0036) | Concluída |
| 020 | Histórico e lançamento de resultados Form Factor | Concluída |
| 021 | Resultados gerais de Form Factor | Concluída |
| 022 | Redesign HeroUI de Projects e Teams (perfil dev e padrão de tabela) | Concluída (e2e com API real pendentes) |
| 022 | Resultados Form Factor por rodada (SDF ID, Status `Done`/`Cancelled`) | Concluída |
| 023 | Ciclo de Status do Test Case com PR e correções (`In Fixes`, `Excluded`) | Concluída |
| 025 | SDF ID único por rodada no projeto | Concluída |
| 026 | Justificativa ao excluir um Test Case | Concluída |

> As duas specs 012 foram criadas em paralelo. Os diretórios e históricos foram preservados nesta integração; a harmonização da numeração está registrada no backlog da spec de perfil Dev.

> O repositório tem a governança (ADRs, skills, templates) pronta. A spec `001-fundacao` cria a
> infraestrutura comum dos dois lados e a primeira entidade de referência. As demais specs de contexto
> entram depois.
