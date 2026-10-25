# 017. Status In Validation do Test Case: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: backend

- [ ] **T01. `InValidation` no domínio**
  - Arquivos: `backend/src/domain/entities/caso_teste.py`, `backend/tests/unit/domain/test_caso_teste.py`
  - Cobre: CA-01 (base), CA-05
  - Verificação: `cd backend && uv run pytest tests/unit/domain/test_caso_teste.py` → verde. A ordem do
    enum é `To-Do`, `InProgress`, `InReview`, `InValidation`, `Pass`, `Fail`.
- [ ] **T02. Model e migration (coluna `VARCHAR(20)` e CHECK novo)**
  - Arquivos: `backend/src/infrastructure/data/models/caso_teste_model.py`,
    `backend/src/infrastructure/data/migrations/versions/b3c4d5e6f708_status_in_validation.py`,
    `backend/tests/integration/test_caso_teste_repository.py`,
    `backend/tests/integration/test_migration_status_in_validation.py` (novo, no padrão de
    `test_migration_catalogo_modelos_dispositivo.py`)
  - Cobre: CA-01, CA-05, CA-07
  - Verificação: `cd backend && uv run pytest tests/integration/test_caso_teste_repository.py
    tests/integration/test_migration_status_in_validation.py` → verde. Os testes cobrem: gravar e ler
    `InValidation` no Postgres; o CHECK recusa um Status fora da lista; casos criados antes da migration
    mantêm o Status depois do `upgrade`; o `downgrade` leva `InValidation` para `InReview`.
- [ ] **T03. Contrato da API aceita o novo Status**
  - Arquivos: `backend/tests/functional/test_casos_teste_api.py`
  - Cobre: CA-01, CA-05, CA-06
  - Verificação: `cd backend && uv run pytest tests/functional/test_casos_teste_api.py` → verde. O
    responsável muda para `InValidation` (200); Status inválido retorna 422 com o campo `status`; membro em
    caso alheio recebe 403.

## Fase 2: frontend

- [ ] **T04. Modelo e textos do Status**
  - Arquivos: `frontend/src/modules/projetos/model/projeto.ts`, `frontend/src/core/i18n/resources.ts`,
    `frontend/src/core/i18n/resources.test.ts`, `frontend/src/core/mock/database.ts` (se validar Status)
  - Cobre: CA-02 (base), CA-03 (base)
  - Verificação: `cd frontend && npm test -- resources` → verde. `statusInValidation` existe em en
    ("In Validation"), pt ("Em validação") e ko ("검증 중").
- [ ] **T05. Badge, filtro e drawer**
  - Arquivos: `frontend/src/modules/projetos/ProjetoDetalhePage.tsx` e o teste dele
  - Cobre: CA-01, CA-02, CA-03, CA-04
  - Verificação: `cd frontend && npm test -- ProjetoDetalhePage` → verde. Os testes cobrem: escolher
    "In Validation" no select da linha chama a API e exibe o badge; o filtro lista "In Validation" entre
    "In Review" e "Pass" e filtra; o drawer de edição oferece a opção na mesma ordem; caso em
    "In Validation" mostra "—" na Data final. Badge violeta com `ShieldCheck`, conferido com a skill
    `better-accessibility` (contraste do texto).

## Backlog
