# 020. Histórico e lançamento de resultados Form Factor: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: backend — persistência e histórico
- [x] **T01. Definir e migrar origem da execução**
  - Arquivos: entidades/modelos de execução, migration e testes de migration.
  - Cobre: RN-06, CA-03, CA-10.
  - Verificação: `cd backend && uv run pytest tests/unit/domain/test_execucao_sdf.py` → origem manual/SDF e compatibilidade dos registros existentes.
- [x] **T02. Consultar Results paginado por execução**
  - Arquivos: schemas, query, repository, service, rota e testes.
  - Cobre: RN-03, RN-07, CA-03, CA-06, CA-11.
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_form_factor_service.py tests/functional/test_form_factor_api.py tests/integration/test_resultado_form_factor_repository.py` → histórico, filtros e paginação corretos (integrações requerem `SDF_TEST_DATABASE_URL`).
- [x] **T03. Registrar rodada manual multi-modelo de forma atômica**
  - Arquivos: domínio, repositórios, service, schemas, rota, dependências, permissões e testes funcionais.
  - Cobre: RN-04, RN-05, RN-10, CA-04, CA-09, CA-10, CA-11.
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_form_factor_service.py tests/functional/test_form_factor_api.py` → grava tudo ou nada; aceita apenas PASS/FAIL.
- [x] **T04. Preservar resumo com a última execução por TC/modelo**
  - Arquivos: repository de resultados e testes de consulta.
  - Cobre: RN-01, RN-02, CA-01, CA-02, CA-05.
  - Verificação: `cd backend && SDF_TEST_DATABASE_URL=... uv run pytest tests/integration/test_resultado_form_factor_repository.py` → cada célula retorna a última rodada sem afetar Results.

## Fase 2: frontend — tabelas e registro manual
- [x] **T05. Conectar tipos, API e hooks às consultas Results e criação manual**
  - Arquivos: `model/projeto.ts`, `api/projetos.api.ts`, hooks e testes.
  - Cobre: CA-03, CA-04, CA-06.
  - Verificação: `cd frontend && npm test -- src/modules/projetos/api/projetos.api.test.ts src/modules/projetos/hooks/useProjetos.test.tsx` → parâmetros e invalidações corretos.
- [x] **T06. Criar formulário de rodada manual por TC com vários modelos**
  - Arquivos: componente do formulário, `ProjetoDetalhePage.tsx`, traduções e testes.
  - Cobre: CA-04, CA-09, CA-10.
  - Verificação: `cd frontend && npm test -- src/modules/projetos` → permite PASS/FAIL por modelo e trata erro sem sucesso falso.
- [x] **T07. Exibir Resumo e Results no detalhe do projeto**
  - Arquivos: tabelas de Form Factor, navegação das visões, estados e testes.
  - Cobre: CA-01..06.
  - Verificação: `cd frontend && npm test -- src/modules/projetos/components/FormFactorTabela.test.tsx src/modules/projetos/ProjetoDetalhePage.test.tsx` → resumo e rodadas históricas coerentes.
- [x] **T08. Corrigir filtros longos e rolagem das tabelas Form Factor**
  - Arquivos: `table-column-filter.tsx`, tabelas Form Factor e testes visuais/funcionais de componente.
  - Cobre: CA-06..08.
  - Verificação: `cd frontend && npm test -- src/shared/ui/table-column-filter.test.tsx src/modules/projetos/components/FormFactorTabela.test.tsx` → menu limitado/buscável e apenas um contêiner de rolagem.
- [x] **T09. Alinhar modo mock ao histórico e ao registro manual**
  - Arquivos: `frontend/src/core/mock/database.ts` e `database.test.ts`.
  - Cobre: CA-01..06, CA-09..11.
  - Verificação: `cd frontend && npm test -- src/core/mock/database.test.ts` → mock preserva rodadas e deriva o resumo da mais recente.

## Fase 3: fechamento
- [x] **T10. Revisar traduções, contratos e cobertura da spec**
  - Arquivos: recursos PT/EN/KO, documentação e testes afetados.
  - Cobre: todos os critérios de aceite.
  - Verificação: `cd frontend && npm test && npm run lint`; `cd backend && uv run pytest` → verificações concluídas sem regressões.
