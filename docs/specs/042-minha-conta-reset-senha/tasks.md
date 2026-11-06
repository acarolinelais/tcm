# 042. Troca de senha e redefinição pelo administrador: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementado num bloco só, a pedido do usuário (2026-11-06).

## Fase 1: troca da própria senha e redefinição pelo admin
- [x] **T01. Redefinir senha no `UsuarioServiceImpl`**
  - Arquivos: `backend/src/application/schemas/usuario.py`, `backend/src/application/services/interfaces/usuario_service.py`, `backend/src/application/services/usuario_service.py`, `backend/tests/unit/` (service de usuários)
  - Cobre: CA-04, CA-05, CA-08, CA-09, CA-10
  - Verificação: `cd backend && uv run pytest tests/unit -q -k redefinir` → verde
- [x] **T02. Rota `PATCH /api/usuarios/{id}/redefinir-senha`**
  - Arquivos: `backend/src/api/routers/usuarios.py`, `backend/tests/functional/` (rotas de usuários)
  - Cobre: CA-04, CA-08
  - Verificação: `cd backend && uv run pytest tests/functional -q -k redefinir` → verde
- [x] **T03. Troca da própria senha no `AuthServiceImpl` e rota `POST /api/auth/alterar-senha`**
  - Arquivos: `backend/src/application/schemas/auth.py`, `backend/src/application/services/interfaces/auth_service.py`, `backend/src/infrastructure/services/auth_service.py`, `backend/src/api/routers/auth.py`, `backend/tests/functional/test_auth_api.py`, `backend/tests/integration/` (auth service)
  - Cobre: CA-01, CA-02, CA-03, CA-06
  - Verificação: `cd backend && uv run pytest -q -k "alterar_senha or alterar_propria"` → verde
- [x] **T04. API do frontend e modo mock**
  - Arquivos: `frontend/src/core/auth/api.ts`, `frontend/src/modules/usuarios/api/usuario.api.ts`, `frontend/src/modules/usuarios/hooks/useUsuarios.ts`, `frontend/src/core/mock/database.ts`, `frontend/src/core/mock/database.test.ts`
  - Cobre: CA-01, CA-04, CA-06, CA-08, CA-10 (no mock)
  - Verificação: `cd frontend && npx vitest run src/core/mock` → verde
- [x] **T05. Painel Trocar senha no menu da conta**
  - Arquivos: `frontend/src/core/auth/TrocarSenhaDrawer.tsx`, `frontend/src/core/auth/TrocarSenhaDrawer.test.tsx`, `frontend/src/core/layout/Navbar.tsx`, `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-01, CA-06, CA-07
  - Verificação: `cd frontend && npx vitest run src/core/auth src/core/layout` → verde
- [x] **T06. Ação Redefinir senha na lista de usuários**
  - Arquivos: `frontend/src/modules/usuarios/components/UsuariosTable.tsx`, `frontend/src/modules/usuarios/components/UsuariosTable.test.tsx`, `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-04, CA-08, CA-10
  - Verificação: `cd frontend && npx vitest run src/modules/usuarios` → verde
- [x] **T07. Aviso de senha esquecida no login**
  - Arquivos: `frontend/src/core/auth/LoginPage.tsx`, `frontend/src/core/auth/LoginPage.test.tsx`, `frontend/src/core/i18n/resources.ts`
  - Cobre: RN-08
  - Verificação: `cd frontend && npx vitest run src/core/auth/LoginPage` → verde
- [x] **T08. e2e da troca e da redefinição**
  - Arquivos: `frontend/e2e/trocar-senha.spec.ts`, `frontend/e2e/usuarios.spec.ts`
  - Cobre: CA-01, CA-04, CA-07
  - Verificação: `cd frontend && npx playwright test e2e/trocar-senha.spec.ts e2e/usuarios.spec.ts` → verde

## Backlog
