# 025. SDF ID único por rodada no projeto: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: backend

- [x] **T01. `ConflictException` com campo opcional**
  - Arquivos: `domain/common/exceptions.py`, `api/error_handling/handlers.py`, teste do handler em `tests/unit` (ou funcional).
  - Cobre: CA-02 (formato do erro).
  - Verificação: `uv run pytest tests -k conflict` → com `campo`, o 409 traz `errors: [{campo, mensagem}]`; sem `campo`, o corpo continua igual ao de hoje (sem `errors`).
- [x] **T02. Normalizar o SDF ID do request de rodada**
  - Arquivos: `application/schemas/form_factor.py`, teste de schema em `tests/unit/application`.
  - Cobre: CA-03, CA-05.
  - Verificação: `uv run pytest tests/unit/application -k rodada` → ` SDF-001 ` vira `SDF-001`; `""` e `"   "` viram `None`; acima de 50 caracteres depois de tirar os espaços continua dando 422.
- [x] **T03. Consulta `existe_sdf_id_no_projeto` no repositório de rodadas**
  - Arquivos: `domain/entities/interfaces/rodada_form_factor_repository.py`, `infrastructure/repositories/rodada_form_factor_repository.py`, `tests/integration/test_resultado_form_factor_repository.py` (reaproveita o `_Cenario` com rodadas).
  - Cobre: CA-03, CA-04.
  - Verificação: `uv run pytest tests/integration/test_resultado_form_factor_repository.py` (com Docker) → acha `sdf-001` quando existe ` SDF-001 `; não acha o de outro projeto, o de outra unidade nem o de rodada inativa.
- [x] **T04. `criar_rodada` recusa SDF ID repetido**
  - Arquivos: `application/services/form_factor_service.py`, `tests/unit/application/services/test_form_factor_service.py`, `tests/functional/test_form_factor_api.py`.
  - Cobre: CA-01, CA-02, CA-05.
  - Verificação: `uv run pytest tests/unit/application/services/test_form_factor_service.py tests/functional/test_form_factor_api.py` →
    - SDF ID novo cria a rodada;
    - SDF ID repetido levanta 409 com `campo="sdf_id"`, sem gravar rodada nem execução e sem `commit`;
    - sem SDF ID, a consulta de repetição não é chamada.

## Fase 2: frontend

- [x] **T05. Mock recusa SDF ID repetido**
  - Arquivos: `core/mock/database.ts`, `core/mock/database.test.ts`.
  - Cobre: CA-02, CA-03, CA-04, CA-05 (modo mock).
  - Verificação: `cd frontend && npx vitest run src/core/mock` → repetido no mesmo projeto (com maiúsculas e espaços diferentes) lança `ApiError` 409 com `campo` `sdf_id`; outro projeto e "sem SDF ID" criam a rodada.
- [x] **T06. Erro de SDF ID repetido no campo do diálogo**
  - Arquivos: `modules/projetos/components/form-factor/FormFactorCriarRodadaDialog.tsx`, `modules/projetos/pages/ProjetoDetalhePage.tsx`, `core/i18n/resources.ts`, teste do diálogo/página.
  - Cobre: CA-02, CA-06.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos && npm run lint` → 409 com `campo` `sdf_id` mostra `sdfIdAlreadyUsed` no campo, com o modal aberto e o valor mantido; editar o valor limpa o erro; outro 409 continua no toast.

## Backlog
- Helper `temErroDeCampo(error, campo)` em `shared/api/problem-details.ts`: `UsuarioForm`, `ModeloDispositivoForm` e
  agora `ProjetoDetalhePage` (criar rodada) checam `error.problem.errors` com o campo à mão. Trocar os usos antigos
  sai do escopo desta spec (achado da `simplify` da fase 2).
- Índice único parcial em `rodadas_form_factor` sobre `(unidade_id, projeto_id, lower(trim(sdf_id))) WHERE ativo`:
  fecharia a corrida de duas criações simultâneas com o mesmo SDF ID e evitaria o scan na verificação. Exige antes
  limpar as rodadas antigas repetidas (fora de escopo pela RN-05). Achado da `code-review`.
