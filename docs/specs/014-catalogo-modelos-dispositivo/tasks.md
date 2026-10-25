# 014. Catálogo de modelos de dispositivo: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: backend

- [x] **T01. Descrição no domínio**
  - Arquivos: `backend/src/domain/entities/modelo_dispositivo.py`,
    `backend/tests/unit/domain/test_modelo_dispositivo.py`
  - Cobre: CA-01, CA-02, CA-08
  - Verificação: `cd backend && uv run pytest tests/unit/domain/test_modelo_dispositivo.py` → verde, com
    os casos de descrição válida, vazia (fica nula) e acima de 100 caracteres.
- [x] **T02. Coluna, repositório e migration (descrição, `updated_at`, permissão do KP)**
  - Arquivos: `backend/src/infrastructure/data/models/modelo_dispositivo_model.py`,
    `backend/src/infrastructure/repositories/modelo_dispositivo_repository.py`, nova migration em
    `backend/src/infrastructure/data/migrations/versions/` (`down_revision = "f1a2b3c4d5e6"`),
    `backend/tests/integration/test_modelo_dispositivo_repository.py`
  - Cobre: CA-03, CA-10, CA-14
  - Verificação: `cd backend && uv run pytest tests/integration/test_modelo_dispositivo_repository.py` →
    verde. Os testes cobrem que a descrição persiste, que `updated_at` é preenchido na criação e muda na
    edição sem alterar `created_at`, que um modelo de outra unidade não é encontrado, e que a migration
    preserva os modelos existentes sem descrição e concede a permissão só ao KP. Também
    `uv run alembic upgrade head` e `uv run alembic downgrade -1` → sem erro.
- [x] **T03. Permissão nova no catálogo de permissões**
  - Arquivos: `backend/src/application/catalogos/permissoes.py` e os testes de perfis/catálogo que
    contam os módulos
  - Cobre: CA-09 (base)
  - Verificação: `cd backend && uv run pytest -k "permiss or perfis"` → verde, com
    `modelos_dispositivo.gerenciar` listada no módulo "Modelos de dispositivo".
- [x] **T04. Schemas e service: descrição, datas, permissão nova e `listar_opcoes`**
  - Arquivos: `backend/src/application/schemas/modelo_dispositivo.py`,
    `backend/src/application/services/interfaces/modelo_dispositivo_service.py`,
    `backend/src/application/services/modelo_dispositivo_service.py`,
    `backend/tests/unit/application/services/test_modelo_dispositivo_service.py`
  - Cobre: CA-01, CA-02, CA-06, CA-07, CA-08, CA-09, CA-11
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_modelo_dispositivo_service.py`
    → verde. Os testes cobrem: KP e admin gerenciam; gerente e dev recebem 403 no catálogo; gerente lista
    as opções ativas; nome duplicado dá 409; `descricao: null` limpa e a chave ausente preserva.
- [x] **T05. Router: rota `/opcoes` e contrato novo**
  - Arquivos: `backend/src/api/routers/modelos_dispositivo.py`,
    `backend/tests/functional/test_modelos_dispositivo_api.py`
  - Cobre: CA-01 a CA-11
  - Verificação: `cd backend && uv run pytest tests/functional/test_modelos_dispositivo_api.py` → verde.
    Os testes cobrem: 201 com datas e descrição; 409 com espaços; 422 na descrição longa; 403 para
    gerente e dev; 404 para outra unidade; modelo inativo fora de `/opcoes`, mas ainda no projeto;
    reativar volta para `/opcoes`. No fim do bloco, `uv run pytest` e `uv run lint-imports` → verde.

## Fase 2: frontend

- [x] **T06. Módulo `modelos-dispositivo`: API, mock, schema e hooks**
  - Arquivos: `frontend/src/modules/modelos-dispositivo/api/modelos-dispositivo.api.ts`,
    `hooks/useModelosDispositivo.ts`, `schemas/modelo-dispositivo.schema.ts`,
    `frontend/src/core/mock/database.ts` e `database.test.ts`
  - Cobre: CA-01, CA-02, CA-08
  - Verificação: `cd frontend && npm test -- modelos-dispositivo database` → verde, com o schema
    recusando nome vazio, nome acima de 100 e descrição acima de 100.
- [x] **T07. Página do catálogo no padrão de tabela**
  - Arquivos: `frontend/src/modules/modelos-dispositivo/ModelosDispositivoPage.tsx`, `routes.tsx`,
    `ModelosDispositivoPage.test.tsx`, registro das rotas em `frontend/src/app`,
    `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-01, CA-03, CA-04, CA-05, CA-12 (sem permissão), CA-13
  - Verificação: `cd frontend && npm test -- ModelosDispositivoPage` → verde. Os testes cobrem: 20 por
    página; filtros de nome e status; vazio com filtro; drawer de criação e edição com descrição;
    ativar e inativar; mensagem de sem permissão. Usar as skills `table-rules`, `better-accessibility`
    e `better-writing`.
- [x] **T08. Item Device models no sidebar e ajuste do "voltar"**
  - Arquivos: `frontend/src/core/layout/Sidebar.tsx`, `sidebar-icons.tsx`, `Sidebar.test.tsx`,
    `voltar.ts`, `voltar.test.ts`
  - Cobre: CA-12
  - Verificação: `cd frontend && npm test -- Sidebar voltar` → verde, com o item visível para KP e
    admin e oculto para gerente e dev.
- [x] **T09. Projetos usa `/opcoes` e perde a tela antiga**
  - Arquivos: `frontend/src/modules/projetos/ProjetosPage.tsx` (e os fluxos de importação que usam o
    seletor), `ProjetosPage.test.tsx`, `routes.tsx`, `routes.test.ts`, `api/projetos.api.ts`,
    `hooks/useProjetos.ts`; remover `ModelosDispositivoPage.tsx` e o teste dele de `projetos`
  - Cobre: CA-11
  - Verificação: `cd frontend && npm test && npm run lint` → verde. O seletor do gerente mostra só os
    modelos ativos, e a tela de Projetos não tem mais o botão "Modelos".

## Fase 3: e2e

- [x] **T10. E2E do catálogo**
  - Arquivos: `frontend/e2e/modelos-dispositivo.spec.ts`
  - Cobre: CA-01, CA-04, CA-12
  - Verificação: `cd frontend && npm run e2e -- modelos-dispositivo` → verde. O teste cobre: KP cria,
    edita e inativa um modelo, e o modelo inativo some do seletor de projeto; gerente não vê o item
    Device models.

## Backlog
- **Datas de auditoria com uma fonte só (simplify, Fase 1).** Hoje o service grava `created_at`/`updated_at`
  de `ModeloDispositivo`, assim como o `usuario_service`, enquanto as outras entidades dependem do
  `func.now()` do banco. Isso contraria o docstring de `EntityBase`, que diz que a infraestrutura
  preenche as datas. O caminho mais geral é o `RepositoryBaseImpl.adicionar`/`atualizar` fazer
  `flush` + `refresh` e devolver as datas para a entidade. Também há uma divergência de fuso: o
  `usuario_service` usa `datetime.now()` local e este service usa UTC. Fica fora do bloco porque mexe
  na base compartilhada e em outras entidades.
- **Checagem de permissão duplicada (simplify, Fase 1).** `_exigir_permissao` existe em
  `ModeloDispositivoServiceImpl` (variádica, "alguma das"), em `ProjetoServiceImpl` e em
  `api/dependencies.exigir_permissao`. O ideal é ter um helper único, por exemplo em
  `UsuarioAutenticado`. Fica fora do bloco porque toca outros services.
- **Teste que suja o banco de teste.** `tests/integration/test_usuario_user_id_persistence.py` grava
  unidades sem perfil e não as apaga. Na segunda execução da suíte no mesmo banco,
  `test_migration_seed_perfil_kp_por_unidade_e_idempotente` falha com "Unidade ... não possui perfil
  USUARIO_PADRAO". O problema já existia antes desta spec.
- **Badge Ativo/Inativo e opções de status compartilhadas (simplify, Fase 2).** O badge de status
  (`rounded-md bg-emerald-50 …`) e as opções `[todos, ativo, inativo]` do filtro estão copiados em
  `SetoresPage`, `TimesPage`, `UsuariosTable` e agora em `ModelosDispositivoPage`. Um `ActiveBadge` e as
  opções de status em `shared/ui` evitariam que esses estilos se distanciem. Fica fora do bloco porque
  mexe em outros módulos.
- **Chave de cache dos modelos repetida entre módulos (simplify, Fase 2).** Salvar no catálogo atualiza
  o seletor de Projetos só porque os dois módulos usam o mesmo prefixo literal `["modelos-dispositivo"]`.
  A regra de módulos impede importar a constante. Se um dos lados mudar a chave, a atualização deixa de
  acontecer sem nenhum erro. O conserto é mover o prefixo para `core/`. Fica fora do bloco.
- **E2E `projetos-dev.spec.ts` dependente de ambiente.** Esse teste exige uma API real em `:8000` com a
  senha de admin em `SDF_E2E_ADMIN_PASSWORD`, e cria usuários nesse banco. Localmente ele falha com 401
  se a API estiver usando o banco de desenvolvimento com outra senha. Vale documentar ou apontar para
  um banco próprio de e2e.
- **Datas sem fuso na API (code-review).** O backend grava e devolve as datas sem fuso, em UTC
  (`2026-10-26T02:00:00`, sem `Z`), e o frontend as lê como hora local. Um modelo criado às 22h em
  Manaus aparece com o dia seguinte. O mesmo vale para as outras entidades que usam o `now()` do banco,
  então o conserto (serializar com `Z` ou usar `timestamptz`) é transversal e merece uma spec ou um ADR
  próprio. Está relacionado ao item "Datas de auditoria com uma fonte só".
- **Seletor de modelos limitado a 100 (code-review).** `listarOpcoes()` busca só a primeira página,
  com 100 itens, que é o máximo da API. Numa unidade com mais de 100 modelos ativos, os excedentes não
  aparecem no seletor de projeto. Já era assim antes desta spec e é um risco aceito no plan. O conserto
  é usar a busca (`busca`) que `/opcoes` já aceita, ou paginar o seletor.
- **Regra "pode gerenciar modelos" escrita duas vezes (code-review).** A checagem `ADMIN_UNIDADE ||
  modelos_dispositivo.gerenciar` aparece no `Sidebar` (`core/`) e na `ModelosDispositivoPage`. O `core/`
  não pode importar de `modules/`, então o lugar certo seria um helper de permissão em `core/auth`,
  que também serviria aos outros itens do sidebar. Fica fora do bloco.
