# 008. Perfil de conta KP: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo verificável, em torno de 30 min. Implementar testes junto com o código que cobrem.

## Fase 1: Seed do perfil de sistema

- [x] **T01. Criar migration para o modelo de perfil KP reutilizável por unidade**
  - Arquivos: migration Alembic em `backend/src/infrastructure/data/migrations/versions/`
  - Cobre: RN-01, CA-03
  - Verificação: `cd backend && uv run pytest tests/integration/test_bootstrap.py -q` → KP existe uma vez por unidade e a migration pode ser reaplicada sem duplicar
- [x] **T02. Proteger perfil KP contra edição direta**
  - Arquivos: `backend/src/api/routers/perfis.py`, testes funcionais de perfis
  - Cobre: RN-01, CA-03
  - Verificação: `cd backend && uv run pytest tests/functional/test_perfis_api.py -q` → tentativa via API de alterar permissões é recusada

## Fase 2: Atribuição de perfil a usuários

- [x] **T04. Permitir admin e gerente atribuir KP na criação**
  - Arquivos: `usuario_service.py`, repositório e testes funcionais de usuários
  - Cobre: RN-09, CA-01, CA-02, CA-10
  - Verificação: `cd backend && uv run pytest tests/functional/test_usuarios_api.py tests/unit/application/services/test_usuario_service.py -q` → admin atribui perfil da unidade; gerente escolhe KP/padrão e continua responsável pela conta
- [x] **T05. Permitir admin e gerente trocar perfil na edição**
  - Arquivos: `backend/src/api/routers/perfis.py`, `backend/tests/functional/test_perfis_api.py`
  - Cobre: RN-08, RN-09, CA-01, CA-02, CA-10
  - Verificação: `cd backend && uv run pytest tests/functional/test_perfis_api.py -q` → admin atribui perfil permitido da unidade; gerente só altera conta responsável e só entre KP/padrão; alteração incrementa `auth_version`
- [x] **T06. Garantir que atribuição do perfil não cria nem remove participações em times**
  - Arquivos: testes de serviço/API de usuário e time
  - Cobre: RN-03, RN-04, CA-01
  - Verificação: `cd backend && uv run pytest tests/functional/test_perfis_api.py tests/functional/test_times_api.py -q` → mudar o perfil não escreve na associação; a API de membros não aceita papel por time
- [x] **T07. Preservar isolamento por unidade na atribuição**
  - Arquivos: `backend/src/api/routers/perfis.py`, `backend/tests/functional/test_perfis_api.py`
  - Cobre: RN-01, CA-07
  - Verificação: `cd backend && uv run pytest tests/functional/test_perfis_api.py -q` → perfil KP de outra unidade é recusado sem vazamento

## Fase 3: Fluxos frontend e localização

- [x] **T08. Exibir KP em criar/editar usuário para admin e gerente**
  - Arquivos: formulário, seleção de perfil e testes de `frontend/src/modules/usuarios/`
  - Cobre: RN-09, CA-01, CA-02, CA-10
  - Verificação: `cd frontend && npm test -- --run src/modules/usuarios` → opções de perfil de admin/gerente cobertas em `UsuarioForm.test.tsx`; responsabilidade do gerente coberta em `e2e/administracao-unidade.spec.ts`
- [x] **T09. Exibir permissões e proteger perfil KP na tela de perfis**
  - Arquivos: `frontend/src/modules/perfis/PerfisPage.tsx` e testes do módulo
  - Cobre: RN-01, CA-03
  - Verificação: `cd frontend && npm test -- --run src/modules/perfis` → perfil KP aparece somente para leitura
- [x] **T10. Traduzir nome de exibição do perfil KP**
  - Arquivos: catálogos i18n inglês, português e coreano e testes
  - Cobre: RN-10, CA-08
  - Verificação: `cd frontend && npm test -- --run src/modules/usuarios src/modules/perfis` → nome traduzido e identificador KP estável
- [x] **T11. Validar build e regressão dos fluxos de perfil**
  - Arquivos: nenhuma alteração esperada; corrigir regressões encontradas
  - Cobre: todos os critérios desta entrega
  - Verificação: `cd backend && uv run pytest tests/functional/test_usuarios_api.py tests/functional/test_perfis_api.py -q`; `cd frontend && npm test -- --run src/modules/usuarios src/modules/perfis && npm run build`

## Dependência futura: permissões de atividades e tarefas

As permissões concretas e a autorização por perfil KP mais participação ativa no time serão adicionadas
nas specs que criarem os módulos de atividades e tarefas. Esta spec também remove o campo e os
controles legados de papel KP/DEV por time. A aplicação ainda não cria unidades em runtime; o seed de
futuras unidades será tratado na spec que introduzir esse fluxo.


## Fase 5: Perfil KP como única fonte de capacidade

- [x] **T12. Migrar o papel KP legado para o perfil da conta e remover a coluna do vínculo**
  - Arquivos: migration Alembic e modelo/repositório de `TimeMembro`
  - Cobre: RN-03, RN-04, RN-08
  - Verificação: `cd backend && uv run pytest tests/integration/test_bootstrap.py tests/functional/test_times_api.py -q` → teste isolado valida migração de KP ativo, preserva papel dev/inativo e incrementa `auth_version`
- [x] **T13. Remover seleção, edição e contrato de papel KP/DEV por time**
  - Arquivos: formulário de membros, API de times, schemas e serviços
  - Cobre: RN-04, CA-09
  - Verificação: `cd frontend && npm test -- --run src/modules/times` e `cd backend && uv run pytest tests/functional/test_times_api.py -q` → frontend envia somente `usuario_id`, exibe o perfil da conta e API recusa o campo legado `papel`
- [x] **T14. Aplicar escopo KP por participação ativa em todos os times**
  - Arquivos: dependências de autenticação, listagem e detalhe de time, testes backend/frontend
  - Cobre: RN-04, RN-05, RN-08, CA-06, CA-07, CA-09
  - Verificação: `cd backend && uv run pytest tests/unit/api/test_dependencies.py tests/unit/application/services/test_time_service.py tests/functional/test_times_api.py -q` → identidade inclui vínculos ativos; KP lista apenas seus times e recebe 404 no detalhe fora do vínculo/unidade

## Critérios pendentes das specs de atividades e tarefas

CA-04 e CA-05 permanecem pendentes: dependem dos módulos e endpoints de atividades/tarefas, fora do
escopo desta spec. T12–T14 entregam a base de perfil, participação e autorização da área de times; não
validam as ações de KP nesses módulos futuros.
