# 003. Perfis, permissões e ciclo de vida do JWT: Tasks

- **Spec:** [spec.md](spec.md)

## Fase 1: Autorização e visibilidade
- [x] **T01. Aplicar autorização administrativa e escopo hierárquico de usuários**
  - Arquivos: `backend/src/application/services/usuario_service.py`, `backend/src/infrastructure/repositories/usuario_repository.py`
  - Cobre: CA-03, CA-04, CA-14
- [x] **T02. Permitir criação de times por gerentes alocados**
  - Arquivos: `backend/src/application/services/time_service.py`
  - Cobre: CA-06, CA-07

## Fase 2: Perfis, permissões e perfil atual
- [x] **T03. Persistir catálogo de permissões e perfis por unidade**
  - Arquivos: `backend/src/infrastructure/data/models/`, migrations
  - Cobre: CA-15
- [x] **T04. Expor APIs para consultar e administrar perfis e permissões**
  - Arquivos: `backend/src/api/routers/`, `backend/src/application/`
  - Cobre: CA-01, CA-02, CA-15
- [x] **T05. Expor endpoint autenticado de perfil atual**
  - Arquivos: `backend/src/api/routers/auth.py`, `backend/src/application/schemas/auth.py`
  - Cobre: CA-01, CA-02, CA-12

## Fase 3: Sessões JWT
- [x] **T06. Adicionar claims, validação de configuração e sessões persistidas**
  - Arquivos: `backend/src/infrastructure/security/jwt.py`, modelos e migrations
  - Cobre: CA-09, CA-10, CA-11
- [x] **T07. Implementar refresh token rotativo e logout/revogação**
  - Arquivos: `backend/src/infrastructure/services/auth_service.py`, `backend/src/api/routers/auth.py`
  - Cobre: CA-10, CA-13
- [x] **T08. Invalidar sessões após mudanças em conta, perfil e vínculos**
  - Arquivos: services de usuários, perfis e times
  - Cobre: CA-10

## Fase 4: Cliente web
- [x] **T09. Consumir perfil e permissões atuais no frontend**
  - Arquivos: `frontend/src/core/`, módulos de perfil e permissões
  - Cobre: CA-01, CA-15

> Implementação concluída. Não rodei a suíte de testes nesta etapa.
