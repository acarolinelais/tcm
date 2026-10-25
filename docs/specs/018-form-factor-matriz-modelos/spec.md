# 018. Form Factor em matriz por modelo: Spec

- **Status:** Concluída
- **Data:** 2026-10-25

## Problema
A aba Form Factor lista uma linha por resultado importado do SDF: o mesmo Test Case se repete uma vez para
cada modelo e para cada importação. Para saber se um caso passou em todos os modelos do projeto, a pessoa
precisa juntar várias linhas de cabeça. Os casos que ainda não têm resultado não aparecem, e não há como
ver só os casos de um responsável.

## Objetivo
Exibir o Form Factor como uma matriz: uma linha por Test Case do projeto e uma coluna por modelo de
dispositivo vinculado ao projeto, com o resultado mais recente de cada caso em cada modelo. A aba ganha o
filtro por Assignee, igual ao da aba Test Cases, e deixa de exibir a versão de One UI.

## Histórias de usuário
- Como **gerente ou KP**, quero ver numa linha só o resultado de um Test Case em cada modelo do projeto
  para identificar rapidamente onde ele falhou.
- Como **gerente ou KP**, quero filtrar o Form Factor por Assignee para acompanhar os resultados de uma
  pessoa do time.
- Como **membro do time**, quero ver quais Test Cases ainda não têm resultado em algum modelo.

## Regras de negócio
- RN-01: Cada Test Case ativo do projeto é uma linha da aba Form Factor, tenha ou não resultado
  importado. As linhas são ordenadas pelo TC ID.
- RN-02: As colunas são, nesta ordem: TC ID, SDF ID, Assignee, uma coluna para cada modelo de dispositivo
  vinculado ao projeto e Date. O cabeçalho de cada coluna de modelo é o nome do modelo (ex.: "SAMSUNG
  S25", "SAMSUNG S26"), e as colunas de modelo seguem a ordem alfabética desses nomes.
- RN-03: A célula de um modelo mostra o resultado mais recente (pela data reportada) daquele Test Case
  naquele modelo, preservando o valor informado pelo SDF. Os resultados `Pass` e `Fail` têm indicação
  visual distinta; outros valores aparecem como texto. Sem resultado, a célula mostra "—".
- RN-04: SDF ID mostra o identificador da execução SDF mais recente do Test Case; Date mostra a data
  reportada mais recente entre os resultados exibidos na linha. Sem resultado, ambas mostram "—".
- RN-05: Assignee mostra o responsável principal do Test Case. O filtro da coluna Assignee oferece "All"
  e os membros ativos do time do projeto, como na aba Test Cases, e volta para a primeira página ao mudar.
- RN-06: Com uma semana selecionada no filtro de semana (RN-20 da spec 011), só contam os resultados
  reportados naquela semana: aparecem apenas os Test Cases com algum resultado na semana, e cada célula
  mostra o resultado mais recente dentro da semana. Os filtros de semana e Assignee se combinam.
- RN-07: A coluna One UI deixa de ser exibida. A versão continua registrada em cada execução importada.
- RN-08: Os resultados de importações anteriores continuam guardados; a matriz apenas escolhe o mais
  recente para exibir. Resultados de modelos que não estão mais vinculados ao projeto não aparecem.
- RN-09: A paginação é por Test Case, com 20 linhas por página por padrão.
- RN-10: Quem pode consultar o Form Factor e em quais projetos não muda (spec 011 e 012).

## Critérios de aceite
- **CA-01:** Dado um projeto com 3 Test Cases e os modelos "SAMSUNG S25" e "SAMSUNG S26", sem nenhum
  relatório SDF importado, quando a pessoa abre a aba Form Factor, então vê 3 linhas com TC ID e Assignee
  preenchidos, colunas "SAMSUNG S25" e "SAMSUNG S26" e "—" nas células de modelo, SDF ID e Date.
- **CA-02:** Dado um Test Case com resultado `Pass` em S25 e `Fail` em S26 no mesmo relatório, quando a
  aba é exibida, então a linha do caso mostra `Pass` na coluna S25, `Fail` na coluna S26, o SDF ID e a data
  reportada desse relatório, cada resultado com sua indicação visual.
- **CA-03:** Dado um Test Case com `Fail` em S25 num relatório antigo e `Pass` em S25 num relatório mais
  recente, quando a aba é exibida, então a célula S25 mostra `Pass`, o SDF ID e a Date são os do relatório
  mais recente, e o caso aparece numa única linha.
- **CA-04:** Dado um projeto, quando a aba Form Factor é exibida, então não existe coluna One UI.
- **CA-05:** Dados casos atribuídos a pessoas diferentes, quando a pessoa escolhe um membro no filtro
  Assignee, então só os casos com esse responsável principal são listados e a paginação volta para a
  página 1.
- **CA-06:** Dado um caso com resultado reportado na semana selecionada e outro só com resultados em
  outras semanas, quando a semana é aplicada, então só o primeiro caso aparece, com o resultado mais
  recente daquela semana.
- **CA-07:** Dado um projeto com 25 Test Cases, quando a aba é aberta, então a primeira página mostra 20
  casos e a segunda mostra 5, cada caso numa linha só, independentemente de quantos modelos e resultados
  ele tenha.
- **CA-08 (falha):** Dado um filtro de Assignee ou semana sem nenhum caso correspondente, quando ele é
  aplicado, então a tela informa que nenhum caso corresponde aos filtros e oferece limpar os filtros.
- **CA-09 (falha):** Dado um projeto inexistente, de outra unidade ou fora do escopo da pessoa, quando ela
  consulta o Form Factor, então a consulta é recusada como projeto não encontrado.
- **CA-10 (falha):** Dada uma pessoa sem permissão de consultar o Form Factor, quando ela tenta consultar,
  então a consulta é recusada por falta de permissão.
- **CA-11 (falha):** Dado um valor de semana ou de Assignee em formato inválido, quando a consulta é feita,
  então ela é recusada e a validação informa o campo inválido.

## Fora de escopo
- Mudanças no SDF ID (origem, formato ou detalhamento); fica para uma spec própria.
- Ver o histórico de resultados de um caso num modelo (só o mais recente é exibido).
- Filtros por modelo, por resultado ou por TC ID na aba Form Factor.
- Mudanças na importação do relatório SDF ou no formato da planilha.
- Edição manual de resultados.
- Exportar a matriz.

## Dúvidas em aberto
- Nenhuma.
