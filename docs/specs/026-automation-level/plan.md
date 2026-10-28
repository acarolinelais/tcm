# 026. Automation Level do Test Case: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0007, 0010, 0012, 0015, 0016, 0022, 0030, 0033, 0034, 0037
- **ADRs novos propostos:** nenhum

## Abordagem

O Automation Level entra como um campo opcional do Test Case, que atravessa as camadas do mesmo jeito que
Category e Difficulty, com duas diferenças: é **nullable** e **não tem como ser esvaziado** depois de definido.

- **Banco:** coluna inteira nullable `automation_level` em `casos_teste`, com check `NULL ou 1, 2, 3`. Os registros
  existentes ficam nulos sem backfill.
- **Domínio:** enum `NivelAutomacaoCasoTeste` (inteiro 1, 2, 3). Nas atualizações, `None` significa "não
  alterar" (como em `AtualizarCasoTesteRequest`, onde todo campo é opcional); por isso o campo não se esvazia.
- **Import (backend e prévia no navegador):** as duas implementações já leem as colunas pelo nome do cabeçalho.
  A mudança é registrar `Automation Level` como coluna **opcional** (ausente = nulo, sem erro) e validar o
  valor com a **mesma regra nos dois lados**: texto aparado que case `^[0-9]+(\.0+)?$` e cujo inteiro seja 1, 2
  ou 3. Isso cobre `1`, `1.0`, `"2"` e rejeita `1.5`, `0`, `4`, `-1` e `abc`. Valor inválido reutiliza o código
  `valor_invalido` do ADR 0033 (com `esperados: ["1","2","3"]`), então **não há código de erro novo**.
- **Edição:** `automation_level` entra em `CAMPOS_RESPONSAVEL` (e, por herança, em `CAMPOS_GESTAO`). A regra de
  posse não muda: gestão em qualquer caso, responsável nos seus, backup só cancela (CA-14).
- **Frontend:** coluna depois de Category em `ProjetoDetalhePage`, com `DataTableMultiFilter` e a célula
  `InlineSelect` já usada pelas outras colunas. O `InlineSelect` trabalha com texto: a conversão para número
  acontece em `alterarCampo`, antes de a mutação gravar e atualizar o cache. O rótulo vem do i18n (en, pt, ko).
- **Modelo da planilha:** os cabeçalhos passam a uma constante exportada de `planilha-projeto.ts`, que o
  download usa e um teste compara com a lista da RN-04.
- **Mock (ADR 0030):** `core/mock/database.ts` ganha o campo na criação, na importação e na regra de campos
  permitidos, para o modo mock se comportar como a API.

## Modelo de dados

| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| `casos_teste` | `automation_level` | `SMALLINT` | Nullable, sem default. Check `ck_casos_teste_automation_level`: `automation_level IS NULL OR automation_level IN (1, 2, 3)`. Existentes ficam `NULL`. |

Migration nova, encadeada na cabeça atual (`f901a2b3c4d5`): `add_column` + check no `upgrade`; `downgrade`
remove o check e a coluna. Ela é aplicada pela inicialização da API (ADR 0012).

## Contrato da API

Nenhuma rota nova. O campo `automation_level` (inteiro 1, 2, 3 ou `null`) entra nos contratos existentes:

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/projetos/{id}/test-cases` | n/d | 200, `items[].automation_level` | sem mudança |
| GET | `/api/test-cases/{id}` | n/d | 200, `automation_level` | sem mudança |
| POST | `/api/projetos/{id}/test-cases` | `automation_level` opcional (omitido = `null`) | 201 | 422 se não for 1, 2 ou 3 (CA-20) |
| PUT | `/api/test-cases/{id}` | `automation_level` opcional (omitido = não altera) | 200 | 422 valor inválido (CA-15); 403 caso alheio (CA-14) |
| POST | `/api/projetos/importar` | planilha com a coluna opcional `Automation Level` | 201 | 422 ADR 0033 com linha e coluna (CA-07, CA-08) |

`null` explícito no PUT vale "não alterar" (campo opcional do request): o contrato não oferece limpar o campo
(RN-13). O `extra="forbid"` do request segue valendo.

## Backend: arquivos

Alterados (receita `python-crud`):
- `src/domain/entities/caso_teste.py`: enum `NivelAutomacaoCasoTeste`; atributo `automation_level` (nullable);
  parâmetro opcional em `__init__`, `atualizar_campos_do_responsavel` e `atualizar_gerenciamento`
  (`None` = manter).
- `src/infrastructure/data/models/caso_teste_model.py`: coluna e `CheckConstraint`.
- `src/infrastructure/data/migrations/versions/<nova>_automation_level.py`: **novo**.
- `src/infrastructure/repositories/caso_teste_repository.py`: `_to_entity` e `_to_model`.
- `src/application/schemas/caso_teste.py`: campo em `CriarCasoTesteRequest`, `AtualizarCasoTesteRequest`,
  `CasoTesteResponse` e `to_response`.
- `src/application/services/caso_teste_service.py`: `CAMPOS_RESPONSAVEL`; repasse nas chamadas de criar e
  atualizar.
- `src/application/validators/importacao_projeto.py`: cabeçalho opcional, parse do nível, campo em
  `LinhaCasoTesteImportada`.
- `src/application/services/importacao_projeto_service.py`: repasse ao criar o `CasoTeste`.

## Frontend: arquivos

Alterados (receita `react-crud`, tabelas pela skill `table-rules`):
- `modules/projetos/model/projeto.ts`: `NIVEIS_AUTOMACAO`, tipo, `ROTULO_AUTOMACAO`; campo em `CasoTeste`,
  `CriarCasoTesteInput` e `AtualizarCasoTesteInput`.
- `modules/projetos/utils/planilha-projeto.ts`: cabeçalho opcional, parse do nível, campo em
  `CasoTestePlanilha`, constante dos cabeçalhos do modelo.
- `modules/projetos/pages/ProjetosPage.tsx`: `downloadTemplate` usa a constante e uma linha de exemplo com as
  13 colunas.
- `modules/projetos/pages/ProjetoDetalhePage.tsx`: `CampoInline`, filtro, opções, coluna depois de Category,
  conversão para número em `alterarCampo`.
- `modules/projetos/components/casos-teste/CasoTesteDrawer.tsx`: `SelectField` opcional (sem valor = não envia).
- `modules/projetos/components/importacao/PreviaPlanilha.tsx`: coluna na prévia.
- `core/i18n/resources.ts`: `automationLevel` e os três rótulos em en, pt e ko.
- `core/mock/database.ts`: criação, importação e campos permitidos ao responsável.
- Form Factor (`components/form-factor/*`): **sem alteração** (CA-11).

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade (front) | `planilha-projeto.test.ts`: constante de cabeçalhos igual à RN-04; `ProjetosPage.test.tsx`: o download gera a planilha com essas colunas |
| CA-02 | Unidade (back) | `test_importacao_projeto.py`: níveis 1, 2 e 3 chegam em `LinhaCasoTesteImportada` |
| CA-02 | Integração | `test_caso_teste_repository.py`: grava e lê `automation_level` |
| CA-03 | Unidade (back e front) | planilha com colunas embaralhadas: cada valor no campo certo |
| CA-04 | Unidade (back e front) | planilha sem a coluna: casos com `null` e sem erro |
| CA-05 | Unidade (back e front) | célula vazia: `null` naquele caso, os outros intactos |
| CA-06 | Unidade (back e front) | `1.0`, `2.0`, `"3"` viram 1, 2, 3 |
| CA-07 (falha) | Unidade (back e front) | `4`, `0`, `1.5`, `abc`: erro `valor_invalido` com linha, coluna, valor e `esperados` |
| CA-07 | Unidade (service) | `test_importacao_projeto_service.py`: nenhum caso é persistido com erro |
| CA-08 (falha) | Unidade (back e front) | nível inválido + outro erro na planilha: os dois erros vêm juntos |
| CA-09 | Unidade (back e front) | colunas Title, Precondition, Procedure e Expected Result preenchidas: sem erro |
| CA-10 | Unidade (front) | `ProjetoDetalhePage.test.tsx`: coluna depois de Category, rótulo e traço, nos perfis gestão e dev |
| CA-11 | Unidade (front) | `FormFactorTabela.test.tsx`: sem a coluna |
| CA-12 | Unidade (front) | `ProjetoDetalhePage.test.tsx`: escolher um nível chama a API com o número e a célula mostra o rótulo |
| CA-12 | Funcional | `test_casos_teste_api.py`: PUT com `automation_level` repassa o valor e devolve 200 |
| CA-13 | Unidade (front) | `ProjetoDetalhePage.test.tsx`: a lista da célula só tem 1, 2 e 3 |
| CA-14 (falha) | Unidade (service) | `test_caso_teste_service.py`: responsável em caso alheio recebe 403 e o valor não muda |
| CA-15 (falha) | Funcional | `test_casos_teste_api.py`: PUT com `4`, `0` e `"abc"` retorna 422 |
| CA-15 | Unidade (domínio) | `test_caso_teste.py`: o enum recusa valores fora de 1, 2, 3 |
| CA-16 | Integração | `test_migration_automation_level.py`: registros anteriores ficam `NULL` depois do upgrade |
| CA-17 | Unidade (front) | `ProjetoDetalhePage.test.tsx`: filtro por 1 e 3 |
| CA-18 | Unidade (front) | `PreviaPlanilha.test.tsx`: mostra o nível lido |
| CA-19 | Funcional + unidade (front) | `test_casos_teste_api.py`: POST com e sem nível retorna 201; drawer envia o campo só quando escolhido |
| CA-20 (falha) | Funcional | `test_casos_teste_api.py`: POST com `5` retorna 422 |
| RN-01 | Integração | `test_migration_automation_level.py`: o check do banco recusa `4` e aceita `NULL`, 1, 2 e 3 |
| Fluxo | E2E | `projetos-importacao.spec.ts`: importa a planilha com a coluna e vê o rótulo na tabela |

## Riscos e decisões pendentes

- **Paridade entre as duas leituras da planilha.** A prévia (navegador) e a importação (Python) validam
  separadamente (ADR 0033). A regex do nível é a mesma nos dois lados e cada caso da tabela acima roda nos
  dois, para não haver planilha que passe na prévia e falhe na API.
- **Formato do número no Excel.** O navegador lê as células como texto formatado e o `openpyxl`, como número.
  `1`, `1.0` e `"1"` precisam dar o mesmo resultado; cobertos no CA-06.
- **Cabeça das migrations.** O plano assume `f901a2b3c4d5` como cabeça única. Se outra branch criar uma
  migration antes do merge, a ordem é refeita ao integrar.
- **`null` no PUT não limpa.** É consequência da RN-13 e de o request tratar `null` como omitido. Se um dia o
  limpar for desejado, exige distinguir "omitido" de "nulo" (o `model_fields_set` já permite) e um novo CA.
- **Filtro local.** Como os demais filtros da tabela, o de Automation Level roda no navegador sobre os casos
  carregados; não há mudança de paginação nem de rota.
- **Pydantic e booleanos.** `true` não deve passar como nível 1; o teste do CA-15 inclui `true`.
