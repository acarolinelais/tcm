# 069. Projetos encerrados fora das telas de trabalho: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: trava da conclusão no backend

- [x] **T01. Conta dos Test Cases pendentes de conclusão**
  - Arquivos: `backend/src/domain/entities/interfaces/caso_teste_repository.py`, `backend/src/infrastructure/repositories/caso_teste_repository.py`, `backend/tests/integration/test_caso_teste_repository.py`
  - Cobre: CA-09, CA-11
  - Verificação: `cd backend && uv run pytest tests/integration/test_caso_teste_repository.py` → verde
- [x] **T02. ConflictException com código e parâmetros no ProblemDetails**
  - Arquivos: `backend/src/domain/common/exceptions.py`, `backend/src/api/error_handling/handlers.py`, o teste de unidade dos handlers
  - Cobre: CA-10 (formato do erro)
  - Verificação: `cd backend && uv run pytest tests/unit -k "handler or problem"` → verde
- [x] **T03. Serviço recusa concluir com Test Cases pendentes**
  - Arquivos: `backend/src/application/services/projeto_service.py`, `backend/src/api/dependencies.py`, `backend/tests/unit/application/services/test_projeto_service.py`, `backend/tests/functional/test_projetos_api.py`
  - Cobre: CA-08, CA-10, CA-12
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_projeto_service.py tests/functional/test_projetos_api.py tests/architecture` → verde

## Fase 2: aviso na tela Projects e trava no modo mock

- [x] **T04. Trava da conclusão no modo mock**
  - Arquivos: `frontend/src/core/mock/database.ts`, `frontend/src/core/mock/database.test.ts`, `frontend/src/modules/projetos/model/projeto.ts` (`projetoEncerrado`)
  - Cobre: CA-10 (mock)
  - Verificação: `cd frontend && npx vitest run src/core/mock` → verde
- [x] **T05. Toast com a quantidade de Test Cases pendentes**
  - Arquivos: `frontend/src/modules/projetos/pages/ProjetosPage.tsx`, `frontend/src/modules/projetos/pages/ProjetosPage.test.tsx`, `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-07, CA-10
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/pages/ProjetosPage.test.tsx` → verde

## Fase 3: filtro de projetos encerrados nas telas

- [x] **T06. Componente do filtro "Show closed projects"**
  - Arquivos: `frontend/src/shared/ui/filtro-encerrados.tsx`, `frontend/src/core/i18n/resources.ts`
  - Cobre: RN-03 (usado nas tasks seguintes)
  - Verificação: `cd frontend && npx tsc -b --noEmit` → sem erros
- [x] **T07. Board e Kanban escondem os encerrados**
  - Arquivos: `frontend/src/modules/projetos/pages/BoardPage.tsx`, `BoardPage.test.tsx`, `BoardKanbanPage.tsx`, `BoardKanbanPage.test.tsx`, `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-01, CA-02, CA-03, CA-13
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/pages/BoardPage.test.tsx src/modules/projetos/pages/BoardKanbanPage.test.tsx` → verde
- [x] **T08. Timeline esconde os encerrados**
  - Arquivos: `frontend/src/modules/timeline/pages/TimelinePage.tsx`, `TimelinePage.test.tsx`
  - Cobre: CA-04, CA-06
  - Verificação: `cd frontend && npx vitest run src/modules/timeline/pages` → verde
- [x] **T09. General Results esconde os encerrados**
  - Arquivos: `frontend/src/modules/projetos/pages/ResultadosGeraisPage.tsx`, `ResultadosGeraisPage.test.tsx`
  - Cobre: CA-05
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/pages/ResultadosGeraisPage.test.tsx` → verde

## Backlog
- `useAtualizarStatusProjeto` (`frontend/src/modules/projetos/hooks/useProjetos.ts`) não é usado em lugar nenhum: a `ProjetosPage` tem a própria mutation. Remover, ou, se passar a ser usado, tratar o 409 de Test Cases pendentes. Achado da simplify da Fase 2.
- A Timeline e a General Results resolvem o `?projeto=` com o mesmo código copiado (lista visível, projeto aberto, espera pelas páginas). Um hook pequeno no módulo projetos juntaria as duas cópias; elas já tinham divergido uma vez nesta spec. Achado da simplify da Fase 3, mexe em código anterior à spec.
