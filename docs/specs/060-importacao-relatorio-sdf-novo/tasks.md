# 060. Importação do relatório SDF no formato novo: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> O backend roda em `backend/` (`uv run pytest ...`); o frontend, em `frontend/`, com caminhos relativos a
> `frontend/src`. Os testes de integração precisam de `SDF_TEST_DATABASE_URL`.

## Fase 1: backend, leitura do arquivo

- [x] **T01. Helpers do formato novo**
  - Arquivos: `backend/src/application/validators/relatorio_sdf.py`,
    `backend/tests/unit/application/validators/test_relatorio_sdf.py`
  - O que muda: funções puras `sdf_id_do_nome`, `converter_data_f4`, `one_ui_do_caminho` e `tc_id_do_script`.
    Testes: `123456-789012_0_Test_1_Detail.xlsx` dá `123456-789012`; `Detail.xlsx`, `_0_x.xlsx` e um prefixo com mais
    de 50 caracteres dão nulo; `"10/21/2026  \n6:43:35 PM"` dá 2026-10-21 18:43:35; texto que não é data dá nulo;
    `OneUI95` dá `9.5`, `OneUI10` dá `10`, `OneUI105` dá `10.5`, e um caminho sem "OneUI" com dígitos dá nulo;
    `Keyboard_000001.py` dá `Keyboard_000001`.
  - Cobre: CA-07, CA-09, CA-15
  - Verificação: `cd backend && uv run pytest tests/unit/application/validators/test_relatorio_sdf.py` → verde.
- [x] **T02. Leitura do relatório com os erros do arquivo**
  - Arquivos: `relatorio_sdf.py`, `test_relatorio_sdf.py`, `backend/tests/fixtures/sdf/123456-789012_0_Test_1_Detail.xlsx`
    (cópia do exemplo da spec)
  - O que muda: `ler_relatorio_sdf(nome_arquivo, conteudo)` devolve SDF ID, device (C4), data (F4), as linhas e os
    erros com os códigos do plan (`sdf_nome_sem_id`, `sdf_formato_invalido`, `sdf_data_invalida`,
    `sdf_one_ui_invalido`, `valor_obrigatorio`, `sdf_sem_resultados`). Os cabeçalhos da linha 7 são achados pelo
    texto normalizado; `HQ_precondition.py` e `Setup.py` saem em qualquer posição; descrição sem espaços e tabs nas
    pontas. Só um arquivo que não abre levanta `RelatorioSdfInvalido` (`arquivo_invalido`). O formato antigo e os aliases saem na
    T05, junto com a troca no service. Testes: o exemplo real dá 9 linhas, sem erro; State `check` e `N/A` entram como vieram; `Setup.py`
    no meio sai; a planilha antiga dá `sdf_formato_invalido`; F4 vazia dá `sdf_data_invalida`; uma linha sem State dá
    `valor_obrigatorio`; só preparação dá `sdf_sem_resultados`; F4 inválida e uma linha sem OneUI saem juntas.
  - Cobre: CA-05, CA-06, CA-08, CA-12, CA-13, CA-17
  - Verificação: `uv run pytest tests/unit/application/validators/test_relatorio_sdf.py` → verde; `uv run ruff check src tests` limpo.

## Fase 2: backend, validação contra o projeto e gravação

- [x] **T03. Descrição no resultado**
  - Arquivos: `domain/entities/resultado_form_factor.py`, `infrastructure/data/models/resultado_form_factor_model.py`,
    migration nova (`down_revision = "e038b1c2d3e4"`), `tests/unit/domain/test_resultado_form_factor.py` (ou o teste
    da entidade que já existe)
  - O que muda: `descricao` opcional (sem espaços nas pontas, vazio vira nulo, no máximo 2000 caracteres) e a coluna
    `TEXT` nula. Testes: descrição com tab no fim fica sem o tab; vazia vira nula; acima do limite é recusada.
  - Cobre: CA-02
  - Verificação: `uv run pytest tests/unit` → verde; `uv run alembic heads` mostra um head só.
- [ ] **T04. SDF ID já importado no projeto** (código e testes prontos; falta rodar a integração)
  - Arquivos: `domain/entities/interfaces/execucao_sdf_repository.py`,
    `infrastructure/repositories/execucao_sdf_repository.py`, o teste de integração do repositório
  - O que muda: `existe_sdf_id_importado_no_projeto(unidade_id, projeto_id, sdf_id)`: execução ativa de importação
    ativa do projeto, com o SDF ID comparado sem maiúsculas e sem espaços nas pontas. Testes: acha com outra
    caixa; não acha em outro projeto, em outra unidade nem em importação inativa.
  - Cobre: CA-10
  - Verificação: `uv run pytest -p src.infrastructure.data.session tests/integration/test_execucao_sdf_repository.py`
    → verde (com Postgres).
- [x] **T05. Importação com os erros do projeto juntos**
  - Arquivos: `application/services/importacao_sdf_service.py` e a interface, `api/routers/projetos.py`,
    `tests/unit/application/services/test_importacao_sdf_service.py`, `tests/functional/test_form_factor_api.py`
  - O que muda: `importar(usuario, projeto_id, nome_arquivo, conteudo)`. Ele junta os erros do arquivo e os do
    projeto (`sdf_tc_fora_do_projeto`, `sdf_device_fora_do_projeto`, `sdf_one_ui_diferente` por `Decimal`,
    `sdf_id_repetido` em rodada ou importação) e, havendo algum, levanta `RelatorioSdfInvalido` sem gravar. Sem
    erro, grava a importação, uma execução por TC com o SDF ID e a data da F4 e um resultado no device do C4 com a
    descrição, num `commit`. O router passa `arquivo.filename`. As permissões não mudam. Testes: o exemplo real grava
    9 execuções e 9 resultados; cada erro do projeto sai com o seu código e nada é gravado; `OneUI10` bate com o
    projeto `10.0`; F4 inválida e TC desconhecido saem juntos; o dev continua com 403; o 422 do router traz `codigo`,
    `linha` e `coluna`.
  - Cobre: CA-01, CA-10, CA-11, CA-14, CA-15, CA-16, CA-18
  - Verificação: `uv run pytest tests/unit/application/services/test_importacao_sdf_service.py tests/functional` → verde.
- [ ] **T06. Descrição no histórico e fluxo no Postgres** (código e testes prontos; falta rodar a integração)
  - Arquivos: `domain/queries/historico_form_factor.py`, `infrastructure/repositories/historico_form_factor_repository.py`,
    `application/schemas/form_factor_historico.py`, `tests/integration/test_importacao_sdf_fluxo.py` (novo), os
    testes do histórico que montam `LinhaHistoricoExecucao`
  - O que muda: `descricao` em `LinhaHistoricoExecucao`, no select de `listar_resultados` e em
    `ResultadoNaDataResponse`. Teste de integração: importar o exemplo real e consultar a General Results traz a data
    21/10, `ultimo_sdf_por_modelo` com `123456-789012` no `SM-S948B` e a descrição; com uma execução de 25/10 já
    gravada, o relatório de 21/10 entra no histórico sem mudar o último SDF; importar o mesmo arquivo de novo é
    recusado sem gravar.
  - Cobre: CA-01, CA-02, CA-03, CA-04, CA-10
  - Verificação: `uv run pytest -p src.infrastructure.data.session tests/integration/test_importacao_sdf_fluxo.py
    tests/integration/test_historico_form_factor_repository.py` → verde; `uv run pytest` → verde.

## Fase 3: frontend

- [x] **T07. Códigos e textos novos**
  - Arquivos: `modules/projetos/model/projeto.ts`, `core/i18n/resources.ts` e o teste,
    `modules/projetos/utils/formatar-erro-planilha.ts` e o teste
  - O que muda: `ResultadoNaData.descricao` e os códigos novos em `CODIGOS_ERRO_PLANILHA`, com
    `spreadsheetError.<codigo>` e `resultDescription` em inglês, português e coreano; o `formatarErroPlanilha` passa o
    `esperado`. Testes: cada código novo tem texto nos três idiomas; `sdf_one_ui_diferente` mostra o valor lido e o
    esperado.
  - Cobre: CA-18
  - Verificação: `cd frontend && npm test -- resources formatar-erro-planilha` → verde.
- [x] **T08. Toast com os problemas do relatório**
  - Arquivos: `modules/projetos/components/form-factor/AcoesGerenciaFormFactor.tsx` e o teste
  - O que muda: com um 422 de planilha, o toast lista os problemas formatados, com a linha antes de cada um, até 5,
    e "e mais N" para o resto; outros erros ficam como hoje. Testes: dois códigos aparecem juntos (F4 e TC
    desconhecido); com 8 problemas, aparecem 5 e "e mais 3"; um 403 continua com a mensagem da API.
  - Cobre: CA-16, CA-18
  - Verificação: `npm test -- AcoesGerenciaFormFactor` → verde.
- [x] **T09. Descrição na janela do resultado**
  - Arquivos: `modules/projetos/components/resultados-gerais/ResultadoExecucaoModal.tsx` e o teste (ou o teste da
    página que abre a janela)
  - O que muda: a linha "Description" aparece quando o resultado tem descrição e some quando não tem.
  - Cobre: CA-02
  - Verificação: `npm test -- ResultadoExecucaoModal ResultadosGeraisPage` → verde; `npm run lint && npx tsc -b` limpos.

## Fase 4: e2e

- [x] **T10. Fluxo da importação na General Results**
  - Arquivos: `frontend/e2e/resultados-gerais.spec.ts`
  - O que muda: com a API simulada, a importação faz a tabela mostrar o SDF ID do relatório e a janela do resultado
    mostrar a descrição; um 422 com dois códigos mostra os dois problemas no toast.
  - Cobre: CA-03, CA-18
  - Verificação: `npm run e2e -- resultados-gerais` → verde.

## Backlog

- **TC ID repetido no mesmo arquivo:** o mesmo TC duas vezes gera duas execuções iguais, e a General Results mostra a que foi gravada por último. A spec não decide se isso recusa o arquivo (código `sdf_tc_repetido`) ou se a última linha vence. Decidir com a usuária (simplify da Fase 2).
- **Uma consulta de TC por linha:** a importação busca cada TC ID num `obter_por_projeto_tc_id`, como já fazia antes da 060. Um `listar_por_projeto_tc_ids` com `IN` resolve; vale quando os relatórios passarem de algumas centenas de linhas (simplify da Fase 2).
- **Leitura da planilha de Test Cases sem limite de colunas:** o `validar_planilha_projeto` (`importacao_projeto.py`) lê as linhas sem `max_col`, e uma célula perdida na coluna XFD trava a leitura, como acontecia no relatório SDF. O leitor do SDF já limita a 30 colunas (simplify da Fase 1).
- **"Device" e "dispositivo":** a General Results e as mensagens novas usam "device" em português e "디바이스" em coreano; a administração de modelos usa "dispositivo" e "기기". A divergência já existia antes da 060; unificar pede revisar os textos das duas telas (simplify da Fase 3).
- **Duas importações do mesmo SDF ID ao mesmo tempo:** a regra de SDF ID único confere antes de gravar, sem constraint no banco. Duas importações simultâneas do mesmo arquivo (ou um duplo clique) passariam as duas. Resolver com um índice único parcial ou um lock por projeto (code-review).
- **A rodada não confere SDF ID de importação:** a importação recusa um SDF ID já usado numa rodada, mas criar uma rodada ainda não confere as importações (spec 025). Decidir se a regra vale nos dois sentidos (code-review).
- **One UI do projeto em texto livre:** a comparação é pelo número só quando o One UI do projeto é um número ("9.5"). Um projeto cadastrado como "One UI 9.5" recusaria todo relatório. Os projetos de hoje estão como "9.5"; normalizar o cadastro do projeto resolve (code-review).
- **Ordem de gravação sem relationship():** a importação grava antes das execuções por um `flush` no repositório (como o projeto e a rodada fazem). Resultado e execução dependem da ordem do SQLAlchemy; declarar `relationship()` entre os models resolve de vez (code-review).
