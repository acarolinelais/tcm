# 004. Listagem filtrável de usuários: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

## Fase 1: Contrato e consulta

- [x] **T01. Expor filtros opcionais no endpoint de usuários**
  - Arquivos: `backend/src/api/routers/usuarios.py`, interfaces e serviço de usuários
  - Cobre: CA-01 a CA-07
- [x] **T02. Aplicar filtros na consulta paginada com isolamento de escopo**
  - Arquivos: `backend/src/infrastructure/repositories/usuario_repository.py`
  - Cobre: CA-01 a CA-05

## Fase 2: Tabela e controles de filtro

- [x] **T03. Padronizar os componentes compartilhados de tabela e paginação**
  - Arquivos: `frontend/src/shared/ui/table.tsx`
  - Cobre: CA-08, CA-09
- [x] **T04. Conectar filtros de cabeçalho aos query params do endpoint**
  - Arquivos: `frontend/src/shared/ui/table-column-filter.tsx`, módulo de usuários
  - Cobre: CA-01 a CA-06
- [ ] **T05. Validar filtros, escopo e estados da tabela**
  - Arquivos: testes unitários/funcionais de usuários e tabela
  - Cobre: CA-01 a CA-09
  - Verificação: `cd backend && uv run pytest` e `cd frontend && npm test` → suítes concluídas sem falhas
