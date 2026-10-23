# 011. Projetos e Test Cases: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0007, 0008, 0009, 0010, 0013, 0018, 0021, 0026, 0030, 0031
- **ADRs novos propostos:** nenhum

## Abordagem

Adicionar um módulo de projetos que concentra projeto, catálogo de modelos, Test Cases e a visualização Form Factor. O gerenciamento dos casos usa permissões configuráveis no perfil e valida o escopo atual: gerente nos setores associados, KP nos times em que participa e membro responsável somente nos campos permitidos. A importação inicial cria o projeto e os casos em uma operação validada antes de persistir; a importação SDF cria registros de execução separados e imutáveis, relacionados ao projeto, caso e modelo para preservar cada resultado. O frontend oferece cadastro manual, importações de planilhas, listagem/edição de casos e abas de Test Cases e Form Factor, usando APIs mock quando `VITE_USE_MOCK=true`.

## Modelo de dados

| Entidade | Campos principais | Regras |
|---|---|---|
| `Projeto` | unidade, time, app, one_ui, status | Um time; nome derivado de app + versão (não persistido); status manual; `Created` inicial |
| `ModeloDispositivo` | unidade, nome, ativo | Catálogo editável por gerente/KP autorizado; modelos associados a projetos |
| `ProjetoModelo` | projeto, modelo | Associação N:N; somente modelos ativos da unidade |
| `CasoTeste` | projeto, tc_id, category, difficulty, situation, responsavel_id, backup_id | TC ID único por projeto; responsáveis do time; backup pode ficar nulo após transferência |
| `ImportacaoSdf` | projeto, importado_por, importado_em | Um registro por arquivo/importação, preserva origem e data do lote |
| `ExecucaoSdf` | importação, caso_teste, sdf_id, data_reportada, one_ui | Uma ocorrência do TC reportada pelo SDF; não substitui ocorrências anteriores |
| `ResultadoFormFactor` | execução, modelo, resultado | Resultado fornecido pelo SDF para um modelo na execução; sem sobrescrever execuções anteriores |

`week` para filtro é derivado da data reportada usando uma convenção única definida no parser. Os valores de resultado e o nome do modelo são interpretados conforme cabeçalho/colunas da planilha SDF; o parser precisa validar e normalizar os cabeçalhos para IDs de modelos do catálogo associado ao projeto.

## Contrato da API

Todas as rotas exigem autenticação, filtram por `unidade_id` e aplicam permissão mais escopo no service. Administrador da unidade tem todas as permissões dentro do tenant; gerente e KP também precisam do escopo de setor/time correspondente; demais perfis só executam ações concedidas explicitamente. Uploads usam `multipart/form-data`; erros de validação seguem ProblemDetails.

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET, POST | `/api/projetos` | filtros paginados; `{ time_id, app, one_ui, modelos_ids }` | 200 `PagedResult`; 201 + `Location` | 401, 403, 404, 422 |
| POST | `/api/projetos/importar` | arquivo inicial + `time_id` + `modelos_ids` | 201 projeto e resumo dos casos importados | 401, 403, 404, 409 duplicidade, 422 planilha inválida |
| GET | `/api/projetos/{id}` | — | 200 projeto | 401, 403, 404 |
| PATCH | `/api/projetos/{id}/status` | `{ status }` | 200 projeto | 401, 403, 404, 422 |
| GET, POST | `/api/projetos/{id}/test-cases` | filtros paginados; campos do caso | 200 `PagedResult`; 201 caso + `Location` | 401, 403, 404, 409 TC ID duplicado, 422 |
| GET, PUT | `/api/test-cases/{id}` | —; campos editáveis conforme autorização | 200 caso | 401, 403, 404, 409, 422 |
| PATCH | `/api/test-cases/{id}/transferir-para-backup` | — | 200 caso com responsável trocado e backup nulo | 401, 403, 404, 409 se backup ausente |
| GET, POST | `/api/modelos-dispositivo` | filtros/listagem; `{ nome }` | 200 `PagedResult`; 201 + `Location` | 401, 403, 409 duplicado, 422 |
| PUT, PATCH | `/api/modelos-dispositivo/{id}` e `/{id}/ativar|inativar` | atualização/estado | 200 modelo | 401, 403, 404, 409, 422 |
| POST | `/api/projetos/{id}/relatorios-sdf` | arquivo do relatório | 201 resumo do lote importado | 401, 403, 404, 409 vínculo inválido, 422 formato/cabeçalho inválido |
| GET | `/api/projetos/{id}/form-factor` | `page`, `page_size`, `semana`, `one_ui` | 200 `PagedResult` de resultados por TC/modelo/data | 401, 403, 404, 422 |

O contrato de listagem de Test Cases inclui os campos de atribuição e os metadados necessários à edição autorizada. Para membros, o backend limita `PUT` a situation/category/difficulty e limita o recurso aos casos atribuídos como responsável principal.

## Backend: arquivos

- `backend/src/domain/entities/{projeto,modelo_dispositivo,projeto_modelo,caso_teste,importacao_sdf,execucao_sdf,resultado_form_factor}.py` e interfaces de repositório correspondentes — regras de domínio, enums, relações e consultas específicas.
- `backend/src/application/schemas/` e `validators/` — requests/responses, validação dos enums, IDs, nomes e arquivos; parser isolado para as duas planilhas.
- `backend/src/application/services/` — casos de uso de projeto, modelos, Test Cases, autorização por escopo/posse, importação transacional e consulta Form Factor.
- `backend/src/infrastructure/data/models/`, `migrations/versions/` e `repositories/` — tabelas, índices únicos por projeto, constraints/FKs e consultas por time, TC ID, modelo, semana e versão One UI.
- `backend/src/application/catalogos/permissoes.py` — permissões de consulta/gestão de projetos e Test Cases e consulta/importação de Form Factor; admin recebe todas, gerente/KP recebem gestão no próprio escopo e os demais perfis podem receber consulta/importação conforme necessidade.
- `backend/src/api/dependencies.py`, `api/routers/{projetos,casos_teste,modelos_dispositivo}.py` e `api/main.py` — composição de dependências e rotas finas.
- Testes em `backend/tests/unit`, `integration` e `functional` — entidades/services, parser e importações, persistência/histórico, API e autorização.

## Frontend: arquivos

- `frontend/src/modules/projetos/` — módulo com `model/`, `api/`, `hooks/`, `components/`, `pages/`, `routes.tsx` e `index.ts`; páginas de projetos, cadastro manual/importação, detalhe e abas Test Cases/Form Factor.
- `frontend/src/modules/modelos-dispositivo/` — CRUD do catálogo de modelos, se mantido como módulo próprio; pode ser incorporado ao módulo `projetos` caso não haja uso fora dele.
- `frontend/src/core/router.tsx`, `core/layout/Sidebar.tsx` — registro das rotas e item de navegação visível conforme permissões.
- `frontend/src/core/mock/database.ts` e `frontend/src/modules/projetos/api/` — fixtures/operações persistidas equivalentes para modo mock.
- `frontend/src/core/i18n/resources.ts` — textos em inglês, português e coreano.
- Testes Vitest/Testing Library para APIs, formulários, tabelas, edição/transferência e Form Factor; Playwright para fluxos centrais com API real.

## Critérios de aceite → testes

| CA | Nível | Verificação |
|---|---|---|
| CA-01–CA-04 | Funcional | Criar projeto para admin/gerente/KP nos respectivos escopos; recusar time fora do escopo |
| CA-05 | Integração/funcional | Associar modelo ativo; rejeitar modelo inexistente ou inativo |
| CA-06–CA-08 | Unitário/funcional | Criar TC manual; exigir responsáveis válidos; rejeitar enums inválidos |
| CA-09–CA-10 | Unitário/funcional | Membro responsável atualiza Category/Difficulty e situação conforme permitido |
| CA-11 | Unitário/integração | Preservar `created_at` e atualizar `updated_at` em projeto/caso |
| CA-12, CA-14 | Integração/funcional | Importar primeira App/One UI e casos; rejeitar linhas inválidas sem persistência parcial |
| CA-13 | Integração/funcional | Rejeitar TC ID repetido no mesmo projeto e aceitar em projetos distintos |
| CA-15–CA-18 | Unitário/funcional | Gestão completa por admin/gerente/KP; edição limitada do responsável; transferência ao backup; recusar escopo/permissão inválidos |
| CA-19–CA-20 | Integração/funcional | Importar lote SDF, preservar dados de gerenciamento e execuções anteriores; recusar falta de permissão ou TC desconhecido sem corromper lote |

## Riscos e decisões pendentes

- A spec ainda não define se o relatório SDF pode conter mais de uma execução do mesmo TC no mesmo arquivo nem a política para reimportar o mesmo arquivo; o modelo preserva cada importação como lote distinto, sem deduplicação implícita.
- O layout real do arquivo exportado pelo SDF precisa ser confirmado antes de fechar o parser, especialmente nomes de colunas, formatos de data e correspondência dos cabeçalhos de modelo ao catálogo.
- A regra de permissão “qualquer perfil” depende de `form_factor.importar` ser concedida explicitamente ao perfil; gerente/KP recebem as permissões de gestão previstas, sem bypass por código de perfil.
- Planilhas grandes podem exceder a memória ou o tempo de uma requisição; limite de arquivo/linhas deve ser definido com o formato real e validado antes da persistência.
