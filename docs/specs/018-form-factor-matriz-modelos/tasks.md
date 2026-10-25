# 018. Form Factor em matriz por modelo: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: backend

- [x] **T01. Tipos de consulta e contrato do repositório**
  - Arquivos: `backend/src/domain/queries/form_factor_linha.py`,
    `backend/src/domain/entities/interfaces/resultado_form_factor_repository.py`
  - Cobre: base de CA-01 a CA-07
  - Verificação: `cd backend && uv run pytest tests/architecture` → verde. `FormFactorLinha` tem
    `caso_teste_id`, `tc_id`, `responsavel_id`, `sdf_id | None`, `data_reportada | None` e `resultados`;
    `FormFactorModelo` tem `id` e `nome`; a interface troca `one_ui` por `responsavel_id` e ganha
    `listar_modelos_do_projeto`.
- [x] **T02. Consulta da matriz no repositório**
  - Arquivos: `backend/src/infrastructure/repositories/resultado_form_factor_repository.py`,
    `backend/tests/integration/test_resultado_form_factor_repository.py`,
    `backend/tests/unit/infrastructure/test_form_factor_query_repository.py`
  - Cobre: CA-01, CA-02, CA-03, CA-06, CA-07
  - Verificação: `cd backend && uv run pytest tests/integration/test_resultado_form_factor_repository.py
    tests/unit/infrastructure/test_form_factor_query_repository.py` → verde. Os testes cobrem: casos sem
    resultado aparecem com `sdf_id`/`data_reportada` nulos; resultados de dois modelos na mesma linha;
    resultado mais recente vence (e empate decidido pela importação mais recente); semana restringe linhas
    e células; 25 casos paginam 20 + 5; modelo desvinculado não aparece; caso inativo e dados de outra
    unidade não aparecem; `listar_modelos_do_projeto` em ordem alfabética.
- [x] **T03. Schema e service com `responsavel_id` e `modelos`**
  - Arquivos: `backend/src/application/schemas/form_factor.py`,
    `backend/src/application/services/interfaces/form_factor_service.py`,
    `backend/src/application/services/form_factor_service.py`,
    `backend/tests/unit/application/services/test_form_factor_service.py`
  - Cobre: CA-05, CA-10
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_form_factor_service.py`
    → verde. O service repassa semana e `responsavel_id` ao repositório e devolve `modelos` + página; o
    perfil sem `form_factor.consultar` continua recebendo 403.
- [x] **T04. Router troca `one_ui` por `responsavel_id`**
  - Arquivos: `backend/src/api/routers/projetos.py`, `backend/tests/functional/test_form_factor_api.py`
  - Cobre: CA-05, CA-09, CA-11
  - Verificação: `cd backend && uv run pytest tests/functional/test_form_factor_api.py` → verde. Novo
    `test_consultar_form_factor_filtrando_por_responsavel` (200, só os casos do responsável) e
    `test_responsavel_id_invalido_retorna_422`; os testes de escopo/outra unidade (404) seguem verdes;
    `test_consultar_form_factor_com_filtros` atualizado para o formato novo. Suíte completa
    `cd backend && uv run pytest` verde no fim do bloco.

## Fase 2: frontend

- [x] **T05. Tipos, API e mock da matriz**
  - Arquivos: `frontend/src/modules/projetos/model/projeto.ts`,
    `frontend/src/modules/projetos/api/projetos.api.ts`,
    `frontend/src/modules/projetos/api/projetos.api.test.ts`, `frontend/src/core/mock/database.ts`,
    `frontend/src/core/mock/database.test.ts`, `frontend/src/modules/projetos/hooks/useProjetos.ts`,
    `frontend/src/modules/projetos/hooks/useProjetos.test.tsx`
  - Cobre: base de CA-01, CA-03, CA-05, CA-06
  - Verificação: `cd frontend && npm test -- projetos.api database useProjetos` → verde. A API envia
    `responsavel_id` e não envia `one_ui`; o mock monta uma linha por caso com o resultado mais recente por
    modelo e aplica semana e responsável; `useFormFactor` inclui `responsavelId` na query key.
- [x] **T06. Componente `FormFactorTabela`**
  - Arquivos: `frontend/src/modules/projetos/components/FormFactorTabela.tsx` (novo),
    `frontend/src/modules/projetos/components/FormFactorTabela.test.tsx` (novo),
    `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-01, CA-02, CA-04, CA-08
  - Verificação: `cd frontend && npm test -- FormFactorTabela` → verde. Colunas TC ID, SDF ID, Assignee,
    uma por modelo e Date; "—" nas células sem resultado; badges distintos para `Pass` e `Fail` e texto para
    outros valores; sem coluna One UI; estado vazio com "Limpar filtros" quando há filtro ativo. Aplicar as
    skills `table-rules`, `better-accessibility` e `better-writing`.
- [x] **T07. Aba Form Factor usa a matriz e o filtro Assignee**
  - Arquivos: `frontend/src/modules/projetos/ProjetoDetalhePage.tsx`,
    `frontend/src/modules/projetos/ProjetoDetalhePage.test.tsx`, `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-05, CA-08
  - Verificação: `cd frontend && npm test -- ProjetoDetalhePage` → verde. Escolher um membro no filtro
    Assignee filtra as linhas e volta para a página 1; limpar filtros restaura semana e Assignee; a chave
    `oneUi` sai do i18n se ficar sem uso. `cd frontend && npm test && npm run lint` verde no fim do bloco.

## Fase 3: e2e

- [x] **T08. E2E da matriz do Form Factor**
  - Arquivos: `frontend/e2e/form-factor.spec.ts`, `frontend/e2e/projetos-fixtures.ts`
  - Cobre: CA-01, CA-02, CA-03, CA-05
  - Verificação: `cd frontend && npm run e2e -- form-factor` → verde. Depois de importar um relatório, o
    caso mostra `Pass`/`Fail` nas colunas dos modelos numa única linha; um novo relatório troca o resultado
    exibido pelo mais recente; o filtro Assignee reduz as linhas; o cenário de relatório fora do escopo
    continua recusado.

## Backlog
- [x] ~~Consulta de modelos do projeto repetida no repositório do Form Factor~~: movida para
  `ProjetoModeloRepository.listar_modelos_do_projeto` (devolve `ModeloDoProjeto`) e injetada no
  `FormFactorServiceImpl` (achado da simplify do bloco 1, aprovado pelo usuário).
- [ ] **Adiado:** `useImportarRelatorioSdf` (`hooks/useProjetos.ts`) não tem consumidor e repete a importação
  feita inline na `ProjetoDetalhePage`. O usuário decidiu deixar como está: a importação do relatório SDF será
  refeita numa spec própria, e o hook entra nessa revisão (achado da simplify do bloco 2).
- [x] ~~Gerente que só participa do time não carrega a lista de membros~~: o escopo do gerente foi
  ampliado pelo ADR 0036 e virou a [spec 019](../019-escopo-gerente-times/spec.md) (achado do code-review).
