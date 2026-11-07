# 066. Status do Test Case pela importação do relatório SDF: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: backend

- [x] **T01. Regra de transição no domínio**
  - Arquivos: `src/domain/entities/caso_teste.py`, `tests/unit/domain/test_caso_teste_status_sdf.py`
  - Cobre: CA-01 a CA-06, CA-09, CA-10, CA-12, CA-14
  - Verificação: `uv run pytest tests/unit/domain -q` → verde
- [x] **T02. Casos com tudo PASS no repositório**
  - Arquivos: interface e `caso_teste_repository.py`, `tests/integration/test_caso_teste_todos_aprovados.py`
  - Cobre: CA-01, CA-03, CA-06
  - Verificação: `uv run pytest tests/integration/test_caso_teste_todos_aprovados.py -q` → verde
- [x] **T03. Importação aplica a regra e registra a origem**
  - Arquivos: `importacao_sdf_service.py`, `api/dependencies.py`, `test_importacao_sdf_service.py`,
    `test_importacao_sdf_fluxo.py`
  - Cobre: CA-07, CA-08, CA-11
  - Verificação: `uv run pytest -q` → verde; `uv run ruff check .` → sem erros

## Fase 2: frontend

- [x] **T04. Tela atualiza o Status depois da importação**
  - Arquivos: `modules/projetos/hooks/useProjetos.ts`, `useProjetos.test.tsx`
  - Cobre: CA-13
  - Verificação: `npx vitest run src/modules/projetos/hooks && npm run lint && npx tsc -b` → verde

## Backlog
