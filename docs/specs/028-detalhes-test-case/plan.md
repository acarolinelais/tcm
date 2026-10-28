# 028. Detalhes do Test Case (Title, Precondition, Procedure e Expected Result): Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0007, 0008, 0010, 0012, 0013, 0015, 0022, 0030, 0033, 0037
- **ADRs novos propostos:** nenhum

## Abordagem

Os quatro textos entram como campos opcionais do Test Case, preenchidos **só pela importação** e lidos **só
pelo detalhe** do caso.

- **Banco:** quatro colunas nullable em `casos_teste` (`title`, `precondition`, `procedure`,
  `expected_result`). Vazio é gravado como `NULL`. Os registros existentes ficam nulos, sem backfill.
- **Domínio:** os campos entram no `__init__` de `CasoTeste` como parâmetros nomeados opcionais, com a
  normalização (strip; só espaços = `None`) e os limites (RN-03, RN-04) validados ali. **Nenhum** método de
  atualização os recebe (RN-06).
- **Importação (backend e prévia no navegador):** as colunas `Title(English)`, `Test Precondition(English)`,
  `Test Procedure(English)` e `Expected Result(English)` entram como **opcionais**, encontradas pelo nome
  normalizado, como `Automation Level`. Texto acima do limite gera o **código novo `texto_muito_longo`**
  (ADR 0033), com `parametros: { maximo }`. O `valor` leva só os primeiros 40 caracteres seguidos de `…`, para
  o 422 não repetir 10 mil caracteres. A prévia valida os mesmos limites mas não mostra os textos (RN-11).
- **Leitura:** a listagem **não** muda; os textos só saem no `GET /api/test-cases/{id}`, que já existe e já
  aplica a visibilidade do projeto (RN-07). Assim cada página da tabela não carrega até 30 mil caracteres por
  linha. O detalhe ganha um schema próprio, `CasoTesteDetalheResponse`, que estende `CasoTesteResponse`.
- **Frontend:** o TC ID da tabela vira um botão com aparência de link. Ele abre o novo
  `DetalhesCasoTesteDrawer` (HeroUI, sobre o `SideDrawer`), que busca o detalhe com `useCasoTeste(id)` e mostra
  as quatro seções: nome em negrito e texto com `whitespace-pre-wrap`. Há estados de carregamento, de caso não
  encontrado (404, CA-13) e de erro, e um único botão **Fechar** no rodapé.
- **Mock (ADR 0030):** `core/mock/database.ts` guarda os textos na importação, e `obter` os devolve.

## Modelo de dados

| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| `casos_teste` | `title` | `VARCHAR(500)` | Nullable. Sem espaços nas pontas; vazio = `NULL`. |
| `casos_teste` | `precondition` | `VARCHAR(10000)` | Nullable. Idem; quebras de linha preservadas. |
| `casos_teste` | `procedure` | `VARCHAR(10000)` | Nullable. Idem. |
| `casos_teste` | `expected_result` | `VARCHAR(10000)` | Nullable. Idem. |

O limite fica no tipo da coluna (`VARCHAR(n)` conta caracteres no Postgres), então não precisa de check. Os
limites são constantes de `CasoTeste` (`TITLE_MAX_LENGTH = 500`, `TEXTO_MAX_LENGTH = 10_000`), usadas no model,
no validador e no schema, como `TC_ID_MAX_LENGTH`. A migration nova é encadeada no head atual (`a0b1c2d3e4f5`):
o `upgrade` faz 4× `add_column` e o `downgrade` faz 4× `drop_column`. Ela é aplicada quando a API inicia
(ADR 0012).

## Contrato da API

Nenhuma rota nova.

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/test-cases/{id}` | n/d | 200, `CasoTesteDetalheResponse` = campos de hoje + `title`, `precondition`, `procedure`, `expected_result` (texto ou `null`) | 404 inexistente ou fora do escopo (CA-13) |
| GET | `/api/projetos/{id}/test-cases` | n/d | 200, **sem** os textos (sem mudança) | sem mudança |
| POST | `/api/projetos/importar` | planilha com as 4 colunas opcionais | 201 | 422 ADR 0033 com `codigo: "texto_muito_longo"`, linha, coluna, `valor` truncado e `parametros.maximo` (CA-06, CA-07) |
| POST | `/api/projetos/{id}/test-cases` | sem mudança; os textos **não** entram no request | 201 | 422 se vierem os textos (o request passa a ter `extra="forbid"`, CA-14) |
| PUT | `/api/test-cases/{id}` | sem mudança (`extra="forbid"` já recusa os textos) | 200 | 422 se vierem os textos (CA-14) |

## Backend: arquivos

Alterados (receita `python-crud`):
- `src/domain/entities/caso_teste.py`: constantes de limite; os 4 atributos com normalização e validação no
  `__init__`.
- `src/infrastructure/data/models/caso_teste_model.py`: 4 colunas.
- `src/infrastructure/data/migrations/versions/<nova>_textos_caso_teste.py`: **novo**.
- `src/infrastructure/repositories/caso_teste_repository.py`: `_to_entity` e `_to_model`.
- `src/application/schemas/caso_teste.py`: `CasoTesteDetalheResponse` + `to_detalhe_response`;
  `extra="forbid"` em `CriarCasoTesteRequest`.
- `src/application/services/interfaces/caso_teste_service.py` e `caso_teste_service.py`: `obter` passa a
  devolver `CasoTesteDetalheResponse`.
- `src/api/routers/test_cases.py`: `response_model` do `GET /{caso_id}`.
- `src/application/validators/importacao_projeto.py`: 4 cabeçalhos opcionais, `texto_longo()` com limite e
  código `texto_muito_longo`, campos em `LinhaCasoTesteImportada`.
- `src/application/services/importacao_projeto_service.py`: repassa os textos ao criar o `CasoTeste`.

## Frontend: arquivos

Alterados e novos (receita `react-crud`, HeroUI pelo ADR 0037, tabela pela skill `table-rules`):
- `modules/projetos/model/projeto.ts`: tipo `CasoTesteDetalhe` (estende `CasoTeste`), limites,
  `texto_muito_longo` em `CODIGOS_ERRO_PLANILHA`.
- `modules/projetos/api/projetos.api.ts`: `casosTesteApi.obter` passa a devolver `CasoTesteDetalhe`.
- `modules/projetos/hooks/useProjetos.ts`: `useCasoTeste(id)` (`enabled` só com id; sem retry em 404).
- `modules/projetos/utils/planilha-projeto.ts`: 4 cabeçalhos opcionais, mesmos limites, o mesmo truncamento do
  `valor` e o mesmo código do backend.
- `modules/projetos/utils/formatar-erro-planilha.ts`: passa `maximo` para a mensagem.
- `modules/projetos/components/casos-teste/DetalhesCasoTesteDrawer.tsx` + `.test.tsx`: **novos**.
- `modules/projetos/pages/ProjetoDetalhePage.tsx`: célula do TC ID como botão-link; estado do caso aberto;
  foco devolvido ao link ao fechar (CA-12).
- `core/i18n/resources.ts`: `testCaseTitle`, `testPrecondition`, `testProcedure`, `expectedResult`,
  `testCaseNotFound`, `close` (se ainda não existir) e `spreadsheetError.texto_muito_longo`, em en, pt e ko.
- `core/mock/database.ts`: textos na importação e no `obter`.
- `CasoTesteDrawer.tsx`, `PreviaPlanilha.tsx` e Form Factor: **sem alteração** (CA-14, RN-11).

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade (back) | `test_importacao_projeto.py`: os 4 textos chegam em `LinhaCasoTesteImportada` |
| CA-01 | Integração | `test_caso_teste_repository.py`: grava e lê os 4 textos |
| CA-01 | Funcional | `test_projetos_api.py`: importa e o `GET /api/test-cases/{id}` devolve os textos |
| CA-02 | Unidade (back e front) | célula com `\n` mantém as quebras; `DetalhesCasoTesteDrawer.test.tsx`: texto com várias linhas renderizado com `pre-wrap` |
| CA-03 | Unidade (back e front) | planilha sem as colunas e com células vazias: textos `None`/`null` e sem erro |
| CA-04 | Unidade (domínio) | `test_caso_teste.py`: strip nas pontas; só espaços vira `None` |
| CA-05 | Unidade (back e front) | 500 e 10.000 caracteres passam |
| CA-06 (falha) | Unidade (back e front) | 501 no Title da linha 4: `texto_muito_longo`, linha 4, coluna `Title(English)`, `maximo: 500` |
| CA-06 | Unidade (domínio) | `test_caso_teste.py`: o construtor recusa 501 e 10.001 |
| CA-07 (falha) | Unidade (back e front) | Expected Result com 10.001 + outro erro: os dois vêm juntos |
| CA-07 | Unidade (service) | `test_importacao_projeto_service.py`: nada é persistido |
| CA-08 | Unidade (front) | `ProjetoDetalhePage.test.tsx`: clicar no TC ID, nos perfis dev e gestão, abre o painel; `DetalhesCasoTesteDrawer.test.tsx`: título = TC ID, 4 seções na ordem e nomes em `<dt>` com negrito |
| CA-08 | Funcional | `test_casos_teste_api.py`: dev, KP e gerente com acesso ao projeto recebem 200 com os textos |
| CA-09 | Unidade (front) | textos `null` aparecem como traço |
| CA-09 | Integração | `test_migration_textos_caso_teste.py`: registros anteriores ficam `NULL` depois do upgrade |
| CA-10 | Unidade (front) | Fechar e Esc fecham o painel; filtros e página da tabela continuam iguais |
| CA-11 | Unidade (front) | o painel não tem inputs nem botão de enviar |
| CA-12 | Unidade (front) | Enter no TC ID abre o painel; ao fechar, o foco volta ao TC ID |
| CA-13 (falha) | Unidade (front) | API 404: mensagem de caso não encontrado e nenhum texto de outro caso |
| CA-13 (falha) | Funcional | `test_casos_teste_api.py`: id inexistente e caso de projeto fora do escopo retornam 404 |
| CA-14 | Funcional | `test_casos_teste_api.py`: POST e PUT com `procedure` retornam 422 |
| CA-14 | Unidade (front) | `CasoTesteDrawer.test.tsx`: o painel de edição não tem os campos |
| Fluxo | E2E | `projetos-importacao.spec.ts`: importa a planilha com os textos, clica no TC ID e lê o procedimento no painel |

## Riscos e decisões pendentes

- **Paridade entre as duas leituras da planilha.** A prévia e a importação validam separadamente (ADR 0033).
  Os limites, o truncamento do `valor` e o código são os mesmos nos dois lados, e cada caso de limite roda nos
  dois. O código novo exige texto em en, pt e ko e teste nos dois lados, como o ADR pede.
- **Contagem de caracteres.** O Python conta *code points* e o JavaScript, unidades UTF-16: um emoji vale 1 no
  Python e 2 no navegador. Para a prévia não recusar o que a API aceita, o navegador conta com
  `[...texto].length`. O teste do CA-05 inclui um emoji no limite.
- **Quebras de linha do Excel.** O Excel grava `\n` na célula. O `openpyxl` o devolve como está, e o navegador
  pode devolver `\r\n`. O backend grava como recebe; o painel usa `pre-wrap`, que mostra as duas formas.
- **`extra="forbid"` no POST de criação.** Hoje um campo desconhecido é ignorado em silêncio. Recusar é
  necessário para o CA-14, mas também afeta algum cliente que já mande campos a mais. O frontend e o mock só
  mandam campos conhecidos (conferir no teste do `CasoTesteDrawer`).
- **Carga da listagem.** O repositório lê a linha inteira, inclusive os textos, também na listagem, que os
  descarta no schema. Com 20 linhas por página isso é aceitável. Se pesar, o próximo passo é `defer()` nas
  colunas de texto, sem mudar o contrato.
- **Cabeça das migrations.** O plano assume `a0b1c2d3e4f5` como cabeça única. Se outra branch criar uma
  migration antes do merge, a ordem é refeita ao integrar.
