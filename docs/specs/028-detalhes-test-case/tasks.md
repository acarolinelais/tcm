# 028. Detalhes do Test Case (Title, Precondition, Procedure e Expected Result): Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> Os testes de integração e funcionais do backend usam Testcontainers: o Docker precisa estar ligado.

## Fase 1: backend, domínio e banco

- [x] **T01. Os quatro textos na entidade `CasoTeste`**
  - Arquivos: `backend/src/domain/entities/caso_teste.py`, `backend/tests/unit/domain/test_caso_teste.py`.
  - Cobre: CA-04, CA-05, CA-06 (domínio), RN-01, RN-03, RN-04, RN-06.
  - Verificação: `cd backend && uv run pytest tests/unit/domain/test_caso_teste.py` →
    - `TITLE_MAX_LENGTH = 500` e `TEXTO_MAX_LENGTH = 10_000`;
    - `title`, `precondition`, `procedure` e `expected_result` nascem `None` por padrão;
    - espaços nas pontas são removidos, só espaços vira `None` e as quebras de linha internas ficam;
    - 500 e 10.000 caracteres passam (incluindo um emoji no limite); 501 e 10.001 levantam `ValueError`;
    - `atualizar_campos_do_responsavel` e `atualizar_gerenciamento` não recebem os textos.
- [x] **T02. Colunas, migration e repositório**
  - Arquivos: `backend/src/infrastructure/data/models/caso_teste_model.py`, `backend/src/infrastructure/data/migrations/versions/<nova>_textos_caso_teste.py` (`down_revision = "a0b1c2d3e4f5"`), `backend/src/infrastructure/repositories/caso_teste_repository.py`, `backend/tests/integration/test_migration_textos_caso_teste.py` (novo, no molde de `test_migration_automation_level.py`), `backend/tests/integration/test_caso_teste_repository.py`.
  - Cobre: CA-01 (persistência), CA-09 (casos antigos).
  - Verificação: `cd backend && uv run pytest tests/integration/test_migration_textos_caso_teste.py tests/integration/test_caso_teste_repository.py && uv run alembic heads` →
    - depois do upgrade, os casos antigos ficam com os 4 textos `NULL`; o downgrade remove as colunas;
    - o repositório grava e lê os 4 textos, com as quebras de linha;
    - `alembic heads` mostra uma cabeça só.

## Fase 2: backend, API e importação

- [x] **T03. Detalhe com os textos e criação sem eles**
  - Arquivos: `backend/src/application/schemas/caso_teste.py`, `backend/src/application/services/interfaces/caso_teste_service.py`, `backend/src/application/services/caso_teste_service.py`, `backend/src/api/routers/test_cases.py`, `backend/tests/unit/application/services/test_caso_teste_service.py`, `backend/tests/functional/test_casos_teste_api.py`.
  - Cobre: CA-08 (API), CA-13 (API), CA-14 (API), RN-06, RN-07.
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_caso_teste_service.py tests/functional/test_casos_teste_api.py` →
    - `GET /api/test-cases/{id}` devolve os 4 textos (ou `null`) para dev, KP e gerente com acesso ao projeto;
    - a listagem `GET /api/projetos/{id}/test-cases` **não** traz os textos;
    - id inexistente e caso de projeto fora do escopo retornam 404;
    - POST e PUT com `procedure` (ou qualquer dos 4) retornam 422; POST sem os textos continua 201.
- [x] **T04. Validador da planilha: colunas opcionais, limites e `texto_muito_longo`**
  - Arquivos: `backend/src/application/validators/importacao_projeto.py`, `backend/tests/unit/application/validators/test_importacao_projeto.py`.
  - Cobre: CA-01, CA-02, CA-03, CA-05, CA-06, CA-07 (lado Python), RN-01, RN-02, RN-05.
  - Verificação: `cd backend && uv run pytest tests/unit/application/validators/test_importacao_projeto.py` →
    - os 4 textos chegam em `LinhaCasoTesteImportada`, com `\n` preservado, mesmo com as colunas em outra ordem e com outra caixa no cabeçalho;
    - sem as colunas ou com células vazias, os textos são `None` e não há erro;
    - 500/10.000 caracteres passam; Title com 501 na linha 4 gera `texto_muito_longo` com linha 4, coluna `Title(English)`, `parametros.maximo = 500` e `valor` com os 40 primeiros caracteres + `…`;
    - Expected Result com 10.001 e outro erro em outra linha vêm juntos.
- [x] **T05. Importação grava os textos**
  - Arquivos: `backend/src/application/services/importacao_projeto_service.py`, `backend/tests/unit/application/services/test_importacao_projeto_service.py`, `backend/tests/functional/test_projetos_api.py`.
  - Cobre: CA-01, CA-07 (nada é persistido com erro).
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_importacao_projeto_service.py tests/functional/test_projetos_api.py` → os `CasoTeste` são criados com os textos da linha; com texto longo nenhum caso é adicionado e não há `commit`; importar e depois `GET /api/test-cases/{id}` devolve os textos.
- [x] **T05b. Suíte do backend do bloco**
  - Arquivos: nenhum.
  - Cobre: regressão das fases 1 e 2.
  - Verificação: `cd backend && uv run pytest && uv run ruff check . && uv run ruff format --check .` → verde.
  - Resultado: 630 passaram e 2 falharam, ambas em `tests/integration/test_bootstrap.py`. Essas falhas já existem na
    `dev` (numa worktree limpa, com banco recém-migrado, 5 de 6 falham) e não tocam no código da spec (ver Backlog).
    O ruff ficou verde. A importação até o `GET` está coberta pelo teste do service (T05), pelo repositório (T02) e
    pela API (T03), não por um único teste funcional, porque os funcionais deste repositório simulam os services.

## Fase 3: frontend, modelo, leitura da planilha e modo mock

- [x] **T06. Tipos, limites, código de erro e textos i18n**
  - Arquivos: `frontend/src/modules/projetos/model/projeto.ts`, `frontend/src/modules/projetos/api/projetos.api.ts`, `frontend/src/modules/projetos/utils/formatar-erro-planilha.ts`, `frontend/src/modules/projetos/utils/formatar-erro-planilha.test.ts`, `frontend/src/core/i18n/resources.ts`, `frontend/src/core/i18n/resources.test.ts`.
  - Cobre: CA-06 (mensagem), RN-08 (rótulos).
  - Verificação: `cd frontend && npx vitest run src/core/i18n src/modules/projetos/utils/formatar-erro-planilha.test.ts && npx tsc --noEmit` →
    - `CasoTesteDetalhe` estende `CasoTeste` com os 4 textos `string | null`; `casosTesteApi.obter` o devolve;
    - `texto_muito_longo` está em `CODIGOS_ERRO_PLANILHA`, e a mensagem cita coluna e `maximo` em en, pt e ko;
    - existem as chaves dos nomes das 4 seções, de caso não encontrado e de Fechar, nos três idiomas.
- [x] **T07. Leitura da planilha no navegador: colunas opcionais e limites**
  - Arquivos: `frontend/src/modules/projetos/utils/planilha-projeto.ts`, `frontend/src/modules/projetos/utils/planilha-projeto.test.ts`.
  - Cobre: CA-01 a CA-03, CA-05 a CA-07 (lado navegador), RN-11.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/utils` → os mesmos casos da T04, com o mesmo código, os mesmos limites e o mesmo truncamento do `valor`; a contagem usa `[...texto].length` (um emoji vale 1, como no Python); `PreviaPlanilha` continua sem colunas novas.
- [x] **T08. Mock guarda e devolve os textos**
  - Arquivos: `frontend/src/core/mock/database.ts`, `frontend/src/core/mock/database.test.ts`.
  - Cobre: CA-01, CA-08, CA-14 (modo mock).
  - Verificação: `cd frontend && npx vitest run src/core/mock` → a importação grava os 4 textos; `obter` os devolve; a criação manual nasce sem textos; a listagem não os expõe.

## Fase 4: frontend, painel de detalhes

- [x] **T09. `useCasoTeste` e `DetalhesCasoTesteDrawer`**
  - Arquivos: `frontend/src/modules/projetos/hooks/useProjetos.ts`, `frontend/src/modules/projetos/components/casos-teste/DetalhesCasoTesteDrawer.tsx` (novo), `frontend/src/modules/projetos/components/casos-teste/DetalhesCasoTesteDrawer.test.tsx` (novo).
  - Cobre: CA-02, CA-08, CA-09, CA-10 (Fechar e Esc), CA-11, CA-13, RN-08, RN-09.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/components/casos-teste && npm run lint` →
    - título = TC ID; as 4 seções na ordem da RN-08, com o nome em negrito e o texto em `whitespace-pre-wrap`;
    - texto `null` aparece como traço; texto com várias linhas mostra as quebras;
    - estado de carregamento enquanto busca; com 404, a mensagem de caso não encontrado e nenhum texto;
    - sem inputs nem botão de enviar; um único botão Fechar, que fecha, assim como o Esc.
- [x] **T10. TC ID da tabela abre o painel**
  - Arquivos: `frontend/src/modules/projetos/pages/ProjetoDetalhePage.tsx`, `frontend/src/modules/projetos/pages/ProjetoDetalhePage.test.tsx`, `frontend/src/modules/projetos/components/casos-teste/CasoTesteDrawer.test.tsx`.
  - Cobre: CA-08, CA-10 (estado da tabela), CA-12, CA-14 (tela), RN-07, RN-10.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos && npm run lint && npx tsc --noEmit` →
    - nos perfis dev e gestão, clicar no TC ID abre o painel daquele caso;
    - Enter no TC ID abre o painel e, ao fechar, o foco volta ao TC ID;
    - ao fechar, filtros e página da tabela continuam iguais;
    - edição inline, menu de ações e justificativa de exclusão continuam funcionando;
    - o painel de editar Test Case não tem os campos de texto.

## Fase 5: e2e

- [x] **T11. Fluxo de ponta a ponta: importar e ler os detalhes**
  - Arquivos: `frontend/e2e/projetos-importacao.spec.ts`, `frontend/e2e/projetos-fixtures.ts`.
  - Cobre: CA-01, CA-06, CA-08 (fluxo completo).
  - Verificação: `cd frontend && npx playwright test e2e/projetos-importacao.spec.ts -g "detalhes"` (os e2e simulam a API com `page.route`) → a planilha com os textos cria o projeto; clicar no TC ID mostra o procedimento com as quebras de linha; uma planilha com Title de 501 caracteres mostra o erro com linha e coluna e não cria o projeto.

## Backlog
- `tests/integration/test_bootstrap.py` falha já na `dev`: numa worktree limpa, com um banco recém-migrado, 5 dos 6
  testes falham (senha do admin que não confere, unidade sem perfil `USUARIO_PADRAO`, login 401). Os testes dependem
  do estado do banco e do ambiente, e não desta spec. Investigar à parte (achado ao rodar a T05b).
- Listagem de Test Cases ainda lê os 4 textos do banco (até ~30 mil caracteres por linha) e reidrata a entidade, que
  os valida a cada leitura; só o JSON da listagem fica sem eles. Se pesar, usar `defer()`/`load_only` nas colunas
  de texto em `CasoTesteRepositoryImpl.listar_por_projeto`, sem mudar o contrato (achado da `simplify` da fase 2;
  risco já previsto no plan).
- `CasoTeste._mudar_status` repete à mão o strip e o limite da justificativa; poderia usar `_validar_texto` e manter
  só a checagem de vazio. Mexe na regra da spec 026 (achado da `simplify` da fase 1).
- Os testes de migration (`test_migration_*.py`) repetem a montagem de time, unidade, usuários e projeto; um helper ao
  lado de `_inserir_caso` tiraria a repetição. Mexe em testes de outras specs (achado da `simplify` da fase 1).
- e2e antigos que já falham na `dev` (11 em `projetos-dev.spec.ts`, `projetos-importacao.spec.ts` e `projetos.spec.ts`;
  conferido numa worktree limpa da `dev`, com o mesmo resultado nesta branch). Inclui os 4 de `getByLabel("Time")` já
  listados na spec 027. Fora do escopo desta spec (achado ao rodar a T11).
- **Resolvido na spec 030** (`shared/ui/link.ts`, `linkClassName`). A classe de link do TC ID (`text-accent underline-offset-4 hover:underline focus-visible:...`) repete a de
  `FormFactorGlobalTabela.tsx`; uma constante em `shared/ui` serviria às duas. Mexe em arquivo de outra spec (achado da
  `simplify` da fase 4).
- `JustificativaExclusaoDrawer` e `DetalhesCasoTesteDrawer` repetem o "último caso exibido" (`useState` + `setExibido`)
  para manter o conteúdo na animação de saída; um `useUltimoNaoNulo` tiraria a repetição. Só 2 usos (achado da
  `simplify` da fase 4).
- Foco ao fechar o painel: a tabela do HeroUI (React Aria) é uma grade e devolve o foco à célula do TC ID, não ao
  botão; um Tab volta ao botão. É o mesmo comportamento dos outros botões dentro da tabela (CA-12 testado assim).
- Paridade fina entre a prévia e a importação: o navegador lê as células como texto formatado (`raw: false`) e o
  backend lê o valor cru com `str()`. Um número ou uma data numa coluna de texto fica diferente nos dois lados, e perto
  do limite um lado pode aceitar o que o outro recusa. O `.strip()` do Python e o `.trim()` do JS também removem
  caracteres diferentes (ex.: BOM `﻿`). O backend é a autoridade e nada é gravado errado, mas o erro só aparece no
  envio. Mesma família do item do `raw: false` da spec 027 (achado da `code-review`).
- `to_detalhe_response` monta o `CasoTesteResponse`, faz `model_dump()` e valida tudo de novo na subclasse. O custo é
  desprezível num GET unitário, mas um construtor direto seria mais simples (achado da `code-review`).
- `extra="forbid"` no `CriarCasoTesteRequest` muda o contrato do POST: um campo a mais, que antes era ignorado, agora
  dá 422. Decisão do plan (CA-14); registrar se algum cliente externo aparecer (achado da `code-review`).
- Os e2e de `projetos-importacao.spec.ts` repetem `goto` + "Novo projeto" e a escolha de Time em vez de helpers
  (`abrirNovoProjeto`, um `escolherTime`); `projetos.spec.ts` repete as rotas de projeto + casos (um
  `setupProjetoComCasos` em `projetos-fixtures.ts`). Mexe em testes de outras specs (achado da `simplify` da fase 5).
