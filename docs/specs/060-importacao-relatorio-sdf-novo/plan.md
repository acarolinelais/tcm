# 060. Importação do relatório SDF no formato novo: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0007, 0010, 0012, 0013, 0015, 0033, 0046
- **ADRs novos propostos:** nenhum

## Abordagem

O parser `validar_relatorio_sdf` passa a ler o formato novo, e o formato antigo deixa de ser aceito (RN-01). Ele
recebe o nome do arquivo e o conteúdo. Do nome sai o SDF ID; do cabeçalho saem o device (C4) e a data (F4); da
tabela da linha 7 em diante saem os resultados. As linhas de preparação são descartadas.

A importação junta os erros do arquivo com os erros contra o projeto: TC ID fora do projeto, device não associado,
One UI diferente e SDF ID já usado. Tudo sai num único 422, com os códigos do ADR 0033, e nada é gravado
(RN-12, CA-18). Hoje esses erros do projeto saem como 409, um de cada vez; eles passam a sair juntos, no 422.

A descrição de cada linha é guardada no resultado, numa coluna nova, e aparece na janela do resultado (RN-10).
Cada TC do arquivo vira uma execução, como hoje, com um resultado só: o do device do C4.

No frontend, os códigos novos ganham texto nos três idiomas. O toast da importação passa a listar os problemas,
e a janela do resultado mostra a descrição. Nada muda na tela de permissões nem em quem pode importar (RN-13).

## Modelo de dados

| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| `ResultadoFormFactor` (`resultados_form_factor`) | `descricao` (novo) | `TEXT`, nulo | Sem espaços e tabs nas pontas; vazio vira nulo; no máximo 2000 caracteres |

Migration nova, com `down_revision = "e038b1c2d3e4"` (o head atual da `dev`), aplicada na subida da API (ADR 0012).
Ela só acrescenta a coluna, então os resultados antigos ficam com `descricao` nula.

`ExecucaoSdf` não muda. O SDF ID vai em `execucao.sdf_id`, como hoje, e a data, em `data_reportada`.

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| POST | `/api/projetos/{projeto_id}/relatorios-sdf` | `multipart/form-data` com `arquivo` (o nome do arquivo agora é usado) | 201 `ImportarRelatorioSdfResponse` (sem mudança) | 403 sem perfil ou permissão; 404 projeto fora do escopo; **422** ProblemDetails com `errors[]` (ADR 0033) para qualquer problema do arquivo ou contra o projeto |
| GET | `/api/form-factor/general/projetos/{id}/historico` | sem mudança | `ResultadoNaDataResponse` ganha `descricao: str \| None` | sem mudança |
| GET | `/api/form-factor/general/casos/{id}/execucoes` | sem mudança | `ExecucaoNaDataResponse` ganha `descricao` (herdado) | sem mudança |

Códigos novos do 422 (`codigo`, com `linha`, `coluna`, `valor` e `parametros`):

| Código | Quando | `linha` / `coluna` |
|---|---|---|
| `sdf_nome_sem_id` | Nome do arquivo sem texto antes do primeiro "_", ou com mais de 50 caracteres antes dele | nula / nula, `valor` = nome |
| `sdf_formato_invalido` | Não é o formato novo: falta o cabeçalho da linha 7 (Script Name, State) ou o bloco de C4/F4 | nula |
| `sdf_data_invalida` | F4 vazia ou fora do formato mês/dia/ano hora AM/PM | nula / `F4`, `valor` = texto lido |
| `sdf_one_ui_invalido` | Test File Path sem "OneUI" seguido de dígitos | linha / `Test File Path` |
| `valor_obrigatorio` (já existe) | Linha sem Script Name ou sem State | linha / coluna vazia |
| `texto_muito_longo` (já existe) | SDF ID com mais de 50 caracteres, State com mais de 40 ou Description com mais de 2000 | linha / coluna, `parametros.maximo` |
| `sdf_sem_resultados` | Só linhas de preparação, ou nenhuma linha | nula |
| `sdf_tc_fora_do_projeto` | TC ID (sem `.py`) que não é do projeto | linha / `Script Name`, `valor` = TC ID |
| `sdf_device_fora_do_projeto` | C4 não é o nome de um modelo ativo do projeto | nula / `C4`, `valor` = device |
| `sdf_one_ui_diferente` | One UI da linha diferente do projeto, comparado pelo número | linha / `Test File Path`, `parametros.esperado` |
| `sdf_id_repetido` | SDF ID já usado no projeto, numa rodada ativa ou numa importação ativa | nula, `valor` = SDF ID |
| `arquivo_invalido` (já existe) | Não é um Excel que dê para abrir | nula |

## Backend: arquivos

- `application/validators/relatorio_sdf.py`: reescrito para o formato novo.
  - `ler_relatorio_sdf(nome_arquivo, conteudo) -> RelatorioSdfLido`, com `sdf_id`, `device`, `data_execucao`,
    `linhas` (`linha`, `tc_id`, `resultado`, `descricao`, `one_ui`) e `erros`. Ele não levanta exceção por erro de
    conteúdo, para o service juntar os erros do projeto (CA-18); levanta só quando o arquivo não abre.
  - Helpers puros e testáveis: `sdf_id_do_nome`, `converter_data_f4` (tira espaços duplos e a quebra de linha e lê
    `%m/%d/%Y %I:%M:%S %p`), `one_ui_do_caminho` (regra da RN-08) e `tc_id_do_script` (tira o `.py`).
  - Os cabeçalhos são achados pelo texto normalizado da linha 7 (`_normalizar_cabecalho`, que já existe), não por
    letra fixa de coluna, e os espaços sobrando não atrapalham.
  - Saem `LinhaRelatorioSdf` antiga, os aliases do formato antigo e `_converter_data`.
- `application/services/importacao_sdf_service.py`: `importar(usuario, projeto_id, nome_arquivo, conteudo)`.
  Ele lê o arquivo, valida contra o projeto e junta os erros. Se houver algum erro, levanta `RelatorioSdfInvalido`
  e nada é gravado; senão grava a importação, uma execução por TC e um resultado com a descrição, com um `commit`
  (ADR 0004). A comparação do One UI é feita por `Decimal`.
- `application/services/interfaces/importacao_sdf_service.py` e `api/routers/projetos.py`: passam o `arquivo.filename`.
- `domain/entities/resultado_form_factor.py`: `descricao` opcional, com a regra da tabela acima.
- `infrastructure/data/models/resultado_form_factor_model.py` e a migration nova: a coluna `descricao`.
- `domain/entities/interfaces/execucao_sdf_repository.py` e a implementação: `existe_sdf_id_importado_no_projeto`
  (execução ativa de importação ativa do projeto, com o SDF ID comparado sem maiúsculas e sem espaços nas pontas,
  como no `existe_sdf_id_no_projeto` das rodadas). O service consulta as duas.
- `domain/queries/historico_form_factor.py`, `infrastructure/repositories/historico_form_factor_repository.py` e
  `application/schemas/form_factor_historico.py`: `descricao` em `LinhaHistoricoExecucao`, no select de
  `listar_resultados` e em `ResultadoNaDataResponse`.
- `tests/fixtures/sdf/123456-789012_0_Test_1_Detail.xlsx`: cópia do exemplo real da spec. Os outros casos são montados
  com openpyxl no próprio teste, como os testes de planilha já fazem.
- Testes:
  - `tests/unit/application/validators/test_relatorio_sdf.py`: reescrito (helpers, exemplo real, erros);
  - `tests/unit/application/services/test_importacao_sdf_service.py`: erros do projeto e junção dos erros;
  - `tests/integration/test_importacao_sdf_fluxo.py` (novo): o exemplo real gravado no Postgres e consultado pela
    General Results;
  - `tests/functional/test_form_factor_api.py`: o 422 com os códigos.

## Frontend: arquivos

- `modules/projetos/model/projeto.ts`: `ResultadoNaData.descricao?: string | null` e os códigos novos em
  `CODIGOS_ERRO_PLANILHA`.
- `core/i18n/resources.ts` e o teste: `spreadsheetError.<codigo>` dos códigos novos e `resultDescription`
  ("Description", "Descrição", "설명"), nos três idiomas.
- `modules/projetos/utils/formatar-erro-planilha.ts`: os parâmetros novos (`esperado`).
- `modules/projetos/components/form-factor/AcoesGerenciaFormFactor.tsx` e o teste: com um 422 de planilha, o toast
  mostra os problemas formatados pelo `errosDaApi` e pelo `formatarErroPlanilha`, com a linha antes de cada um. Até 5
  problemas aparecem e o resto vira "e mais N"; sem 422, a mensagem fica como hoje.
- `modules/projetos/components/resultados-gerais/ResultadoExecucaoModal.tsx` e o teste: a linha "Description"
  aparece quando o resultado tem descrição.
- `e2e/resultados-gerais.spec.ts`: a importação com a API simulada devolve a descrição, a janela mostra a descrição,
  e um 422 com dois códigos mostra os dois problemas.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Integração | O exemplo real grava 9 execuções no `SM-S948B`, com SDF `123456-789012`, data 21/10/2026 e descrição |
| CA-02 | Unidade + Vitest | `descricao` sem o tab; a janela do resultado mostra a descrição |
| CA-03 | Integração + e2e | Depois de importar, o histórico do projeto traz a data 21/10, o último SDF do device e a descrição; no e2e, a tabela atualiza |
| CA-04 | Integração | Execução de 25/10 já gravada: importar um relatório de 21/10 não muda `ultimo_sdf_por_modelo` |
| CA-05 | Unidade | `HQ_precondition.py` e `Setup.py` são descartados em qualquer posição |
| CA-06 | Unidade | State `check` e `N/A` são aceitos como vieram |
| CA-07 | Unidade | `converter_data_f4("10/21/2026  \n6:43:35 PM")` dá 2026-10-21 18:43:35 |
| CA-08 | Unidade | Planilha no formato antigo dá `sdf_formato_invalido` |
| CA-09 | Unidade | `Detail.xlsx` e `_0_Test_1_Detail.xlsx` dão `sdf_nome_sem_id` |
| CA-10 | Unidade + integração | SDF repetido numa rodada e numa importação (com outras maiúsculas) dá `sdf_id_repetido`, e nada é gravado |
| CA-11 | Unidade | C4 fora do projeto dá `sdf_device_fora_do_projeto` |
| CA-12 | Unidade | F4 vazia ou com texto dá `sdf_data_invalida` |
| CA-13 | Unidade | Test File Path sem "OneUI" e dígitos dá `sdf_one_ui_invalido` com a linha |
| CA-14 | Unidade | `OneUI80` num projeto 9.5 dá `sdf_one_ui_diferente` |
| CA-15 | Unidade | `one_ui_do_caminho`: `OneUI95`, `OneUI10` e `OneUI105`; `10` bate com o projeto `10.0` |
| CA-16 | Unidade + integração | TC fora do projeto dá `sdf_tc_fora_do_projeto` com a linha, e nada é gravado |
| CA-17 | Unidade | Só linhas de preparação dá `sdf_sem_resultados` |
| CA-18 | Unidade + funcional + Vitest | F4 inválida e TC desconhecido saem juntos no 422; o toast mostra os dois |

## Riscos e decisões pendentes

- **Fuso da data:** a F4 vem sem fuso, e ela é gravada como chega, igual à data do formato antigo. A General Results
  tira o dia no fuso de quem consulta, então uma execução que começa entre 0h e 2h59 (horário de Brasília) cai no dia
  anterior; a simulação de 2026-11-04 confirmou. Decidido com a usuária no mesmo dia: fica assim, porque as execuções
  rodam no horário de trabalho. Se um dia rodarem de madrugada, a importação passa a mandar o fuso de quem importa.
- **Mock do frontend:** o `mockFormFactorApi.importar` não lê o Excel hoje e continua assim (ADR 0030). No modo mock,
  a importação não muda a tabela. Os e2e usam a API simulada por rota, não o mock.
- **Status da resposta:** os erros contra o projeto deixam de ser 409 e passam a sair no 422 da planilha, com código.
  Só a tela de importação lê esses erros.
- **Descrição longa:** o limite de 2000 caracteres não aparece no arquivo de exemplo, onde a maior descrição tem uns
  90. Passar do limite recusa o arquivo com `valor_invalido` na linha, em vez de cortar o texto.
