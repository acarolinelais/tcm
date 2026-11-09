# 065. Datas de finalização do Test Case: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: backend

- [x] **T01. Finalização do código no domínio**
  - Arquivos: `src/domain/entities/caso_teste.py`, `tests/unit/domain/test_caso_teste_datas_finalizacao.py`
  - Cobre: CA-01, CA-02, CA-03
  - Verificação: `uv run pytest tests/unit/domain -q` → verde
- [x] **T02. Colunas, mapeamento, resposta e migration com retroativo**
  - Arquivos: `caso_teste_model.py`, `caso_teste_repository.py`, `schemas/caso_teste.py`, migration
    `g065a1b2c3d4_datas_finalizacao_caso_teste.py`, `tests/integration/test_migration_datas_finalizacao.py`,
    `tests/functional/test_casos_teste_api.py`
  - Cobre: CA-10, CA-11, CA-14
  - Verificação: `uv run alembic heads` → um head; `uv run pytest tests/integration/test_migration_datas_finalizacao.py tests/functional/test_casos_teste_api.py -q` → verde
- [x] **T03. Finalização de tudo no repositório e nos três caminhos de resultado**
  - Arquivos: interface e `caso_teste_repository.py`, `importacao_sdf_service.py`, `form_factor_service.py`,
    `tests/integration/test_caso_teste_todos_aprovados.py`, testes unitários dos dois services
  - Cobre: CA-04 a CA-09, CA-12, CA-13
  - Verificação: `uv run pytest -q` → verde; `uv run ruff check .` → sem erros

## Fase 2: frontend

- [x] **T04. Colunas Code done e All passed na tabela de Test Cases**
  - Arquivos: `model/projeto.ts`, `ProjetoDetalhePage.tsx`, `ProjetoDetalhePage.test.tsx`, `core/i18n/resources.ts`,
    `core/mock/database.ts`
  - Cobre: RN-10, RN-11 e a exibição de CA-01 e CA-04
  - Verificação: `npm test && npm run lint && npx tsc -b` → verde

- [x] **T05. End date passa a mostrar a finalização de tudo, sem a coluna All passed**
  - Arquivos: `ProjetoDetalhePage.tsx`, `ProjetoDetalhePage.test.tsx`, `core/i18n/resources.ts`; o seletor de
    semana segue a End date: `caso_teste_repository.py` (filtro `data_final_*`), `core/mock/database.ts` e os testes
    `test_consultas_associadas_dev.py` e `database.test.ts`
  - Cobre: RN-10 (revisada em 2026-11-06)
  - Verificação: `npx vitest run src/modules/projetos/pages/ProjetoDetalhePage.test.tsx && npm run lint && npx tsc -b` → verde

## Backlog
- Levar a janela `row_number` de "resultado mais recente por caso e device" para um helper em
  `historico_form_factor_repository.py`: hoje ela está igual em `listar_ultimo_sdf_por_modelo` e em
  `CasoTesteRepositoryImpl.marcar_todos_aprovados`. Mexe no repositório do histórico, fora do bloco (simplify, fase 1).
- Extrair um helper de testes de migration para criar projeto com devices vinculados: o setup em SQL de
  `test_migration_datas_finalizacao.py` repete o de `test_migration_status_in_fixes.py` (simplify, fase 1).
- Criar em `shared/` uma célula de data com traço quando vazia: o padrão `x ? formatDate(x) : "—"` se repete em
  `ModelosDispositivoPage`, `ProjetosPage`, `FormFactorTabela` e `ProjetoDetalhePage` (simplify, fase 2).
- O teste "permite ao KP e ao gerente com permissão editar as atribuições do time" do `ProjetoDetalhePage.test.tsx`
  leva de 3,8 a 5 s também na `dev` e às vezes estoura o limite de 5 s; com a suíte inteira em paralelo, outros
  testes da página estouram junto. Precisa de um `testTimeout` maior ou de um teste mais enxuto (fora da spec 065).
- `tests/integration/test_bootstrap.py::test_migration_seed_perfil_kp_por_unidade_e_idempotente` falha quando a suíte
  roda duas vezes no mesmo banco de teste; passa num banco recém-criado (fora da spec 065).
- Decidir se um caso Cancelled pode receber a End date: hoje `marcar_todos_aprovados` e o retroativo da migration
  não olham o Status, então um caso excluído com PASS em todos os devices fica com data (code-review).
- O modo mock (ADR 0030) não calcula o `all_passed_em`: a End date fica vazia sem a API (code-review).
- A Overview conta entregas por Done e pela última atualização, e a End date da tabela agora é a finalização de tudo;
  alinhar as duas é uma spec nova (RN-10, fora de escopo).
