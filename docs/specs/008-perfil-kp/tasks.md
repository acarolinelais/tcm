# 008. Perfil de conta KP: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo verificável, em torno de 30 min. Implementar testes junto com o código que cobrem.

## Fase 1: Seed do perfil de sistema

- [ ] **T01. Criar migration para o modelo de perfil KP reutilizável por unidade**
  - Arquivos: migration Alembic em `backend/src/infrastructure/data/migrations/versions/`
  - Cobre: RN-01, CA-03
  - Verificação: `cd backend && uv run pytest tests/integration/test_bootstrap.py -q` → KP existe uma vez por unidade e a migration pode ser reaplicada sem duplicar
- [ ] **T02. Proteger perfil KP contra edição direta**
  - Arquivos: `backend/src/api/routers/perfis.py`, testes funcionais de perfis
  - Cobre: RN-01, CA-03
  - Verificação: `cd backend && uv run pytest tests/functional/test_perfis_api.py -q` → tentativa via API de alterar permissões é recusada

## Fase 2: Atribuição de perfil a usuários

- [ ] **T04. Permitir admin e gerente atribuir KP na criação**
  - Arquivos: `usuario_service.py`, repositório e testes funcionais de usuários
  - Cobre: RN-09, CA-01, CA-02, CA-10
  - Verificação: `cd backend && uv run pytest tests/functional/test_usuarios_api.py -q` → admin atribui qualquer perfil permitido; gerente escolhe KP/padrão e continua responsável pela conta
- [ ] **T05. Permitir admin e gerente trocar perfil na edição**
  - Arquivos: `backend/src/api/routers/perfis.py`, testes funcionais da rota `PATCH /api/perfis/usuarios/{usuario_id}`
  - Cobre: RN-08, RN-09, CA-01, CA-02, CA-10
  - Verificação: `cd backend && uv run pytest tests/functional/test_usuarios_api.py -q` → admin atribui na unidade; gerente só em conta responsável e só entre KP/padrão; alteração incrementa `auth_version`
- [ ] **T06. Garantir que atribuição do perfil não cria nem remove participações em times**
  - Arquivos: testes de serviço/API de usuário e time
  - Cobre: RN-03, RN-04, CA-01, CA-04, CA-06
  - Verificação: `cd backend && uv run pytest tests/functional/test_usuarios_api.py tests/functional/test_times_api.py -q` → mudar o perfil não modifica participações; o perfil KP habilita os times com participação ativa
- [ ] **T07. Preservar isolamento por unidade na atribuição**
  - Arquivos: repositório e testes funcionais de usuários/perfis
  - Cobre: RN-01, CA-07
  - Verificação: `cd backend && uv run pytest tests/functional/test_usuarios_api.py -q` → perfil KP de outra unidade é recusado sem vazamento

## Fase 3: Fluxos frontend e localização

- [ ] **T08. Exibir KP em criar/editar usuário para admin e gerente**
  - Arquivos: formulário, seleção de perfil e testes de `frontend/src/modules/usuarios/`
  - Cobre: RN-09, CA-01, CA-02, CA-10
  - Verificação: `cd frontend && npm test -- --run src/modules/usuarios` → gerente vê apenas KP/padrão e só edita contas sob sua responsabilidade; admin mantém a seleção completa
- [ ] **T09. Exibir permissões e proteger perfil KP na tela de perfis**
  - Arquivos: `frontend/src/modules/perfis/PerfisPage.tsx` e testes do módulo
  - Cobre: RN-01, CA-03
  - Verificação: `cd frontend && npm test -- --run src/modules/perfis` → perfil KP aparece somente para leitura
- [ ] **T10. Traduzir nome de exibição do perfil KP**
  - Arquivos: catálogos i18n inglês, português e coreano e testes
  - Cobre: RN-10, CA-08
  - Verificação: `cd frontend && npm test -- --run src/modules/usuarios src/modules/perfis` → nome traduzido e identificador KP estável
- [ ] **T11. Validar build e regressão dos fluxos de perfil**
  - Arquivos: nenhuma alteração esperada; corrigir regressões encontradas
  - Cobre: todos os critérios desta entrega
  - Verificação: `cd backend && uv run pytest tests/functional/test_usuarios_api.py tests/functional/test_perfis_api.py -q`; `cd frontend && npm test -- --run src/modules/usuarios src/modules/perfis && npm run build`

## Dependência futura: permissões de atividades e tarefas

As permissões concretas e a autorização por perfil KP mais participação ativa no time serão adicionadas
nas specs que criarem os módulos de atividades e tarefas. Esta spec também remove o campo e os
controles legados de papel KP/DEV por time. A aplicação ainda não cria unidades em runtime; o seed de
futuras unidades será tratado na spec que introduzir esse fluxo.


## Fase 5: Perfil KP como única fonte de capacidade

- [ ] **T12. Migrar o papel KP legado para o perfil da conta e remover a coluna do vínculo**
  - Arquivos: migration Alembic e modelo/repositório de `TimeMembro`
  - Cobre: RN-03, RN-04, RN-08, CA-04, CA-06
  - Verificação: `cd backend && uv run pytest tests/integration/test_bootstrap.py tests/functional/test_times_api.py -q` → membros KP legados com perfil padrão recebem KP e sessões anteriores são invalidadas
- [ ] **T13. Remover seleção, edição e contrato de papel KP/DEV por time**
  - Arquivos: formulário de membros, API de times, schemas e serviços
  - Cobre: RN-04, CA-04, CA-09
  - Verificação: `cd frontend && npm test -- --run src/modules/times` → adicionar membro não pede papel; a linha exibe o perfil da conta
- [ ] **T14. Aplicar escopo KP por participação ativa em todos os times**
  - Arquivos: dependências de autenticação, listagem e detalhe de time, testes backend/frontend
  - Cobre: RN-04, RN-05, RN-08, CA-05, CA-06, CA-07, CA-09
  - Verificação: testes confirmam que KP lista times em que participa e não acessa times sem participação ou de outra unidade
