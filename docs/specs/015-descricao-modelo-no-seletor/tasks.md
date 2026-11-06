# 015. Descrição do modelo no seletor de projetos: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: descrição nas opções

- [x] **T01. `/opcoes` devolve a descrição**
  - Arquivos: `backend/src/application/schemas/modelo_dispositivo.py`,
    `backend/tests/unit/application/services/test_modelo_dispositivo_service.py`,
    `backend/tests/functional/test_modelos_dispositivo_api.py`
  - Cobre: CA-01, CA-04
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_modelo_dispositivo_service.py tests/functional/test_modelos_dispositivo_api.py`
    → verde. As opções trazem `descricao`, e o dev continua recebendo 403.
- [x] **T02. `MultiSelectCombobox` com descrição opcional**
  - Arquivos: `frontend/src/shared/ui/multi-select-combobox.tsx`,
    `frontend/src/shared/ui/multi-select-combobox.test.tsx` (novo)
  - Cobre: CA-01, CA-02, CA-03
  - Verificação: `cd frontend && npm test -- multi-select-combobox` → verde. A opção com descrição mostra
    `nome · descrição`; a sem descrição não mostra o separador; a etiqueta selecionada mostra só o nome.
- [x] **T03. Projetos envia a descrição ao seletor**
  - Arquivos: `frontend/src/modules/projetos/model/projeto.ts`, `ProjetosPage.tsx`,
    `ProjetosPage.test.tsx`, `frontend/src/core/mock/database.ts`, `database.test.ts`,
    `frontend/e2e/projetos-fixtures.ts`
  - Cobre: CA-01
  - Verificação: `cd frontend && npx tsc -b && npm test && npm run lint` → verde, e
    `npm run e2e -- modelos-dispositivo projetos.spec projetos-importacao` → verde.

## Backlog
