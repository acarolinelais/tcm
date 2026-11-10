# 071. Data planejada do projeto: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: backend

- [x] **T01. Data planejada na entidade**
  - Arquivos: `src/domain/entities/projeto.py`, `tests/unit/domain/test_projeto.py`
  - Cobre: CA-06, CA-07, CA-10, CA-12 (`definir_data_planejada`: recusa passado, `None` limpa, início = hoje)
  - Verificação: `uv run pytest tests/unit/domain/test_projeto.py -q` → verde
- [x] **T02. Colunas, migration e repositório**
  - Arquivos: `src/infrastructure/data/models/projeto_model.py`, `src/infrastructure/repositories/projeto_repository.py`,
    migration nova (`down_revision = "g067a1b2c3d4"`), `tests/integration/test_projeto_repository.py`
  - Cobre: CA-01, CA-06, CA-07
  - Verificação: `uv run pytest tests/integration/test_projeto_repository.py -q` → verde; `uv run alembic heads` → um head
- [x] **T03. PUT de projeto com a data planejada e o fuso**
  - Arquivos: `src/application/schemas/projeto.py`, `src/application/services/projeto_service.py`,
    `src/api/routers/projetos.py`, `tests/functional/test_projetos_api.py`
  - Cobre: CA-01, CA-09, CA-10, CA-11, CA-12
  - Verificação: `uv run pytest tests/functional/test_projetos_api.py -q` → verde
- [x] **T04. Burndown pela data planejada**
  - Arquivos: `src/application/services/overview_service.py`, `src/application/schemas/overview.py`,
    `tests/unit/application/services/test_overview_service.py`, `tests/functional/test_overview_api.py`
  - Cobre: CA-02, CA-03, CA-04, CA-05, CA-07, CA-08 e a RN-10
  - Verificação: `uv run pytest tests/unit/application/services/test_overview_service.py tests/functional/test_overview_api.py -q` → verde; `uv run ruff check .` → sem erros

## Fase 2: frontend

- [x] **T05. Data planejada no projeto (API, drawer e coluna)**
  - Arquivos: `modules/projetos/api/projetos.api.ts` e o model, `components/EditarProjetoDrawer.tsx`,
    `pages/ProjetosPage.tsx` e `ProjetosPage.test.tsx` (onde já ficam os testes do painel de edição), `core/mock/database.ts`,
    `core/i18n/resources.ts`
  - Cobre: CA-01, CA-07, CA-10 (validação na tela)
  - Verificação: `npx vitest run src/modules/projetos/pages/ProjetosPage.test.tsx && npm run lint && npx tsc -b` → verde
- [x] **T06. Burndown com data, meta e aviso**
  - Arquivos: `modules/overview/model/overview.ts`, `components/graficos/BurndownChart.tsx`,
    `components/OverviewKp.tsx` e `OverviewKp.test.tsx`, `api/overview.mock.ts`, `core/i18n/resources.ts`
  - Cobre: CA-03, CA-05, CA-08 (lacuna antes do início)
  - Verificação: `npx vitest run src/modules/overview && npm run lint && npx tsc -b` → verde

## Fase 3: e2e

- [x] **T07. KP define a data e vê a meta**
  - Arquivos: `frontend/e2e/planejamento-projeto.spec.ts`
  - Cobre: CA-01, CA-03
  - Verificação: `npx playwright test e2e/planejamento-projeto.spec.ts` → verde

## Backlog
- `meta_diaria` e `linha_planejada` são regras do planejamento do projeto (RN-05, RN-06, RN-10) e estão como
  funções do `overview_service.py`, enquanto `definir_data_planejada` está na entidade `Projeto`. Levar o cálculo
  para o domínio deixa a regra num lugar só; a linha antiga (meta fixa) também ficava no service (simplify do
  bloco 1).
- O fuso do navegador é montado em três lugares (`overview.api.ts`, `auditoria.api.ts` e o PUT de
  `projetos.api.ts`), e o PUT monta a query string à mão porque o `httpPut` não aceita `params` como o
  `httpGet`. Um helper `fusoDoNavegador()` e `params` no `httpPut` limpam os três (simplify do bloco 2).
- Burndown com planejamento longo: a consulta pede uma contagem por dia desde o início do planejamento, e cada dia
  cruza todos os casos com duas subconsultas na auditoria. Com o limite de dois anos o tamanho fica contido, mas um
  projeto grande com meses de planejamento pode pesar; medir antes de mexer (amostrar dias ou uma passada só pela
  auditoria) (code-review da spec).
- O "hoje" do PUT vem do `fuso_horario` que o cliente manda, com padrão UTC. Quem chama sem o parâmetro (Scalar,
  scripts) depois das 21h no Brasil tem a data de hoje recusada, e um fuso escolhido de propósito aceita ontem.
  Tornar o parâmetro obrigatório ou guardar o fuso da conta resolve (code-review da spec).
- A linha de planejado parte dos casos não Done no fim do dia do início, não no momento em que a data foi salva:
  casos fechados mais tarde naquele dia baixam a meta. É a leitura da RN-05 ("naquele dia"); se incomodar, gravar o
  número no momento em que a data é definida (code-review da spec).
- `DateInputField` (`form-field.tsx`) e o filtro de data de `data-table-filter.tsx` repetem o Popover com o
  `Calendario` e o rodapé de Limpar; um `CalendarioPopover` compartilhado tira a cópia (code-review da spec).
