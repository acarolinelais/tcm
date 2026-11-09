# 026. Justificativa ao excluir um Test Case: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: backend

- [x] **T01. Justificativa na entidade `CasoTeste`**
  - Arquivos: `domain/entities/caso_teste.py`, `tests/unit/domain/test_caso_teste.py`.
  - Cobre: CA-01, CA-06.
  - Verificação: `uv run pytest tests/unit/domain/test_caso_teste.py` →
    - entrar em `Cancelled` grava a justificativa;
    - sair de `Cancelled` a apaga;
    - continuar em `Cancelled` mantém a atual;
    - `cancelar(justificativa)` grava.
- [x] **T02. Coluna, migration e repositório**
  - Arquivos: `infrastructure/data/models/caso_teste_model.py`, `infrastructure/data/migrations/versions/<rev>_justificativa_exclusao_caso_teste.py`, `infrastructure/repositories/caso_teste_repository.py`, `tests/integration/test_caso_teste_repository.py`.
  - Cobre: CA-06, RN-07.
  - Verificação: `uv run pytest tests/integration/test_caso_teste_repository.py -k justificativa` (com `SDF_TEST_DATABASE_URL`) →
    - a justificativa é persistida e lida de volta;
    - reativar grava `NULL`;
    - a migration mantém os excluídos antigos com `NULL`;
    - o downgrade remove a coluna.
- [x] **T03. Request e response com `justificativa_exclusao`**
  - Arquivos: `application/schemas/caso_teste.py`, `tests/unit/application/schemas/test_caso_teste_schema.py` (novo).
  - Cobre: CA-04, CA-05.
  - Verificação: `uv run pytest tests/unit/application/schemas -k justificativa` →
    - `Cancelled` com texto válido passa e chega sem os espaços nas pontas;
    - dá erro de validação em quatro casos: `Cancelled` sem texto, texto só com espaços, texto acima de 500 caracteres, e texto sem `Cancelled`.
- [x] **T04. Service aceita a justificativa nos três caminhos**
  - Arquivos: `application/services/caso_teste_service.py`, `tests/unit/application/services/test_caso_teste_service.py`, `tests/functional/test_casos_teste_api.py`.
  - Cobre: CA-01, CA-03, CA-04, CA-05, CA-07.
  - Verificação: `uv run pytest tests/unit/application/services/test_caso_teste_service.py tests/functional/test_casos_teste_api.py` →
    - o responsável, o Backup e a gestão excluem com justificativa e ela volta no response;
    - sem justificativa ou com mais de 500 caracteres, a API responde `422` e o TC não muda;
    - o DEV sem vínculo recebe `403`.

## Fase 2: frontend

- [x] **T05. Tipos e mock com `justificativa_exclusao`**
  - Arquivos: `modules/projetos/model/projeto.ts`, `core/mock/database.ts`, `core/mock/database.test.ts`.
  - Cobre: CA-01, CA-04, CA-06 (modo mock).
  - Verificação: `cd frontend && npx vitest run src/core/mock` →
    - excluir sem justificativa lança erro;
    - com justificativa, ela é gravada;
    - reativar a apaga.
- [x] **T06. Justificativa na confirmação de exclusão da linha**
  - Arquivos: `shared/ui/alert-confirm.tsx`, `shared/ui/form-field.tsx` (`TextAreaField`), `modules/projetos/pages/ProjetoDetalhePage.tsx`, `core/i18n/resources.ts`, `ProjetoDetalhePage.test.tsx`.
  - Cobre: CA-01, CA-04, CA-05.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos src/shared` →
    - "Excluded" na linha abre a confirmação com o campo;
    - o botão fica desabilitado sem texto ou só com espaços;
    - ao confirmar, o `PUT` leva `{status: "Cancelled", justificativa_exclusao}`;
    - o campo limita a 500 caracteres.
- [x] **T07. Justificativa no painel de edição da gestão**
  - Arquivos: `modules/projetos/components/casos-teste/CasoTesteDrawer.tsx`, teste do drawer ou da página.
  - Cobre: CA-03, CA-04.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos` →
    - mudar o Status para Excluded mostra o campo obrigatório;
    - o botão Salvar fica desabilitado sem texto;
    - o envio leva a justificativa;
    - voltar o Status esconde o campo.
- [x] **T08. Coluna de observações e painel de leitura**
  - Arquivos: `modules/projetos/components/casos-teste/JustificativaExclusaoDrawer.tsx` (novo), `modules/projetos/pages/ProjetoDetalhePage.tsx`, `core/i18n/resources.ts`, `ProjetoDetalhePage.test.tsx`.
  - Cobre: CA-02, CA-06.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos && npm run lint` →
    - o TC excluído com justificativa mostra o ícone, com `aria-label`, inclusive para o perfil Developer;
    - o clique abre o painel com "Justificativa" e o texto, sem campos editáveis;
    - um TC sem justificativa deixa a célula vazia.

## Backlog
- Helper comum de normalização "strip ou None" (`Annotated` + `BeforeValidator`) em `application/schemas`:
  `normalizar_justificativa` (caso_teste) repete `normalizar_sdf_id` (form_factor, spec 025). Mexer no schema
  de Form Factor sai do escopo desta spec (achado da `simplify` da fase 1).
- `TextAreaField` e `TextInputField` (`shared/ui/form-field.tsx`) repetem a mesma casca (`TextField` + `Label` + erro/dica);
  extrair um envelope comum. Opcional, de baixo ganho (achado da `simplify` da fase 2).
- A mutation da edição na célula (`updateMemberCase`, `ProjetoDetalhePage`) ganhou `justificativa` só para a exclusão e usa
  um cast para `AtualizarCasoTesteInput`; aceitar um `input` parcial tiraria o cast. Opcional (achado da `simplify` da fase 2).
