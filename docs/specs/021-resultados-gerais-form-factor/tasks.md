# 021. Resultados gerais de Form Factor: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: domínio e consultas globais
- [x] **T01. Definir DTOs de consulta global e contratos do repositório**
  - Arquivos: `backend/src/domain/queries/`, `domain/entities/interfaces/resultado_form_factor_repository.py` e testes unitários dos DTOs, se houver regra de mapeamento.
  - Cobre: CA-01..08.
  - Verificação: `cd backend && uv run pytest tests/unit/domain/queries/test_form_factor_global.py` → linhas de resumo/execução carregam projeto e modelos aplicáveis sem depender de HTTP ou SQLAlchemy.
- [x] **T02. Consultar Resumo global com escopo, modelos e filtros**
  - Arquivos: `backend/src/infrastructure/repositories/resultado_form_factor_repository.py` e `backend/tests/integration/test_resultado_form_factor_repository.py`.
  - Cobre: CA-01..05, CA-07..08, CA-11.
  - Verificação: `cd backend && SDF_TEST_DATABASE_URL=... uv run pytest tests/integration/test_resultado_form_factor_repository.py -k global_resumo` → uma linha por TC, última rodada correta, modelos unionizados, `modelos_ids` por projeto e isolamento antes de contar/paginar.
- [x] **T03. Consultar histórico global paginado por execução**
  - Arquivos: `backend/src/infrastructure/repositories/resultado_form_factor_repository.py` e `backend/tests/integration/test_resultado_form_factor_repository.py`.
  - Cobre: CA-06..08, CA-11.
  - Verificação: `cd backend && SDF_TEST_DATABASE_URL=... uv run pytest tests/integration/test_resultado_form_factor_repository.py -k global_resultados` → cada rodada aparece uma vez, filtros e ordenação são determinísticos e projetos fora do escopo não aparecem.

## Fase 2: autorização, serviço e API
- [x] **T04. Aplicar permissão e escopo de Gerente/KP no serviço global**
  - Arquivos: `backend/src/application/services/form_factor_service.py`, sua interface e `backend/tests/unit/application/services/test_form_factor_service.py`.
  - Cobre: CA-01, CA-09, CA-11.
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_form_factor_service.py -k global` → Gerente consulta setores gerenciados, KP consulta seus times e outros perfis/perfis sem permissão são recusados.
- [x] **T05. Mapear DTOs globais para respostas paginadas**
  - Arquivos: schemas Form Factor globais e `backend/tests/unit/application/schemas/test_form_factor_global_schema.py`.
  - Cobre: CA-01..08.
  - Verificação: `cd backend && uv run pytest tests/unit/application/schemas/test_form_factor_global_schema.py` → nomes de projeto, modelos da união, modelos aplicáveis e resultados são serializados corretamente.
- [x] **T06. Expor as rotas globais com paginação e filtros validados**
  - Arquivos: `backend/src/api/routers/form_factor_geral.py`, `backend/src/api/main.py`, dependências e `backend/tests/functional/test_form_factor_api.py`.
  - Cobre: CA-01..11.
  - Verificação: `cd backend && uv run pytest tests/functional/test_form_factor_api.py -k global` → filtros explícitos, paginação, 403/422 e nenhum dado fora da unidade/escopo.

## Fase 3: frontend e modo mock
- [x] **T07. Conectar contratos, APIs e hooks das consultas globais**
  - Arquivos: `frontend/src/modules/projetos/model/projeto.ts`, `api/projetos.api.ts`, `hooks/useProjetos.ts` e testes de API/hooks.
  - Cobre: CA-01..08.
  - Verificação: `cd frontend && npm test -- src/modules/projetos/api/projetos.api.test.ts src/modules/projetos/hooks/useProjetos.test.tsx` → parâmetros, query keys, filtros e tipos das duas respostas permanecem separados.
- [x] **T08. Exibir Resumo global com colunas de modelos e aplicabilidade**
  - Arquivos: novo componente de tabela global de Resumo e testes do componente.
  - Cobre: CA-02..05, CA-08, CA-10.
  - Verificação: `cd frontend && npm test -- src/modules/projetos/components/FormFactorGlobalTabela.test.tsx` → `N/A` para modelo não associado, `—` para modelo aplicável sem resultado, data/resultado recente e vazio filtrado.
- [x] **T09. Exibir histórico global com uma linha por execução**
  - Arquivos: novo componente de tabela global de Results e testes do componente.
  - Cobre: CA-06..08, CA-10.
  - Verificação: `cd frontend && npm test -- src/modules/projetos/components/FormFactorGlobalResultadosTabela.test.tsx` → projeto, execução, origem, data, modelos e filtros aparecem sem perder rodadas anteriores.
- [x] **T10. Montar a tela global e alternância Resumo/Ver todos**
  - Arquivos: `ResultadosGeraisPage.tsx`, rota e testes da página.
  - Cobre: CA-01, CA-03..08, CA-10.
  - Verificação: `cd frontend && npm test -- src/modules/projetos/ResultadosGeraisPage.test.tsx` → semana, projeto, filtros, paginação e seleção da visão atualizam a consulta e a página volta para 1 ao filtrar.
- [x] **T11. Adicionar entrada de navegação localizada e limitada a Gerente/KP**
  - Arquivos: `frontend/src/core/layout/Sidebar.tsx`, ícone, `frontend/src/core/router.tsx` ou rotas do módulo, traduções e testes da sidebar/rota.
  - Cobre: CA-01, CA-09.
  - Verificação: `cd frontend && npm test -- src/core/layout/Sidebar.test.tsx src/modules/projetos/routes.test.ts` → Gerente/KP autorizados veem a opção; outros perfis não a veem nem acessam a tela.
- [x] **T12. Implementar consultas globais equivalentes no mock persistido**
  - Arquivos: `frontend/src/core/mock/database.ts` e `frontend/src/core/mock/database.test.ts`.
  - Cobre: CA-01..11.
  - Verificação: `cd frontend && npm test -- src/core/mock/database.test.ts -t "Form Factor global"` → união de modelos, escopo, filtros, paginação e visões coincidem com o contrato real.

## Fase 4: fechamento
- [x] **T13. Revisar acessibilidade, segurança e cobertura da spec**
  - Arquivos: telas e componentes globais, traduções, testes afetados, `spec.md`, `plan.md`, `tasks.md` e `docs/specs/README.md`.
  - Cobre: CA-01..11.
  - Verificação: testes backend e frontend afetados, `cd frontend && npm run lint`, revisão de segurança de escopo e revisão de interface/acessibilidade; ao concluir, atualizar status da spec e roadmap.

## Backlog
- Nenhum item identificado nesta fase.
