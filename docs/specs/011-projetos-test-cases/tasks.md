# 011. Projetos e Test Cases: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

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

- [ ] **T19. Expor API do catálogo de modelos e projetos**
  - Arquivos: `api/dependencies.py`, routers `modelos_dispositivo.py` e `projetos.py`, `api/main.py`, testes funcionais correspondentes
  - Cobre: CA-01–CA-05, CA-11, CA-18
  - Verificação: `cd backend && uv run pytest tests/functional/test_modelos_dispositivo_api.py tests/functional/test_projetos_api.py` → rotas retornam contratos/status previstos e recusam escopo inválido.
- [ ] **T20. Expor API de Test Cases e transferência**
  - Arquivos: router `casos_teste.py`, dependências, `api/main.py`, `tests/functional/test_casos_teste_api.py`
  - Cobre: CA-06–CA-10, CA-13, CA-15–CA-18
  - Verificação: `cd backend && uv run pytest tests/functional/test_casos_teste_api.py` → CRUD autorizado, edição por responsável limitada e transferência troca responsável/limpa backup.
- [ ] **T21. Expor importação SDF e consulta Form Factor**
  - Arquivos: router de relatório/Form Factor, dependências, `api/main.py`, `tests/functional/test_form_factor_api.py`
  - Cobre: CA-19, CA-20
  - Verificação: `cd backend && uv run pytest tests/functional/test_form_factor_api.py` → upload autorizado cria lote, filtros consultam histórico e upload inválido/sem permissão não altera dados.
- [ ] **T22. Cobrir autorização e isolamento por unidade**
  - Arquivos: `backend/tests/functional/test_projetos_api.py`, `test_casos_teste_api.py`, `test_form_factor_api.py`
  - Cobre: CA-04, CA-18, CA-20
  - Verificação: `cd backend && uv run pytest tests/functional/test_projetos_api.py tests/functional/test_casos_teste_api.py tests/functional/test_form_factor_api.py` → acessos fora do tenant/escopo e sem permissão são recusados.

## Fase 4: frontend e modo mock

- [ ] **T23. Criar modelos e clientes de API dos projetos**
  - Arquivos: `frontend/src/modules/projetos/model/`, `api/`, `hooks/`, testes de API e hooks
  - Cobre: CA-01–CA-14
  - Verificação: `cd frontend && npm test -- --run src/modules/projetos/api` → clientes enviam payloads/uploads corretos e interpretam respostas/erros.
- [ ] **T24. Adicionar projetos, casos e resultados à base mock**
  - Arquivos: `frontend/src/core/mock/database.ts`, mocks de projetos e testes do banco/mock
  - Cobre: CA-01–CA-20
  - Verificação: `cd frontend && npm test -- --run src/core/mock` → operações mock persistem projetos, atribuições e lotes SDF sem substituir histórico.
- [ ] **T25. Criar tela de listagem e cadastro manual de projeto**
  - Arquivos: páginas/componentes de projetos, formulários e testes de componente
  - Cobre: CA-01–CA-05, CA-11
  - Verificação: `cd frontend && npm test -- --run src/modules/projetos` → cadastro manual deriva nome e respeita os times/modelos disponíveis ao perfil.
- [ ] **T26. Criar fluxo de importação inicial da planilha**
  - Arquivos: formulário/preview de importação inicial e testes de componente
  - Cobre: CA-12, CA-13, CA-14
  - Verificação: `cd frontend && npm test -- --run src/modules/projetos` → envia arquivo/time/modelos, mostra resumo e erros de linhas/duplicidades.
- [ ] **T27. Criar gestão de Test Cases e atribuições**
  - Arquivos: componentes/tabela/formulário de casos, testes de componente
  - Cobre: CA-06–CA-10, CA-13, CA-15–CA-18
  - Verificação: `cd frontend && npm test -- --run src/modules/projetos` → KP/gerente/admin veem ações de gestão; membro edita apenas os próprios campos autorizados.
- [ ] **T28. Criar visualização e importação Form Factor**
  - Arquivos: página/componentes Form Factor, hooks e testes de componente
  - Cobre: CA-19, CA-20
  - Verificação: `cd frontend && npm test -- --run src/modules/projetos` → importa relatório, apresenta resultados por modelo, semana e One UI, preserva histórico e mostra erros.
- [ ] **T29. Criar manutenção do catálogo de modelos de dispositivo**
  - Arquivos: `frontend/src/modules/projetos/components/ModelosDispositivo*`, hooks/API se necessário, testes de componente
  - Cobre: CA-05
  - Verificação: `cd frontend && npm test -- --run src/modules/projetos` → modelos podem ser criados/editados/inativados conforme permissão e somente ativos são associáveis.
- [ ] **T30. Registrar rotas, navegação, permissões e traduções**
  - Arquivos: `frontend/src/core/router.tsx`, `core/layout/Sidebar.tsx`, `core/i18n/resources.ts`, testes de navegação/i18n
  - Cobre: CA-01–CA-20
  - Verificação: `cd frontend && npm test -- --run src/core/router src/core/layout/Sidebar` e `npm run lint` → acesso/navegação respeitam permissões e os textos existem em en/pt/ko.
- [ ] **T31. Cobrir criação manual e gestão de Test Cases ponta a ponta**
  - Arquivos: `frontend/e2e/projetos.spec.ts`, fixtures de autenticação/time
  - Cobre: CA-01–CA-11, CA-15–CA-18
  - Verificação: `cd frontend && npm run e2e -- projetos.spec.ts` → criar projeto e casos, editar dados permitidos e transferir para backup funcionam no navegador.
- [ ] **T32. Cobrir importação inicial de planilha ponta a ponta**
  - Arquivos: `frontend/e2e/projetos-importacao.spec.ts`, planilha fixture
  - Cobre: CA-12–CA-14
  - Verificação: `cd frontend && npm run e2e -- projetos-importacao.spec.ts` → importar cria projeto/casos e arquivo inválido exibe erros sem persistência parcial.
- [ ] **T33. Cobrir relatório SDF e Form Factor ponta a ponta**
  - Arquivos: `frontend/e2e/form-factor.spec.ts`, relatório SDF fixture
  - Cobre: CA-19, CA-20
  - Verificação: `cd frontend && npm run e2e -- form-factor.spec.ts` → relatório autorizado gera resultados por modelo; acesso inválido não altera histórico.

## Backlog

- Definir limite de tamanho/linhas dos arquivos depois que as planilhas reais forem confirmadas.
- Definir idempotência ao reimportar o mesmo arquivo e política para SDF IDs repetidos; linhas com o mesmo TC ID são preservadas como execuções distintas.
- Confirmar layout oficial do export SDF e convenção de semana antes de finalizar o parser e os filtros.
- Reavaliar extração de validação compartilhada de textos se a duplicação entre entidades crescer nas fases de schemas/importadores.
