# 026. Automation Level do Test Case: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> Os testes de integração e funcionais do backend usam Testcontainers: o Docker precisa estar ligado.

## Fase 1: backend, domínio e banco

- [x] **T01. Enum `NivelAutomacaoCasoTeste` e campo na entidade**
  - Arquivos: `backend/src/domain/entities/caso_teste.py`, `backend/tests/unit/domain/test_caso_teste.py`.
  - Cobre: CA-15 (domínio), RN-01.
  - Verificação: `cd backend && uv run pytest tests/unit/domain/test_caso_teste.py` →
    - o enum aceita 1, 2 e 3 e recusa 0, 4 e -1 (o `true` booleano é recusado pelo schema, na T03);
    - `CasoTeste` nasce com `automation_level=None` por padrão;
    - `atualizar_campos_do_responsavel` e `atualizar_gerenciamento` mantêm o nível quando recebem `None` e trocam quando recebem um valor.
- [x] **T02. Coluna, check, migration e repositório**
  - Arquivos: `backend/src/infrastructure/data/models/caso_teste_model.py`, `backend/src/infrastructure/data/migrations/versions/<nova>_automation_level.py`, `backend/src/infrastructure/repositories/caso_teste_repository.py`, `backend/tests/integration/test_migration_automation_level.py` (novo, no molde de `test_migration_status_in_fixes.py`), `backend/tests/integration/test_caso_teste_repository.py`.
  - Cobre: CA-02 (persistência), CA-16, RN-01, RN-03.
  - Verificação: `cd backend && uv run pytest tests/integration/test_migration_automation_level.py tests/integration/test_caso_teste_repository.py` →
    - depois do upgrade, os casos antigos ficam com `NULL`;
    - o check aceita `NULL`, 1, 2 e 3 e recusa 4;
    - o repositório grava e lê o nível; o downgrade volta ao schema anterior;
    - `uv run alembic heads` mostra uma cabeça só.

## Fase 2: backend, API e importação

- [x] **T03. Schemas e service de criar e atualizar**
  - Arquivos: `backend/src/application/schemas/caso_teste.py`, `backend/src/application/services/caso_teste_service.py`, `backend/tests/unit/application/services/test_caso_teste_service.py`, `backend/tests/functional/test_casos_teste_api.py`.
  - Cobre: CA-12 (API), CA-14, CA-15, CA-19, CA-20.
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_caso_teste_service.py tests/functional/test_casos_teste_api.py` →
    - GET devolve `automation_level`;
    - PUT repassa o nível (gestão em qualquer caso, responsável no seu) e devolve 200;
    - responsável em caso alheio recebe 403 e o nível não muda;
    - PUT e POST com `4`, `0`, `"abc"` e `true` retornam 422;
    - POST com e sem nível retorna 201.
- [x] **T04. Validador da planilha: coluna opcional e parse do nível**
  - Arquivos: `backend/src/application/validators/importacao_projeto.py`, `backend/tests/unit/application/validators/test_importacao_projeto.py`.
  - Cobre: CA-02, CA-03, CA-04, CA-05, CA-06, CA-07, CA-08, CA-09 (lado Python), RN-05 a RN-09.
  - Verificação: `cd backend && uv run pytest tests/unit/application/validators/test_importacao_projeto.py` →
    - 1, 2 e 3 chegam em `LinhaCasoTesteImportada`;
    - colunas em outra ordem e colunas extras (Title etc.) não mudam o resultado;
    - sem a coluna ou com célula vazia, o nível é `None` e não há erro;
    - `1.0`, `2.0` e `"3"` viram 1, 2 e 3;
    - `4`, `0`, `1.5`, `-1` e `abc` geram `valor_invalido` com linha, coluna, valor e `esperados`, junto com outros erros da planilha.
- [x] **T05. Importação grava o nível**
  - Arquivos: `backend/src/application/services/importacao_projeto_service.py`, `backend/tests/unit/application/services/test_importacao_projeto_service.py`.
  - Cobre: CA-02, CA-07 (nada é persistido com erro).
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_importacao_projeto_service.py` → os `CasoTeste` são criados com o nível da linha (ou `None`); com nível inválido nenhum caso é adicionado e não há `commit`.
- [x] **T05b. Suíte do backend do bloco**
  - Arquivos: nenhum.
  - Cobre: regressão das fases 1 e 2.
  - Verificação: `cd backend && uv run pytest && uv run ruff check . && uv run ruff format --check .` → verde.

## Fase 3: frontend, modelo, leitura da planilha e modelo para download

- [x] **T06. Tipos, rótulos e textos i18n**
  - Arquivos: `frontend/src/modules/projetos/model/projeto.ts`, `frontend/src/core/i18n/resources.ts`, `frontend/src/core/i18n/resources.test.ts`.
  - Cobre: RN-02, CA-10 (rótulo).
  - Verificação: `cd frontend && npx vitest run src/core/i18n && npx tsc --noEmit` →
    - `automationLevel` e os rótulos `1 – ...`, `2 – ...`, `3 – ...` existem em en, pt e ko;
    - `CasoTeste`, `CriarCasoTesteInput` e `AtualizarCasoTesteInput` aceitam `automation_level`.
- [x] **T07. Leitura da planilha: coluna opcional, parse do nível e cabeçalhos do modelo**
  - Arquivos: `frontend/src/modules/projetos/utils/planilha-projeto.ts`, `frontend/src/modules/projetos/utils/planilha-projeto.test.ts`.
  - Cobre: CA-01 (constante), CA-02 a CA-09 (lado navegador).
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/utils` → os mesmos casos da T04 passam com a mesma regra (`^[0-9]+(\.0+)?$`, 1 a 3, só dígitos ASCII: o `\d` do Python casa dígitos de outros alfabetos), mais:
    - a constante de cabeçalhos do modelo é igual à lista da RN-04, na ordem;
    - o erro de nível inválido traz linha, coluna do cabeçalho original, valor e `esperados` `["1","2","3"]`.
- [x] **T08. Download do modelo com as 13 colunas**
  - Arquivos: `frontend/src/modules/projetos/pages/ProjetosPage.tsx`, `frontend/src/modules/projetos/pages/ProjetosPage.test.tsx`.
  - Cobre: CA-01.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/pages/ProjetosPage.test.tsx` → a planilha gerada tem a aba "Test Cases", a primeira linha com as 13 colunas na ordem da RN-04 e uma linha de exemplo com o mesmo número de células; o arquivo gerado volta a ser lido sem erro por `lerPlanilhaProjeto`.
- [x] **T09. Prévia da planilha mostra o nível**
  - Arquivos: `frontend/src/modules/projetos/components/importacao/PreviaPlanilha.tsx`, `frontend/src/modules/projetos/components/importacao/PreviaPlanilha.test.tsx`.
  - Cobre: CA-18.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/components/importacao` → a prévia tem a coluna depois de Category, com o rótulo do nível e um traço quando está vazio.

## Fase 4: frontend, tabela, formulário e modo mock

- [x] **T10. Mock aceita e valida o nível**
  - Arquivos: `frontend/src/core/mock/database.ts`, `frontend/src/core/mock/database.test.ts`.
  - Cobre: CA-02, CA-12, CA-14, CA-19 (modo mock).
  - Verificação: `cd frontend && npx vitest run src/core/mock` →
    - a importação e a criação gravam o nível (ou `null`);
    - o responsável altera o nível do seu caso e é recusado no de outro;
    - nível fora de 1, 2 e 3 é recusado.
- [x] **T11. Coluna, filtro e edição na tabela de Test Cases**
  - Arquivos: `frontend/src/modules/projetos/pages/ProjetoDetalhePage.tsx`, `frontend/src/modules/projetos/pages/ProjetoDetalhePage.test.tsx`.
  - Cobre: CA-10, CA-11, CA-12, CA-13, CA-17, RN-10 a RN-13.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos && npm run lint && npx tsc --noEmit` →
    - a coluna aparece depois de Category para gestão e dev, com rótulo ou traço;
    - a gestão edita qualquer caso e o responsável só os seus; a lista da célula tem só 1, 2 e 3;
    - escolher um nível chama a API com o número e a célula mostra o novo rótulo; se a API recusa, o cache volta;
    - o filtro por 1 e 3 mostra só esses casos;
    - as tabelas de Form Factor continuam sem a coluna.
- [x] **T12. Campo opcional no formulário de Test Case**
  - Arquivos: `frontend/src/modules/projetos/components/casos-teste/CasoTesteDrawer.tsx`, teste do drawer (novo, ao lado do componente).
  - Cobre: CA-19.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/components/casos-teste && npm run lint` → o campo vem sem valor ao criar e não bloqueia o salvar; sem escolha, a requisição não leva `automation_level`; ao editar, só vai se mudou.

## Fase 5: e2e

- [x] **T13. Fluxo de ponta a ponta: importar e editar**
  - Arquivos: `frontend/e2e/projetos-importacao.spec.ts`, `frontend/e2e/projetos.spec.ts`, `frontend/e2e/projetos-fixtures.ts`.
  - Cobre: CA-02, CA-07, CA-10, CA-12 (fluxo completo).
  - Verificação: `cd frontend && npx playwright test e2e/projetos-importacao.spec.ts e2e/projetos.spec.ts -g "Automation Level"` (os e2e simulam a API com `page.route`: não precisam de backend nem de Postgres) → a planilha com a coluna cria o projeto e a tabela mostra os rótulos; uma planilha com `4` mostra o erro com linha e coluna e não cria o projeto; trocar o nível numa célula persiste depois de recarregar.

## Backlog
- Filtro por "sem nível": o filtro de Automation Level só oferece 1, 2 e 3, então não há como listar os casos que ainda
  não têm nível (todos os anteriores à migration). A coluna Backup resolve o mesmo com a opção `SEM_BACKUP`. A spec (RN-12)
  não pediu; exigiria uma opção a mais no filtro e um CA novo (achado da `code-review`).
- `valorDoCampo` em `ProjetoDetalhePage.tsx` abre um caso especial numérico no editor inline, que só trabalhava com texto.
  Um próximo campo não textual pediria outro `if`; o ideal seria o `InlineSelect` devolver o valor tipado (achado da
  `code-review`, sem impacto hoje).
- Ordem no formulário de Test Case: Category, Automation Level, Difficulty; na tabela e na planilha é Difficulty, Category,
  Automation Level. Só estética (achado da `code-review`).
- Quatro e2e antigos de `projetos-importacao.spec.ts` ("pagina a prévia…", "mostra os problemas da planilha agrupados…",
  "…devolvidos pela API…", "envia identificadores de usuário…") já falham: `page.getByLabel("Time")` casa com dois campos
  (importar e manual). Trocar por `getByRole("combobox", { name: "Time" })`, como nos testes novos. Fora do escopo desta
  spec (achado ao rodar a T13). Este ambiente também só tem o Chromium 1234 e o Playwright 1.64.1 pede o 1248: rodei com
  `channel: "msedge"` numa config temporária; `npx playwright install` resolve de vez.
- O rótulo do nível (`automation_level ? t(ROTULO_AUTOMACAO[nivel]) : "—"`) aparece em `ProjetoDetalhePage.tsx` e em
  `PreviaPlanilha.tsx`: um helper `rotuloAutomacao(nivel, t)` no model tiraria a repetição. Só 2 usos, sem ação agora
  (achado da `simplify` da fase 4).
- A prévia lê as células com o texto formatado pelo Excel (`raw: false`) e o backend lê o valor cru: uma célula numérica `2.9`
  formatada como inteiro aparece como `3` na prévia e chega como `2.9` ao backend, que a recusa. O backend é a
  autoridade e nada é gravado errado, mas o erro só aparece no envio. Fechar exige ler `cell.v` só nesta coluna
  (achado da `simplify` da fase 3; caso raro, sem ação agora).
- Setup de 4 linhas (`usuario`, `service`, dois `dependency_override`) repetido em ~12 testes de `tests/functional/test_casos_teste_api.py`
  e construções inline de `UsuarioAutenticado`/`CasoTeste` em `test_caso_teste_service.py`: uma fixture ou helper
  compartilhado pediria refatorar testes de outras specs (achado da `simplify` da fase 2).
- Setup repetido nos testes de migration (`time_id`, `unidade_id`, `responsavel_id`, `backup_id` e o projeto):
  `test_migration_automation_level.py`, `test_migration_status_in_fixes.py` e `test_migration_status_in_validation.py`
  poderiam compartilhar um helper `_criar_projeto_com_responsaveis(connection)`. Mexe em testes de outras specs
  (achado da `simplify` da fase 1).
