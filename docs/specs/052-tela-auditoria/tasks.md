# 052. Tela de auditoria: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> Os testes de integração precisam do Postgres (`SDF_TEST_DATABASE_URL`).

## Fase 1: Backend
- [ ] **T01. Consulta paginada e filtrada da auditoria**
  - Arquivos: `backend/src/domain/queries/auditoria.py`,
    `backend/src/domain/entities/interfaces/auditoria_repository.py`,
    `backend/src/infrastructure/repositories/auditoria_repository.py`,
    `backend/tests/integration/test_auditoria_repository.py` (novo)
  - Cobre: CA-02, CA-04, CA-05, CA-08
  - Detalhe:
    - `FiltrosAuditoria`, `LinhaAuditoria` e os enums `AcaoAuditoria` e `OrigemAuditoria`;
    - a consulta calcula o caso e a ação, faz join com caso e projeto, descarta as linhas só técnicas, filtra
      pela unidade e pelos filtros e ordena por `created_at DESC, id DESC`, com `COUNT(*)` para o total.
  - Testes:
    - filtro por usuários e período;
    - `origem=form_factor`;
    - ação `pr_removido`;
    - `tc_id` e `tela` por "contém";
    - 45 registros em páginas de 20;
    - outra unidade nunca aparece;
    - a linha que só mudou `updated_at` não aparece.
  - Verificação: `cd backend && uv run pytest tests/integration/test_auditoria_repository.py` → verde
- [ ] **T02. Caso de uso e mapeamento compartilhado com o histórico**
  - Arquivos: `backend/src/application/schemas/historico_caso_teste.py`,
    `backend/src/application/schemas/auditoria.py`,
    `backend/src/application/services/auditoria_service.py` e a interface,
    `backend/tests/unit/application/services/test_auditoria_service.py` (novo)
  - Cobre: CA-03, CA-07, CA-10
  - Detalhe:
    - extrai `alteracoes_do_registro` do histórico da 038 (os testes dela continuam verdes);
    - `AuditoriaServiceImpl.listar` exige admin, converte o período com `intervalo_dia` e `fuso_horario` e
      recusa um fim antes do início;
    - busca os nomes da página de uma vez e mapeia para `RegistroAuditoriaResponse`.
  - Testes:
    - um registro com dois campos vira duas alterações com nomes resolvidos;
    - gerente, KP e dev recebem `ForbiddenException`;
    - um período invertido recebe `InvalidInputException`, sem consultar o repositório.
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_auditoria_service.py tests/unit/application/services/test_caso_teste_service.py` → verde
- [ ] **T03. Rota `GET /api/auditoria`**
  - Arquivos: `backend/src/api/routers/auditoria.py`, `backend/src/api/main.py`,
    `backend/src/api/dependencies.py`, `backend/tests/functional/test_auditoria_api.py` (novo)
  - Cobre: CA-01, CA-07, CA-10
  - Detalhe: query params do plan (`usuario_id` repetível, ADR 0017), a resposta `PagedResult` e a rota no
    OpenAPI/Scalar.
  - Testes:
    - admin recebe 200 com os filtros repassados ao service;
    - não admin recebe 403 em formato ProblemDetails;
    - período invertido e `acao` inválida recebem 422;
    - sem token, 401.
  - Verificação: `cd backend && uv run pytest tests/functional/test_auditoria_api.py && uv run ruff check src tests` → verde

## Fase 2: Frontend
- [ ] **T04. Cliente, modo mock, hook e rótulos compartilhados**
  - Arquivos: `frontend/src/modules/auditoria/api/auditoria.api.ts`, `model/auditoria.ts`,
    `hooks/useAuditoria.ts` e o teste, `frontend/src/shared/lib/auditoria.ts` e o teste,
    `frontend/src/core/mock/database.ts`
  - Cobre: CA-01, CA-05 (modo mock)
  - Detalhe:
    - página, tamanho e filtros na `queryKey`;
    - `usuario_id` repetido na query;
    - os rótulos de campo e a tradução dos valores ficam em `shared/lib/auditoria.ts`;
    - o mock filtra e pagina registros de exemplo da unidade.
  - Testes:
    - o hook chama a API com os parâmetros esperados;
    - os rótulos traduzem Status e campos nos três idiomas;
    - o mock não devolve registros de outra unidade.
  - Verificação: `cd frontend && npx vitest run src/modules/auditoria src/shared/lib/auditoria` → verde
- [ ] **T05. Tela Auditoria com tabela, filtros, detalhe e exportação**
  - Arquivos: `frontend/src/modules/auditoria/pages/AuditoriaPage.tsx` e o teste,
    `components/DetalheAuditoriaDrawer.tsx` e o teste, `routes.tsx`, `index.ts`, `frontend/src/core/router.tsx`,
    `frontend/src/core/layout/Sidebar.tsx` e o teste, `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-01, CA-03, CA-06, CA-07, CA-09, CA-10
  - Detalhe:
    - `DataTable` com as colunas da spec e os filtros no cabeçalho (`DataTableFilter` e `DataTableMultiFilter`
      para usuários);
    - paginação de 20 e `estadoDaTabela`;
    - ação por linha "Ver detalhes", que abre o painel;
    - exportação com `useExportarTabela` e `buscarTodasAsPaginas`;
    - guarda de admin na página e item em `itensAdmin`;
    - textos revisados com `better-writing` e `better-accessibility`.
  - Testes:
    - renderiza as linhas e o resumo "+1";
    - o painel mostra todas as alterações;
    - o vazio com filtro tem "Limpar filtros";
    - o erro tem `role="alert"`;
    - não admin vê "sem permissão" e não vê o item na sidebar;
    - um período invertido não é aplicado;
    - exportar todos usa os filtros.
  - Verificação: `cd frontend && npx vitest run src/modules/auditoria src/core/layout && npm run lint` → verde
- [ ] **T06. E2E e fechamento**
  - Arquivos: `frontend/e2e/auditoria.spec.ts` (novo), `docs/specs/052-tela-auditoria/spec.md`,
    `docs/specs/README.md`
  - Cobre: CA-01, CA-02, CA-03 (navegador)
  - Detalhe: com a API simulada por `page.route`, o admin abre Administration › Auditoria, filtra por usuário
    e abre o detalhe. No fim, a spec fica `Concluída` e o roadmap é atualizado.
  - Verificação: `cd frontend && npx playwright test e2e/auditoria.spec.ts && npm test && npm run lint` e `cd backend && uv run pytest` → verde

## Backlog
- Nenhum item por enquanto.
