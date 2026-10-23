# 010. Modo mock do frontend: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

## Fase 1: Persistência e dados de demonstração
- [x] **T01. Criar seed e armazenamento local para as entidades administrativas**
  - Arquivos: `frontend/src/core/mock/database.ts`
  - Cobre: CA-01, CA-02, CA-04
  - Verificação: `cd frontend && npm run build` → compilação concluída

## Fase 2: Ligar as telas ao mock
- [x] **T02. Alternar autenticação e APIs entre mock e backend**
  - Arquivos: `frontend/src/core/auth/`, `frontend/src/modules/*/api/`
  - Cobre: CA-01, CA-02, CA-03
  - Verificação: `cd frontend && npm run build` → compilação concluída

## Fase 3: Documentar configuração e decisão
- [x] **T03. Documentar modo mock e registrar ADR**
  - Arquivos: `.env.example`, `README.md`, `frontend/README.md`, `docs/adr/0030-*`
  - Cobre: CA-01, CA-03, CA-04
  - Verificação: `git diff --check` → sem erros
