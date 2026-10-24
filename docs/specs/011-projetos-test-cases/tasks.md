# 011. Projetos e Test Cases: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> Na fase 4, `[~]` indica implementação parcial; a pendência está descrita em cada tarefa.

## Fase 1: domínio e persistência

- [x] **T01. Modelar projeto e seus status**
  - Arquivos: `backend/src/domain/entities/projeto.py`, `backend/tests/unit/domain/test_projeto.py`
  - Cobre: CA-01, CA-02, CA-03, CA-11
  - Verificação: `cd backend && uv run pytest tests/unit/domain/test_projeto.py` → entidade deriva nome, inicia em `Created` e atualiza status sem alterar a criação.
- [x] **T02. Modelar catálogo e vínculo de modelos do projeto**
  - Arquivos: `backend/src/domain/entities/modelo_dispositivo.py`, `projeto_modelo.py`, testes `backend/tests/unit/domain/test_modelo_dispositivo.py` e `test_projeto_modelo.py`
  - Cobre: CA-05
  - Verificação: `cd backend && uv run pytest tests/unit/domain/test_modelo_dispositivo.py tests/unit/domain/test_projeto_modelo.py` → entidades guardam nome e associação; validação de modelo ativo e tenant será aplicada no service.
- [x] **T03. Modelar Test Case e regras de atribuição**
  - Arquivos: `backend/src/domain/entities/caso_teste.py`, `backend/tests/unit/domain/test_caso_teste.py`
  - Cobre: CA-06, CA-07, CA-08, CA-09, CA-10, CA-11, CA-17
  - Verificação: `cd backend && uv run pytest tests/unit/domain/test_caso_teste.py` → enums, responsáveis, edição limitada, transferência e timestamps respeitam as regras.
- [x] **T04. Modelar lotes e resultados SDF imutáveis**
  - Arquivos: `backend/src/domain/entities/{importacao_sdf,execucao_sdf,resultado_form_factor}.py`, testes em `backend/tests/unit/domain/`
  - Cobre: CA-19, CA-20
  - Verificação: `cd backend && uv run pytest tests/unit/domain/test_importacao_sdf.py tests/unit/domain/test_execucao_sdf.py tests/unit/domain/test_resultado_form_factor.py` → resultados pertencem a lote/caso/modelo e importações distintas permanecem separadas.
- [x] **T05. Registrar permissões dos novos módulos**
  - Arquivos: `backend/src/application/catalogos/permissoes.py`, teste do catálogo e migration/seed de permissões
  - Cobre: CA-01, CA-02, CA-03, CA-15, CA-18, CA-19, CA-20
  - Verificação: `cd backend && uv run pytest tests/unit/application/test_permissoes.py tests/integration/test_bootstrap.py && uv run alembic heads` → permissões de consulta/gestão/importação aparecem no catálogo e nos perfis seed; migration forma um único head.
- [x] **T06. Persistir projetos e modelos de dispositivo**
  - Arquivos: `backend/src/infrastructure/data/models/{projeto,modelo_dispositivo,projeto_modelo}_model.py`, `backend/src/infrastructure/data/models/__init__.py`, migration Alembic, repositórios correspondentes e testes de integração
  - Cobre: CA-01, CA-02, CA-03, CA-05, CA-11
  - Verificação: `cd backend && uv run pytest tests/integration/test_projeto_repository.py tests/integration/test_modelo_dispositivo_repository.py` → constraints tenant-scoped e associações persistem no Postgres.
- [x] **T07. Persistir Test Cases e unicidade por projeto**
  - Arquivos: `backend/src/infrastructure/data/models/caso_teste_model.py`, `models/__init__.py`, migration Alembic, `caso_teste_repository.py` e testes de integração
  - Cobre: CA-06, CA-07, CA-08, CA-11, CA-13
  - Verificação: `cd backend && uv run pytest tests/integration/test_caso_teste_repository.py` → TC ID é único no projeto e atribuições referenciam usuários válidos.
- [x] **T08. Persistir histórico de importações e resultados SDF**
  - Arquivos: models de `importacao_sdf`, `execucao_sdf`, `resultado_form_factor`, migration Alembic, repositórios e testes de integração
  - Cobre: CA-19, CA-20
  - Verificação: `cd backend && uv run pytest tests/integration/test_resultado_form_factor_repository.py` → múltiplas importações preservam os resultados anteriores.

## Fase 2: regras de aplicação e importadores

- [x] **T09. Implementar CRUD do catálogo de modelos**
  - Arquivos: schemas, interfaces/services de `modelo_dispositivo`, implementação e testes unitários
  - Cobre: CA-05
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_modelo_dispositivo_service.py` → cria, atualiza e inativa modelo; rejeita nome duplicado e modelo inválido.
- [x] **T10. Criar projetos manualmente no escopo autorizado**
  - Arquivos: schemas/interfaces/service de `projeto`, testes unitários
  - Cobre: CA-01, CA-02, CA-03, CA-04, CA-11
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_projeto_service.py` → admin atua na unidade, gerente no setor, KP no time; time fora do escopo é negado.
- [x] **T11. Implementar gestão de status e consulta de projetos**
  - Arquivos: `projeto_service.py`, schemas de listagem/status e testes unitários
  - Cobre: CA-11, CA-15, CA-18
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_projeto_service.py` → status muda manualmente apenas por perfil autorizado e preserva `created_at`.
- [x] **T12. Criar e editar Test Cases com validação de membros**
  - Arquivos: schemas/interfaces/service de `caso_teste`, testes unitários
  - Cobre: CA-06, CA-07, CA-08, CA-09, CA-10, CA-13, CA-15, CA-16, CA-18
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_caso_teste_service.py` → cria e gerencia casos no escopo; valida enums, unicidade, membros e edição limitada do responsável.
- [x] **T13. Implementar transferência do responsável para o backup**
  - Arquivos: `caso_teste_service.py`, testes unitários de autorização e transferência
  - Cobre: CA-16, CA-17, CA-18
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_caso_teste_service.py -k transfer` → responsável vira backup, backup fica nulo e usuário sem posse/permissão é recusado.
- [x] **T14. Validar a planilha inicial antes de criar projeto e casos**
  - Arquivos: parser/validator da planilha inicial, fixtures e testes unitários
  - Cobre: CA-12, CA-13, CA-14
  - Verificação: `cd backend && uv run pytest tests/unit/application/validators/test_importacao_projeto.py` → extrai primeiro App/One UI preenchidos, valida linhas e aponta duplicidades sem persistir parcialmente.
- [x] **T15. Importar projeto e Test Cases da planilha inicial**
  - Arquivos: caso de uso/importador de projetos e testes unitários
  - Cobre: CA-02, CA-03, CA-04, CA-05, CA-12, CA-13, CA-14
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_importacao_projeto_service.py` → arquivo válido cria projeto/casos em uma transação e arquivo inválido não grava dados.
- [x] **T16. Validar arquivo exportado pelo SDF**
  - Arquivos: parser/validator do relatório SDF, fixtures e testes unitários
  - Cobre: CA-19, CA-20
  - Verificação: `cd backend && uv run pytest tests/unit/application/validators/test_relatorio_sdf.py` → identifica TC, SDF ID, data, One UI, modelos e resultados; reporta linhas/cabeçalhos inválidos.
- [x] **T17. Persistir importações SDF sem sobrescrever resultados anteriores**
  - Arquivos: service/importador SDF, testes unitários de serviço
  - Cobre: CA-19, CA-20
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_importacao_sdf_service.py` → exige permissão e escopo, associa TC IDs do projeto e grava novo lote sem alterar gerenciamento ou lotes prévios.
- [x] **T18. Consultar resultados Form Factor com filtros**
  - Arquivos: queries do repositório, service/schema Form Factor e testes unitários
  - Cobre: CA-19, CA-20
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_form_factor_service.py` → retorna resultados por TC/modelo/data e filtra por semana e One UI no escopo.

## Fase 3: API e testes funcionais

- [x] **T19. Expor API do catálogo de modelos e projetos**
  - Arquivos: `api/dependencies.py`, routers `modelos_dispositivo.py` e `projetos.py`, `api/main.py`, testes funcionais correspondentes
  - Cobre: CA-01–CA-05, CA-11, CA-18
  - Verificação: `cd backend && uv run pytest tests/functional/test_modelos_dispositivo_api.py tests/functional/test_projetos_api.py` → rotas retornam contratos/status previstos e recusam escopo inválido.
- [x] **T20. Expor API de Test Cases e transferência**
  - Arquivos: router `casos_teste.py`, dependências, `api/main.py`, `tests/functional/test_casos_teste_api.py`
  - Cobre: CA-06–CA-10, CA-13, CA-15–CA-18
  - Verificação: `cd backend && uv run pytest tests/functional/test_casos_teste_api.py` → CRUD autorizado, edição por responsável limitada e transferência troca responsável/limpa backup.
- [x] **T21. Expor importação SDF e consulta Form Factor**
  - Arquivos: router de relatório/Form Factor, dependências, `api/main.py`, `tests/functional/test_form_factor_api.py`
  - Cobre: CA-19, CA-20
  - Verificação: `cd backend && uv run pytest tests/functional/test_form_factor_api.py` → upload autorizado cria lote, filtros consultam histórico e upload inválido/sem permissão não altera dados.
- [x] **T22. Cobrir autorização e isolamento por unidade**
  - Arquivos: `backend/tests/functional/test_projetos_api.py`, `test_casos_teste_api.py`, `test_form_factor_api.py`
  - Cobre: CA-04, CA-18, CA-20
  - Verificação: `cd backend && uv run pytest tests/functional/test_projetos_api.py tests/functional/test_casos_teste_api.py tests/functional/test_form_factor_api.py` → acessos fora do tenant/escopo e sem permissão são recusados.

## Fase 4: frontend e modo mock

- [x] **T23. Criar modelos e clientes de API dos projetos**
  - Arquivos: `frontend/src/modules/projetos/model/`, `api/`, `hooks/`, testes de API e hooks
  - Cobre: CA-01–CA-14
  - Verificação: `cd frontend && npm test -- --run src/modules/projetos/api` → clientes enviam payloads/uploads corretos e interpretam respostas/erros.
  - Concluído: modelos, clientes e hooks implementados; testes de API/hooks cobrem paginação, payloads, upload multipart, consultas e invalidação de escopo.
- [x] **T24. Adicionar projetos, casos e resultados à base mock**
  - Arquivos: `frontend/src/core/mock/database.ts`, mocks de projetos e testes do banco/mock
  - Cobre: CA-01–CA-20
  - Verificação: `cd frontend && npm test -- --run src/core/mock` → operações mock persistem projetos, atribuições e lotes SDF sem substituir histórico.
  - Concluído: parser de planilhas Excel valida cabeçalhos, enums, IDs e atribuições; a importação mock cria projeto, modelos e Test Cases em uma gravação única, resolve membros por nome/e-mail e preserva resultados SDF. Testes cobrem leitura, erros e persistência.
- [x] **T25. Criar tela de listagem e cadastro manual de projeto**
  - Arquivos: páginas/componentes de projetos, formulários e testes de componente
  - Cobre: CA-01–CA-05, CA-11
  - Verificação: `cd frontend && npm test -- --run src/modules/projetos` → cadastro manual deriva nome e respeita os times/modelos disponíveis ao perfil.
  - Concluído: listagem e cadastro manual implementados; testes cobrem os dados da tabela e a criação com time/modelo selecionados.
- [x] **T26. Criar fluxo de importação inicial da planilha**
  - Arquivos: formulário/preview de importação inicial e testes de componente
  - Cobre: CA-12, CA-13, CA-14
  - Verificação: `cd frontend && npm test -- --run src/modules/projetos` → envia arquivo/time/modelos, mostra resumo e erros de linhas/duplicidades.
  - Concluído: arquivo é lido antes do envio; App e One UI são extraídos do primeiro valor preenchido, a prévia mostra todos os Test Cases e os erros de leitura/validação impedem a criação. Testes cobrem prévia, erros e resumo.
- [x] **T27. Criar gestão de Test Cases e atribuições**
  - Arquivos: componentes/tabela/formulário de casos, testes de componente
  - Cobre: CA-06–CA-10, CA-13, CA-15–CA-18
  - Verificação: `cd frontend && npm test -- --run src/modules/projetos` → KP/gerente/admin veem ações de gestão; membro edita apenas os próprios campos autorizados.
  - Concluído: testes cobrem gestão por admin/KP/gerente com permissão, edição própria de categoria/dificuldade/situação, restrição de casos alheios e transferência ao backup.
- [x] **T28. Criar visualização e importação Form Factor**
  - Arquivos: página/componentes Form Factor, hooks e testes de componente
  - Cobre: CA-19, CA-20
  - Verificação: `cd frontend && npm test -- --run src/modules/projetos` → importa relatório, apresenta resultados por modelo, semana e One UI, preserva histórico e mostra erros.
  - Concluído: teste verifica dados por modelo, filtros de semana e One UI e envio de relatório SDF; API/backend preservam importações anteriores.
- [x] **T29. Criar manutenção do catálogo de modelos de dispositivo**
  - Arquivos: `frontend/src/modules/projetos/components/ModelosDispositivo*`, hooks/API se necessário, testes de componente
  - Cobre: CA-05
  - Verificação: `cd frontend && npm test -- --run src/modules/projetos` → modelos podem ser criados/editados/inativados conforme permissão e somente ativos são associáveis.
  - Concluído: testes cobrem criação, edição, ativação/inativação, bloqueio sem permissão e carregamento do catálogo ativo no cadastro de projetos.
- [x] **T30. Registrar rotas, navegação, permissões e traduções**
  - Arquivos: `frontend/src/core/router.tsx`, `core/layout/Sidebar.tsx`, `core/i18n/resources.ts`, testes de navegação/i18n
  - Cobre: CA-01–CA-20
  - Verificação: `cd frontend && npm test -- --run src/core/router src/core/layout/Sidebar` e `npm run lint` → acesso/navegação respeitam permissões e os textos existem em en/pt/ko.
  - Concluído: testes verificam rotas, visibilidade da navegação por permissão e paridade das traduções en/pt/ko.
- [x] **T31. Cobrir criação manual e gestão de Test Cases ponta a ponta**
  - Arquivos: `frontend/e2e/projetos.spec.ts`, fixtures de autenticação/time
  - Cobre: CA-01–CA-11, CA-15–CA-18
  - Verificação: `cd frontend && npm run e2e -- projetos.spec.ts` → projeto e Test Case são criados, atribuídos e transferidos ao backup no navegador; edição e limites de permissão também têm cobertura de componente.
- [x] **T32. Cobrir importação inicial de planilha ponta a ponta**
  - Arquivos: `frontend/e2e/projetos-importacao.spec.ts`, planilha fixture
  - Cobre: CA-12–CA-14
  - Verificação: `cd frontend && npm run e2e -- projetos-importacao.spec.ts` → importação mostra a quantidade criada e arquivo inválido exibe os erros da linha.
- [x] **T33. Cobrir relatório SDF e Form Factor ponta a ponta**
  - Arquivos: `frontend/e2e/form-factor.spec.ts`, relatório SDF fixture
  - Cobre: CA-19, CA-20
  - Verificação: `cd frontend && npm run e2e -- form-factor.spec.ts` → novo relatório exibe seus resultados e mantém os anteriores; resposta de escopo negado não altera o histórico exibido.

## Fase 5: TC Situation, Status e erros estruturados no backend (revisão de 2026-10-24)

- [ ] **T34. Separar TC Situation e Status no domínio**
  - Arquivos: `backend/src/domain/entities/caso_teste.py`, `backend/tests/unit/domain/test_caso_teste.py`
  - Cobre: CA-06, CA-08, CA-10
  - Verificação: `cd backend && uv run pytest tests/unit/domain/test_caso_teste.py` → `StatusCasoTeste` mantém `To-Do`…`Fail` e inicia em `To-Do`; `SituacaoCasoTeste` aceita só `New`, `New Step` e `Without Changes`; `atualizar_campos_do_responsavel` não altera `situation`; valor inválido é recusado.
- [ ] **T35. Migrar a coluna e persistir `status` e `situation`**
  - Arquivos: `backend/src/infrastructure/data/models/caso_teste_model.py`, nova migration em `migrations/versions/`, `infrastructure/repositories/caso_teste_repository.py`, `backend/tests/integration/test_caso_teste_repository.py`
  - Cobre: CA-23
  - Verificação: `cd backend && uv run pytest tests/integration/test_caso_teste_repository.py` → caso gravado antes da migration fica com `situation = New` e `status` igual ao valor antigo; os dois campos fazem ida e volta no repositório; downgrade restaura a coluna original.
- [ ] **T36. Ajustar schemas e regras de edição do Test Case**
  - Arquivos: `backend/src/application/schemas/caso_teste.py`, `application/services/caso_teste_service.py`, `backend/tests/unit/application/services/test_caso_teste_service.py`
  - Cobre: CA-06, CA-08, CA-09, CA-10, CA-15, CA-16
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_caso_teste_service.py` → criação exige `situation` e inicia `status` em `To-Do`; gestão edita `situation` e `status`; responsável edita `status`, Category e Difficulty e é recusado ao enviar `situation`.
- [ ] **T37. Validar a planilha com TC Situation e erros estruturados**
  - Arquivos: `backend/src/application/validators/importacao_projeto.py`, `backend/tests/unit/application/validators/test_importacao_projeto.py`
  - Cobre: CA-12, CA-14, CA-21, CA-22, CA-26, CA-27, CA-28, CA-29
  - Verificação: `cd backend && uv run pytest tests/unit/application/validators/test_importacao_projeto.py` → cada erro tem `codigo`, `linha`, `coluna` (texto do cabeçalho), `valor` e `parametros`; TC Situation vazio ou `To-Do` gera `valor_obrigatorio`/`valor_invalido` com os esperados; coluna `Status` é ignorada; duplicado traz `primeira_linha`; problemas gerais têm `linha` nula; `total_linhas` é informado; planilha com 1.000 linhas é validada.
- [ ] **T38. Coletar todos os erros de pessoas na importação**
  - Arquivos: `backend/src/application/services/importacao_projeto_service.py`, `backend/tests/unit/application/services/test_importacao_projeto_service.py`
  - Cobre: CA-07, CA-12, CA-21, CA-26, CA-27
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_importacao_projeto_service.py` → linhas com pessoa inexistente, ambígua, fora do time ou responsável igual ao backup geram erros estruturados de todas as linhas num único `PlanilhaProjetoInvalida`, sem criar projeto nem casos; casos válidos são criados com a `situation` da linha e `status` `To-Do`; membros do time são carregados uma vez.
- [ ] **T39. Expor os erros estruturados e os campos novos na API**
  - Arquivos: `backend/src/api/error_handling/problem_details.py`, `api/error_handling/handlers.py`, `backend/tests/functional/test_projetos_api.py`, `backend/tests/functional/test_casos_teste_api.py`
  - Cobre: CA-06, CA-16, CA-21, CA-26–CA-29
  - Verificação: `cd backend && uv run pytest tests/functional/test_projetos_api.py tests/functional/test_casos_teste_api.py` → `POST /api/projetos/importar` inválido devolve 422 com `total_linhas` e `errors[]` com os membros de extensão (mantendo `campo`/`mensagem`); listagem e detalhe de Test Case retornam `situation` e `status`; responsável recebe 403 ao enviar `situation`.

## Fase 6: frontend, prévia paginada e mensagens amigáveis

- [ ] **T40. Atualizar modelo, cliente de API e base mock**
  - Arquivos: `frontend/src/modules/projetos/model/projeto.ts`, `api/projetos.api.ts`, `api/projetos.api.test.ts`, `frontend/src/core/mock/database.ts`, `core/mock/database.test.ts`
  - Cobre: CA-06, CA-16, CA-23
  - Verificação: `cd frontend && npm test -- --run src/modules/projetos/api src/core/mock` → tipos `StatusCasoTeste`/`SituacaoCasoTeste` e `ErroPlanilha`; mock usa a chave `v2`, cria casos com `situation` informada e `status` `To-Do` e recusa `situation` vinda do responsável.
- [ ] **T41. Validar a planilha no navegador com os mesmos códigos**
  - Arquivos: `frontend/src/modules/projetos/utils/planilha-projeto.ts`, `utils/planilha-projeto.test.ts`, `utils/formatar-erro-planilha.ts`, `utils/formatar-erro-planilha.test.ts`, `frontend/src/core/i18n/resources.ts`, `core/i18n/resources.test.ts`
  - Cobre: CA-21, CA-22, CA-27–CA-30
  - Verificação: `cd frontend && npm test -- --run src/modules/projetos/utils src/core/i18n` → parser emite os mesmos códigos do backend (TC Situation obrigatório, `Status` ignorado, duplicado com primeira linha, erro geral sem linha, `totalLinhas`); cada código gera texto em en, pt e ko com coluna, valor e esperados, sem chave técnica.
- [ ] **T42. Paginar a prévia da planilha**
  - Arquivos: `frontend/src/modules/projetos/components/PreviaPlanilha.tsx`, `components/PreviaPlanilha.test.tsx`, `ProjetosPage.tsx`
  - Cobre: CA-24
  - Verificação: `cd frontend && npm test -- --run src/modules/projetos/components/PreviaPlanilha` → 1.000 casos mostram o total, 20 por página, primeira/anterior/próxima/última e página atual de total; coluna TC Situation sem Status (skill `table-rules`).
- [ ] **T43. Mostrar os erros da planilha agrupados e paginados**
  - Arquivos: `frontend/src/modules/projetos/components/ErrosPlanilha.tsx`, `components/ErrosPlanilha.test.tsx`, `ProjetosPage.tsx`
  - Cobre: CA-14, CA-26–CA-29
  - Verificação: `cd frontend && npm test -- --run src/modules/projetos/components/ErrosPlanilha` → resumo "X de Y linhas", problemas gerais separados, uma entrada por linha com todos os problemas, 20 linhas por página e criação bloqueada; o mesmo componente exibe erros da prévia e do 422 do servidor.
- [ ] **T44. Atualizar toast de sucesso e modelo de planilha para download**
  - Arquivos: `frontend/src/modules/projetos/ProjetosPage.tsx`, `ProjetosPage.test.tsx`, `core/i18n/resources.ts`
  - Cobre: CA-25
  - Verificação: `cd frontend && npm test -- --run src/modules/projetos/ProjetosPage` → toast "Planilha importada com sucesso: N Test Cases criados em <projeto>" nos três idiomas; modelo baixado traz TC Situation `New` e não traz Status.
- [ ] **T45. Exibir e editar TC Situation e Status no detalhe do projeto**
  - Arquivos: `frontend/src/modules/projetos/ProjetoDetalhePage.tsx`, `ProjetoDetalhePage.test.tsx`, `core/i18n/resources.ts`
  - Cobre: CA-06, CA-09, CA-10, CA-15, CA-16
  - Verificação: `cd frontend && npm test -- --run src/modules/projetos/ProjetoDetalhePage` → tabela tem colunas, filtros e badges de TC Situation e Status; cadastro manual exige TC Situation; gestão edita os dois; responsável edita só Status, Category e Difficulty.
- [ ] **T46. Cobrir o novo fluxo de importação e edição ponta a ponta**
  - Arquivos: `frontend/e2e/projetos-importacao.spec.ts`, `e2e/projetos.spec.ts`, `e2e/projetos-fixtures.ts`
  - Cobre: CA-12, CA-21, CA-24–CA-27
  - Verificação: `cd frontend && npm run e2e -- projetos-importacao.spec.ts projetos.spec.ts` → planilha com muitas linhas pagina a prévia e mostra o toast com a quantidade; planilha inválida mostra erros agrupados no idioma da interface; caso manual é criado com TC Situation e Status `To-Do`.

## Backlog

- Definir limite de tamanho/linhas dos arquivos depois que as planilhas reais forem confirmadas.
- Definir idempotência ao reimportar o mesmo arquivo e política para SDF IDs repetidos; linhas com o mesmo TC ID são preservadas como execuções distintas.
- Confirmar layout oficial do export SDF e convenção de semana antes de finalizar o parser e os filtros.
- Reavaliar extração de validação compartilhada de textos se a duplicação entre entidades crescer nas fases de schemas/importadores.
