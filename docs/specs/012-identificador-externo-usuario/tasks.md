# 012. Identificador externo de usuário: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: domínio e persistência

- [x] **T01. Adicionar `user_id` à entidade de usuário**
  - Arquivos: `backend/src/domain/entities/usuario.py`, testes unitários da entidade
  - Cobre: CA-01, CA-02, CA-03
  - Verificação: `cd backend && uv run pytest tests/unit/domain/test_usuario.py` → entidade aceita valor nulo, remove espaços externos e mantém o texto informado.
- [x] **T02. Persistir o identificador com unicidade por unidade**
  - Arquivos: `backend/src/domain/entities/interfaces/usuario_repository.py`, `backend/src/infrastructure/data/models/usuario_model.py`, repositório de usuários, migration Alembic, testes de integração
  - Cobre: CA-02, CA-04, CA-05
  - Verificação: `cd backend && uv run pytest tests/unit/infrastructure/test_usuario_repository.py tests/integration/test_usuario_user_id_persistence.py` → consulta compara sem diferenciar maiúsculas/minúsculas e restringe a unidade; a integração confirma valores nulos, duplicidade no tenant e reutilização em outra unidade.

## Fase 2: contratos e gestão de usuários

- [x] **T03. Expor o identificador nos schemas e validar unicidade no service**
  - Arquivos: `backend/src/application/schemas/usuario.py`, `backend/src/application/services/usuario_service.py`, testes unitários de schemas e service
  - Cobre: CA-01–CA-05, CA-12
  - Verificação: `cd backend && uv run pytest tests/unit/application/schemas/test_usuario_schema.py tests/unit/application/services/test_usuario_service.py` → criar, editar, limpar e consultar o campo; duplicidade rejeitada sem commit.
- [x] **T04. Atualizar os contratos funcionais da API de usuários**
  - Arquivos: `backend/tests/functional/test_usuarios_api.py`
  - Cobre: CA-01–CA-05, CA-12
  - Verificação: `cd backend && uv run pytest tests/functional/test_usuarios_api.py` → requests e respostas carregam `user_id`; duplicidade retorna 409 e valores inválidos retornam 422.
- [x] **T05. Incluir o campo no formulário de criação e edição**
  - Arquivos: `frontend/src/modules/usuarios/model/usuario.ts`, `components/UsuarioForm.tsx`, `components/UsuarioForm.test.tsx`, `core/i18n/resources.ts`
  - Cobre: CA-01–CA-04, CA-12
  - Verificação: `cd frontend && npm test -- --run src/modules/usuarios/components/UsuarioForm.test.tsx` → formulário envia, reabre e permite limpar o identificador; conflito é apresentado no formulário.
- [x] **T06. Atualizar o cliente HTTP de usuários**
  - Arquivos: `frontend/src/modules/usuarios/api/usuario.api.ts`, `api/usuario.api.test.ts`, tipos e fixtures de usuários relacionados
  - Cobre: CA-01–CA-05
  - Verificação: `cd frontend && npm test -- --run src/modules/usuarios/api/usuario.api.test.ts` → criação e edição enviam `user_id`, e respostas desserializam valor ou nulo.

## Fase 3: importação e modo mock

- [x] **T07. Resolver `user_id` na importação do backend**
  - Arquivos: `backend/src/application/services/importacao_projeto_service.py`, testes unitários do service de importação
  - Cobre: CA-06–CA-11
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_importacao_projeto_service.py` → nome, e-mail e `user_id` resolvem a pessoa; colisões entre campos são ambíguas; membro fora do time e atribuições inválidas são reportados sem persistência parcial.
- [x] **T08. Atualizar resolução de atribuições no modo mock**
  - Arquivos: `frontend/src/core/mock/database.ts`, testes de `database.ts` e utilitários de planilha
  - Cobre: CA-01–CA-03, CA-06–CA-11
  - Verificação: `cd frontend && npm test -- --run src/core/mock/database.test.ts src/modules/projetos` → dados persistidos antigos recebem `userId` nulo e criação, edição, unicidade e importação espelham as regras do backend.
- [x] **T09. Cobrir fluxos completos de usuário e importação**
  - Arquivos: `frontend/e2e/usuarios.spec.ts`, `frontend/e2e/projetos-importacao.spec.ts` e fixtures relacionadas
  - Cobre: CA-01, CA-04, CA-08–CA-11
  - Verificação: `cd frontend && npm run e2e -- usuarios.spec.ts projetos-importacao.spec.ts` → usuário cadastrado/alterado pelo identificador é selecionado na planilha; ambiguidade impede criação e mostra erro por linha.

## Backlog

- Nenhum.
