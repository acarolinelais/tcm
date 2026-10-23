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
- [x] **T05. Mostrar estado vazio contextual na área da tabela**
  - Arquivos: `frontend/src/modules/usuarios/components/UsuariosTable.tsx`
  - Cobre: CA-10
- [x] **T06. Validar filtros, escopo e estados da tabela**
  - Arquivos: testes unitários/funcionais de usuários e tabela
  - Cobre: CA-01 a CA-09
  - Verificação: `cd backend && uv run pytest tests/unit/infrastructure/test_usuario_repository.py tests/unit/application/services/test_usuario_filtros_service.py tests/functional/test_usuarios_filtros_api.py -q` → 13 passaram; `cd frontend && npm test -- --run` → 18 passaram
- [x] **T07. Tornar obrigatório o perfil do usuário e substituir o booleano administrativo**
  - Arquivos: migração, autorização, autenticação e gestão de usuários/perfis
  - Cobre: ADR 0018; perfis `ADMIN_UNIDADE` e `USUARIO_PADRAO`
- [x] **T08. Tornar o layout compartilhado obrigatório para todas as tabelas do sistema**
  - Arquivos: `shared/ui/table.tsx`, tabelas de usuários, perfis, setores e times; ADR 0022
  - Cobre: CA-08 a CA-10
  - Verificação: `cd frontend && npm run build` → todas as páginas compilam com o layout compartilhado

> A suíte completa do backend foi executada, mas ainda falha em testes anteriores fora do escopo
> dos critérios desta spec (arquitetura/auth, setor, times, usuário e JWT). Os testes específicos de
> filtros, isolamento, validação e interface passaram.
