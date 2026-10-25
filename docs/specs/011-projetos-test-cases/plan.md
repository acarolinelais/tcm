# 011. Projetos e Test Cases: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0007, 0008, 0009, 0010, 0013, 0018, 0021, 0026, 0030, 0031
- **ADRs novos propostos:** 0033 (erros de planilha com código estruturado e tradução no frontend)

## Abordagem

Adicionar um módulo de projetos que concentra projeto, catálogo de modelos, Test Cases e a visualização Form Factor. O gerenciamento dos casos usa permissões configuráveis no perfil e valida o escopo atual: gerente nos setores associados, KP nos times em que participa e membro responsável somente nos campos permitidos. A importação inicial cria o projeto e os casos em uma operação validada antes de persistir; a importação SDF cria registros de execução separados e imutáveis, relacionados ao projeto, caso e modelo para preservar cada resultado. O frontend oferece cadastro manual, importações de planilhas, listagem/edição de casos e abas de Test Cases e Form Factor, usando APIs mock quando `VITE_USE_MOCK=true`.

## Modelo de dados

| Entidade | Campos principais | Regras |
|---|---|---|
| `Projeto` | unidade, time, nome, app, one_ui, status | Um time; nome editável, inicialmente composto por app + versão; status manual; `Created` inicial |
| `ModeloDispositivo` | unidade, nome, ativo | Catálogo editável por gerente/KP autorizado; modelos associados a projetos |
| `ProjetoModelo` | projeto, modelo | Associação N:N; somente modelos ativos da unidade |
| `CasoTeste` | projeto, tc_id, category, difficulty, situation, status, responsavel_id, backup_id | TC ID único por projeto; responsáveis do time; backup pode ficar nulo após transferência; `situation` = TC Situation (`New`, `New Step`, `Without Changes`), obrigatório e editável só pela gestão; `status` = progresso (`To-Do`…`Fail`), inicia em `To-Do` |
| `ImportacaoSdf` | projeto, importado_por, importado_em | Um registro por arquivo/importação, preserva origem e data do lote |
| `ExecucaoSdf` | importação, caso_teste, sdf_id, data_reportada, one_ui | Uma ocorrência do TC reportada pelo SDF; não substitui ocorrências anteriores |
| `ResultadoFormFactor` | execução, modelo, resultado | Resultado fornecido pelo SDF para um modelo na execução; sem sobrescrever execuções anteriores |

`week` para filtro é derivado da data reportada usando uma convenção única definida no parser. Os valores de resultado e o nome do modelo são interpretados conforme cabeçalho/colunas da planilha SDF; o parser precisa validar e normalizar os cabeçalhos para IDs de modelos do catálogo associado ao projeto.

## Contrato da API

Todas as rotas exigem autenticação, filtram por `unidade_id` e aplicam permissão mais escopo no service. Administrador da unidade tem todas as permissões dentro do tenant; gerente e KP também precisam do escopo de setor/time correspondente; demais perfis só executam ações concedidas explicitamente. Uploads usam `multipart/form-data`; erros de validação seguem ProblemDetails.

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET, POST | `/api/projetos` | filtros paginados; `{ time_id, nome?, app, one_ui, modelos_ids }` | 200 `PagedResult`; 201 + `Location` | 401, 403, 404, 422 |
| POST | `/api/projetos/importar` | arquivo inicial + `time_id` + `modelos_ids` | 201 projeto e resumo dos casos importados | 401, 403, 404, 409 duplicidade, 422 planilha inválida |
| GET | `/api/projetos/{id}` | — | 200 projeto | 401, 403, 404 |
| PATCH | `/api/projetos/{id}/status` | `{ status }` | 200 projeto | 401, 403, 404, 422 |
| PUT | `/api/projetos/{id}` | `{ nome, app, one_ui, time_id, modelos_ids }` | 200 projeto atualizado | 401, 403, 404, 409, 422 |
| GET, POST | `/api/projetos/{id}/test-cases` | filtros paginados; campos do caso | 200 `PagedResult`; 201 caso + `Location` | 401, 403, 404, 409 TC ID duplicado, 422 |
| GET, PUT | `/api/test-cases/{id}` | —; campos editáveis conforme autorização | 200 caso | 401, 403, 404, 409, 422 |
| PATCH | `/api/test-cases/{id}/transferir-para-backup` | — | 200 caso com responsável trocado e backup nulo | 401, 403, 404, 409 se backup ausente |
| GET, POST | `/api/modelos-dispositivo` | filtros/listagem; `{ nome }` | 200 `PagedResult`; 201 + `Location` | 401, 403, 409 duplicado, 422 |
| PUT, PATCH | `/api/modelos-dispositivo/{id}` e `/{id}/ativar|inativar` | atualização/estado | 200 modelo | 401, 403, 404, 409, 422 |
| POST | `/api/projetos/{id}/relatorios-sdf` | arquivo do relatório | 201 resumo do lote importado | 401, 403, 404, 409 vínculo inválido, 422 formato/cabeçalho inválido |
| GET | `/api/projetos/{id}/form-factor` | `page`, `page_size`, `semana`, `one_ui` | 200 `PagedResult` de resultados por TC/modelo/data | 401, 403, 404, 422 |

O contrato de listagem de Test Cases inclui os campos de atribuição e os metadados necessários à edição autorizada. Para membros, o backend limita `PUT` a status/category/difficulty e limita o recurso aos casos atribuídos como responsável principal.

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
| CA-09–CA-10 | Unitário/funcional | Membro responsável atualiza Category/Difficulty e Status conforme permitido |
| CA-11 | Unitário/integração | Preservar `created_at` e atualizar `updated_at` em projeto/caso |
| CA-12, CA-14 | Integração/funcional | Importar primeira App/One UI e casos; rejeitar linhas inválidas sem persistência parcial |
| CA-13 | Integração/funcional | Rejeitar TC ID repetido no mesmo projeto e aceitar em projetos distintos |
| CA-15–CA-18 | Unitário/funcional | Gestão completa por admin/gerente/KP; edição limitada do responsável; transferência ao backup; recusar escopo/permissão inválidos |
| CA-19–CA-20 | Integração/funcional | Importar lote SDF, preservar dados de gerenciamento e execuções anteriores; recusar falta de permissão ou TC desconhecido sem corromper lote |
| CA-06, CA-08, CA-16 | Unitário/funcional | `test_caso_teste.py`, `test_caso_teste_service.py`, `test_casos_teste_api.py`: TC Situation obrigatório e válido; Status inicial `To-Do`; responsável recebe 403 ao enviar `situation` |
| CA-12, CA-21, CA-22 | Unitário/integração | `validators/test_importacao_projeto.py`, `planilha-projeto.test.ts`: TC Situation por linha, vazio/inválido recusado, coluna Status ignorada |
| CA-23 | Integração | `integration/test_caso_teste_repository.py`: casos existentes ficam com `situation = New` e `status` = valor antigo |
| CA-24 | Unitário (Vitest) + e2e | `PreviaPlanilha.test.tsx` e `projetos-importacao.spec.ts`: planilha com 1.000 linhas, 20 por página, navegação e total |
| CA-25 | Unitário (Vitest) + e2e | `ProjetosPage.test.tsx`: toast com quantidade de casos e nome do projeto |
| CA-26–CA-29 | Unitário/integração/funcional | `validators/test_importacao_projeto.py`, `test_importacao_projeto_service.py`, `test_projetos_api.py`, `ErrosPlanilha.test.tsx`: resumo, agrupamento por linha, valor encontrado, linha original do duplicado, erro geral sem linha, membro inválido coletado junto |
| CA-30 | Unitário (Vitest) | `formatar-erro-planilha.test.ts` e `resources.test.ts`: cada código tem texto em en, pt e ko |

## Ajuste: TC Situation, Status e importação amigável (revisão de 2026-10-24)

**Abordagem.** O campo `situation` do caso deixa de ser o progresso: o progresso passa a se chamar `status` (mesmos valores de hoje) e `situation` passa a guardar o TC Situation (`New`, `New Step`, `Without Changes`). A planilha de Test Cases exige `TC Situation` em cada linha e ignora qualquer coluna `Status`. A validação da planilha deixa de devolver mensagens prontas em português: cada problema sai como um código estruturado (linha opcional, coluna como está no cabeçalho, valor encontrado e parâmetros), e o frontend monta o texto no idioma da interface (ADR 0033). O service de importação passa a coletar todos os problemas de responsável e backup, que hoje param na primeira linha com 409, e devolvê-los no mesmo 422 da validação. A prévia e a lista de erros são paginadas no cliente com o `TablePagination` compartilhado (20 por página).

**Modelo de dados e migration.**

| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| `CasoTeste` | `status` | `StatusCasoTeste` (`To-Do`, `InProgress`, `InReview`, `Pass`, `Fail`) | Renomeado a partir de `situation`; inicia em `To-Do`; editável por gestão e responsável |
| `CasoTeste` | `situation` | `SituacaoCasoTeste` (`New`, `New Step`, `Without Changes`) | Obrigatório; editável só pela gestão |

A migration renomeia a coluna `situation` para `status` (preservando os valores) e cria `situation` `NOT NULL` com `server_default 'New'` para preencher os casos existentes (CA-23); o default é removido em seguida, porque o valor passa a ser sempre informado. No domínio, o enum atual vira `StatusCasoTeste` e `SituacaoCasoTeste` passa a ter os três valores novos.

**Contrato da API (mudanças).**

| Rota | Mudança |
|---|---|
| `POST /api/projetos/{id}/test-cases` | `situation` obrigatório (`New`, `New Step`, `Without Changes`); `status` não é aceito na criação (inicia em `To-Do`) |
| `GET/PUT /api/test-cases/{id}` e listagem | Resposta com `situation` e `status`; `PUT` aceita os dois; responsável principal recebe 403 se enviar `situation` |
| `POST /api/projetos/importar` | 422 com `errors[]` estruturado (abaixo) e `total_linhas`; problemas de responsável/backup também vêm como 422 por linha, não mais 409 |

Cada item de `errors[]` mantém `campo` e `mensagem` (ADR 0006) e ganha os membros de extensão `codigo`, `linha` (nulo para problema geral), `coluna` (texto do cabeçalho da planilha), `valor` (texto encontrado ou nulo se vazio) e `parametros` (ex.: `{ "esperados": ["New", "New Step", "Without Changes"] }`, `{ "primeira_linha": 2 }`). Códigos: `arquivo_invalido`, `planilha_vazia`, `cabecalho_duplicado`, `coluna_obrigatoria_ausente`, `sem_casos`, `app_ausente`, `one_ui_ausente`, `valor_obrigatorio`, `valor_invalido`, `tc_id_duplicado`, `pessoa_nao_encontrada`, `pessoa_ambigua`, `pessoa_fora_do_time`, `responsavel_igual_backup`.

**Backend: arquivos.**
- `domain/entities/caso_teste.py` — `StatusCasoTeste`, nova `SituacaoCasoTeste`, campos `status`/`situation`; `atualizar_campos_do_responsavel(status, category, difficulty)` e `atualizar_gerenciamento(..., situation, status, ...)`.

- `infrastructure/data/models/caso_teste_model.py`, nova migration em `migrations/versions/` e `infrastructure/repositories/caso_teste_repository.py` (mapeamento e filtro por `status` e `situation`).
- `application/schemas/caso_teste.py` e `services/caso_teste_service.py` — `CAMPOS_RESPONSAVEL = {category, difficulty, status}`.
- `application/validators/importacao_projeto.py` — `ErroImportacaoPlanilha(codigo, linha, coluna, valor, parametros)`, `TC Situation` obrigatório, coluna `Status` ignorada, duplicado com `primeira_linha`, `total_linhas` em `PlanilhaProjetoInvalida`.
- `application/services/importacao_projeto_service.py` — acumula os erros de pessoas de todas as linhas e lança `PlanilhaProjetoInvalida`; carrega os membros ativos do time uma vez em vez de uma consulta por linha.
- `api/error_handling/problem_details.py` e `handlers.py` — campos de extensão em `ProblemDetailsError` e `total_linhas` no ProblemDetails da planilha.

**Frontend: arquivos.**
- `modules/projetos/model/projeto.ts` e `api/projetos.api.ts` — `StatusCasoTeste`, nova `SituacaoCasoTeste`, tipo `ErroPlanilha` estruturado.
- `modules/projetos/utils/planilha-projeto.ts` — mesmos códigos do backend, `TC Situation` obrigatório, `Status` ignorado, `totalLinhas`; modelo para download com `New`.
- `modules/projetos/utils/formatar-erro-planilha.ts` (novo) — código → texto traduzido com coluna, valor e esperados.
- `modules/projetos/components/PreviaPlanilha.tsx` e `components/ErrosPlanilha.tsx` (novos) — tabelas paginadas com `TablePagination`; erros com resumo, gerais separados e agrupamento por linha (skill `table-rules`).
- `modules/projetos/ProjetosPage.tsx` — usa os dois componentes e o novo texto de sucesso.
- `modules/projetos/ProjetoDetalhePage.tsx` — colunas, filtros e badges de TC Situation e Status; campo TC Situation no cadastro manual; edição de TC Situation só para a gestão.
- `core/mock/database.ts` — campos novos, regra de edição e migração `schemaVersion` 9 (o progresso antigo vai para `status` e os casos recebem `New`), seguindo o mecanismo de migração que a base mock já usa.
- `shared/ui/table.tsx` e `docs/tables-rules.md` — `TablePagination` ganha primeira/última página e "Página X de Y" para todas as tabelas (regra: mudar o componente compartilhado, não a tela).
- `core/i18n/resources.ts` — rótulos, opções, toast e um texto por código de erro em en, pt e ko.
- `e2e/projetos-importacao.spec.ts`, `e2e/projetos.spec.ts` e `e2e/projetos-fixtures.ts` — fixtures com TC Situation e cenários de prévia paginada e erros.

## Manutenção de filtros de semana — 2026-10-24

- O seletor de semana fica no canto superior direito do cabeçalho do card nas duas abas, com estado independente e retorno à página 1. O campo de filtro One UI foi removido da interface de Form Factor; a coluna e o contrato existente da API permanecem.
- `GET /api/projetos/{id}/test-cases` aceita `semana=YYYY-Www` e `fuso_horario` IANA (padrão UTC), enviados pelo cliente somente quando o filtro está ativo. O service valida a semana/fuso e converte os limites locais para UTC; o repositório aplica `status = Pass` e `coalesce(updated_at, created_at) >= início AND < fim` antes de contar/paginar, junto do escopo e dos demais filtros. Sem semana, o comportamento é preservado.
- Timestamps de Test Cases são serializados com UTC explícito, pois o banco atual os armazena sem informação de fuso. Isso mantém a Data final apresentada no navegador alinhada aos limites usados na consulta. Não há migration.
- O parser de semana do Form Factor foi extraído para `application/validators/semana.py`, mantendo sua assinatura importável e mensagens de erro existentes; o novo argumento de fuso é usado por Test Cases. Mock e cache incluem o novo filtro. A consulta de associação do dev não usa a semana, para não confundir ausência de resultados com perda de associação.
- CA-31: integração PostgreSQL (limites inclusivo/exclusivo, contagem, escopo e paginação), cliente/mock e jornada real do dev; CA-32: validação de semana/fuso e contrato HTTP; CA-33: teste de componente de alternância e limpeza. Cobrir também transição de horário de verão e serialização UTC.

## Riscos e decisões pendentes

- A spec ainda não define se o relatório SDF pode conter mais de uma execução do mesmo TC no mesmo arquivo nem a política para reimportar o mesmo arquivo; o modelo preserva cada importação como lote distinto, sem deduplicação implícita.
- O layout real do arquivo exportado pelo SDF precisa ser confirmado antes de fechar o parser, especialmente nomes de colunas, formatos de data e correspondência dos cabeçalhos de modelo ao catálogo.
- A regra de permissão “qualquer perfil” depende de `form_factor.importar` ser concedida explicitamente ao perfil; gerente/KP recebem as permissões de gestão previstas, sem bypass por código de perfil.
- Planilhas grandes podem exceder a memória ou o tempo de uma requisição; limite de arquivo/linhas deve ser definido com o formato real e validado antes da persistência.
- Renomear `situation` para `status` e reaproveitar `situation` com outro significado quebra o contrato atual da API; o único consumidor é o frontend deste repositório, atualizado no mesmo bloco. A migration é reversível (downgrade descarta `situation` e renomeia `status` de volta).
- Validação duplicada no cliente (prévia) e no servidor (importação): os dois precisam emitir os mesmos códigos; os testes de ambos usam os mesmos casos de planilha.
- A prévia não consulta os membros do time: com problemas na planilha, o botão vira "Conferir planilha" e o servidor devolve os problemas de célula e de pessoas juntos (o service confere as pessoas mesmo com a planilha inválida), sem criar nada.

## Ajuste: edição dos dados do projeto — 2026-10-25

Persistir `nome` diretamente em `projetos`, preenchendo registros existentes com `app || ' ' || one_ui` via migration. Ampliar o contrato de criação manual e edição para `nome`, `app`, `one_ui`, `time_id` e `modelos_ids`; a importação inicial continua derivando o nome da planilha. Atualizar o service para validar time ativo e escopo, validar modelos ativos da unidade, impedir troca de time quando houver responsáveis/backups de casos ativos que não pertençam ao time de destino, sincronizar os vínculos de modelos e fazer um único commit. A listagem/detalhe passam a devolver também IDs dos modelos vinculados para inicializar o formulário sem perder associações inativas.

No frontend, o drawer de edição passa a expor nome, App, One UI, time e modelos. A criação manual oferece nome com composição inicial editável; a importação continua usando App e One UI da planilha para sugerir o nome.

## Ajuste: edição rápida de responsável e backup — 2026-10-25

Reutilizar a permissão `test_cases.gerenciar` e o `PUT /api/test-cases/{id}` existente. Nas colunas Assignee e Backup, renderizar dropdowns somente para administrador, gerente ou KP autorizado no escopo (mesma regra de gestão de TC); popular com membros ativos distintos do outro campo. O service já valida escopo, participação ativa, distinção e commit. Form Factor é histórico de resultados e permanece somente leitura para atribuições.
