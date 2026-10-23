# 006. Administração da unidade: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo verificável, em torno de 30 min. Os testes são implementados junto ao
> código que cobrem; executar cada fase após completar suas dependências.

## Fase 1: Associação gerente-setor e seed

- [ ] **T01. Adicionar entidade e modelo de associação setor-gerente**
  - Arquivos: `domain/entities/setor_gerente.py`, interface e modelo ORM, registro em `models/__init__.py`
  - Cobre: RN-05, RN-07
  - Verificação: `cd backend && uv run ruff check src/domain src/infrastructure/data/models`
- [ ] **T02. Criar repository tenant-scoped para associações gerente-setor**
  - Arquivos: interface e implementação em `domain/entities/interfaces/` e `infrastructure/repositories/`
  - Cobre: RN-02, RN-05, RN-09
  - Verificação: `cd backend && uv run pytest tests/unit/infrastructure/test_setor_gerente_repository.py -q` → todos os métodos filtram por unidade e associação ativa
- [ ] **T03. Criar migration com tabela e perfil GERENTE seedado**
  - Arquivos: nova migration Alembic; seed por unidade de `GERENTE` com `times.consultar`, `times.criar`, `times.gerenciar`
  - Cobre: RN-03a, CA-05
  - Verificação: `cd backend && uv run pytest tests/integration/test_bootstrap.py -q` → upgrade/bootstrap cria perfil e permissões sem duplicar

## Fase 2: Administração de setores e associação de gerentes

- [ ] **T04. Implementar edição, ativação e inativação de setores**
  - Arquivos: entidade/schema, interfaces, `setor_service.py`, `setores.py`, repositório e testes
  - Cobre: RN-01, RN-02, RN-04, CA-03, CA-04, CA-14
  - Verificação: `cd backend && uv run pytest tests/functional/test_setores_api.py -q` → CRUD, tenant, permissões e bloqueio por times ativos
- [ ] **T05. Inativar vínculos ao inativar setor sem times ativos**
  - Arquivos: `setor_service.py`, repositories e testes de associação
  - Cobre: RN-04, CA-15, CA-16
  - Verificação: `cd backend && uv run pytest tests/functional/test_setores_api.py -q` → vínculos ativos passam a inativos na transação e não são reativados ao reativar setor
- [ ] **T06. Expor associação e desassociação de gerentes por setor**
  - Arquivos: schemas, `SetorService`, router, repository e testes funcionais
  - Cobre: RN-05, RN-07, CA-06, CA-17
  - Verificação: `cd backend && uv run pytest tests/functional/test_setor_gerentes_api.py -q` → somente gerente ativo da unidade pode ser vinculado
- [ ] **T07. Atualizar autenticação para carregar setores gerenciados atuais**
  - Arquivos: `UsuarioAutenticado`, `auth_service.py`, repository e testes unitários
  - Cobre: RN-06, RN-09, RN-10, RN-11, CA-10, CA-13, CA-18
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_auth_service.py -q` → token/contexto reflete vínculo atual após revogação

## Fase 3: Escopo e operações de times

- [ ] **T08. Aplicar escopo por setor nas operações de gerente**
  - Arquivos: `time_service.py`, repositórios e testes unitários
  - Cobre: RN-06, RN-07, RN-08, RN-10, CA-07 a CA-09, CA-13
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_time_service.py -q` → gerente atua somente em times de setores ativos associados
- [ ] **T09. Filtrar listagem de times para KP e gerente no backend**
  - Arquivos: `time_service.py`, `time_repository.py`, testes de unidade/funcionais
  - Cobre: RN-13, RN-14, CA-11, CA-17
  - Verificação: `cd backend && uv run pytest tests/functional/test_times_api.py -q` → gerente vê setores vinculados e KP só times em que tem papel KP
- [ ] **T10. Permitir remoção de membro sem apagar histórico**
  - Arquivos: `TimeMembro`/model, repository, service e endpoint `DELETE /membros/{usuario_id}`
  - Cobre: RN-08, RN-14, CA-09, CA-16
  - Verificação: `cd backend && uv run pytest tests/functional/test_times_api.py -q` → vínculo fica inativo e usuário perde acesso correspondente
- [ ] **T11. Aceitar perfil escolhido na criação de usuário**
  - Arquivos: schema `CriarUsuarioRequest`, `usuario_service.py`, router e testes
  - Cobre: RN-03, RN-03a, CA-05
  - Verificação: `cd backend && uv run pytest tests/functional/test_usuarios_api.py -q` → perfil válido da unidade persiste; `ADMIN_UNIDADE` não é atribuível

## Fase 4: Administração no frontend

- [ ] **T12. Criar navegação e guards da área administrativa**
  - Arquivos: `core/layout/Sidebar.tsx`, `core/router.tsx`, `AppLayout.tsx`
  - Cobre: RN-01, RN-12, RN-13a, CA-02, CA-20
  - Verificação: `cd frontend && npm test -- --run src/core/layout` → grupo Administração só para `ADMIN_UNIDADE`; Times aparece conforme escopo
- [ ] **T13. Incluir seleção de perfil na criação de usuário**
  - Arquivos: `modules/usuarios/components/UsuarioForm.tsx`, API, hooks e testes
  - Cobre: RN-03, RN-03a, CA-05
  - Verificação: `cd frontend && npm test -- --run src/modules/usuarios` → perfil Gerente selecionável e enviado no cadastro
- [ ] **T14. Criar página de setores com tabela compartilhada**
  - Arquivos: módulo novo `modules/setores/`, API client, hooks, modelos e rota
  - Cobre: RN-04, CA-01, CA-03, CA-04
  - Verificação: `cd frontend && npm test -- --run src/modules/setores` → lista paginada, filtros, criar/editar e inativar com confirmação
- [ ] **T15. Adicionar gestão de gerentes na página de setores**
  - Arquivos: componentes e API do módulo `setores/`
  - Cobre: RN-05, RN-09, CA-06, CA-13, CA-15, CA-16, CA-18
  - Verificação: `cd frontend && npm test -- --run src/modules/setores` → vincular/desvincular, mostrar vínculos inativos e atualizar tabela
- [ ] **T16. Criar página de Times compartilhada por admin, gerente e KP**
  - Arquivos: módulo novo `modules/times/`, API client, hooks, modelos e rota
  - Cobre: RN-06, RN-08, RN-13, RN-14, CA-07 a CA-12, CA-17, CA-19
  - Verificação: `cd frontend && npm test -- --run src/modules/times` → mesma página respeita o conjunto de times e permissões retornado pela API
- [ ] **T17. Implementar criação de time e gestão de membros/papéis**
  - Arquivos: componentes de `modules/times/`, integrações de setor e usuários, confirmações/toasts
  - Cobre: RN-08, RN-10, CA-07, CA-09, CA-10, CA-16
  - Verificação: `cd frontend && npm test -- --run src/modules/times` → criar time no setor permitido, adicionar/remover membro e alterar KP/DEV

## Fase 5: Fluxos integrados e regressão

- [ ] **T18. Cobrir fluxos administrativos e escopos ponta a ponta**
  - Arquivos: testes E2E de administração, usuários, setores e times
  - Cobre: CA-01 a CA-20
  - Verificação: `cd frontend && npm run e2e -- --grep "administração|gerente|times"` → admin, gerente e KP veem somente ações e recursos autorizados
- [ ] **T19. Executar validação focada dos módulos alterados**
  - Arquivos: nenhuma alteração funcional; corrigir regressões encontradas
  - Cobre: todos
  - Verificação: `cd backend && uv run pytest tests/functional/test_setores_api.py tests/functional/test_setor_gerentes_api.py tests/functional/test_times_api.py tests/functional/test_usuarios_api.py -q` e `cd frontend && npm test -- --run src/modules/setores src/modules/times src/modules/usuarios src/core/layout`
- [x] **T20. Aplicar o padrão visual universal às tabelas administrativas**
  - Arquivos: `shared/ui/table.tsx`, módulos de perfis, setores e times
  - Cobre: RN-17 e ADR 0022
  - Verificação: `cd frontend && npm run build` → as tabelas administrativas usam layout, vazio e paginação compartilhados

## Progresso da implementação

Os fluxos principais de T01–T17 estão implementados no código, incluindo a associação gerente-setor,
o perfil `GERENTE`, escopo de time por setor, seleção de perfil no cadastro e as páginas
administrativas de setores e times. Os testes unitários, funcionais e E2E de T01–T18 ainda precisam
ser escritos/executados; T19 também está pendente.
