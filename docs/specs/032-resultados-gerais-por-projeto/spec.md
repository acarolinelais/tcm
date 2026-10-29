# 032. Resultados Gerais por projeto, com histórico de execuções por data: Spec

- **Status:** Aprovada
- **Data:** 2026-10-28
- **ADRs relacionados:** 0004, 0006, 0010, 0013, 0015, 0022, 0034, 0036, 0037
- **Substitui:** o layout da spec 021 (Resumo e Ver todos os resultados)
- **Figma:** TCM, node `2444-1223` (General Results); `2444-3451` (modal); `2436-259` (rascunho do Resumo de
  execuções)

## Problema

A tela de Resultados Gerais mistura os Test Cases de todos os projetos numa lista só, com uma coluna para cada
modelo de todos os projetos, e mostra só o resultado mais recente. Para acompanhar a evolução de um caso, a
gestão precisa trocar de visão e procurar execução por execução. O protótipo novo organiza os resultados por
projeto e por data, para ver de relance como cada caso se comportou nos últimos dias em cada modelo.

## Objetivo

A tela passa a ter uma aba por projeto. Cada aba lista todos os Test Cases do projeto, com uma coluna por data
de execução recente, e cada linha mostra os resultados de um modelo por vez, escolhido na própria linha. O
histórico completo de um caso fica a um clique.

## Histórias de usuário

- Como **gerente, KP ou administrador**, quero ver os resultados de cada caso por data para acompanhar se ele
  estabilizou ou voltou a falhar.
- Como **gestão**, quero comparar modelos de um mesmo caso trocando o modelo da linha, sem perder a escolha
  feita nas outras linhas.
- Como **gestão**, quero abrir o histórico completo de um caso, com todos os modelos, para entender uma falha.

## Regras de negócio

**Continuam da spec 021:** RN-01 (perfis autorizados), RN-02 (escopo organizacional e só projetos ativos),
RN-10 (somente consulta) e o isolamento por unidade. **Deixam de valer:** RN-03 a RN-09 (visão Resumo, coluna de
projeto, união de modelos com N/A, visão por execução, filtros dessas visões, paginação e rolagem pela união de
modelos) e RN-11 (abrir o projeto pelo nome: a tela não leva mais à página do projeto).

- RN-01: A tela tem **uma aba por projeto** ativo acessível ao usuário, com o **nome do projeto** (ex.: "Clock
  9.5"). Sem projeto acessível, a tela mostra o estado vazio.
- RN-02: Cada aba lista **todos os Test Cases** do projeto, um por linha, **sem paginação**. Um caso sem nenhuma
  execução aparece com as células de data vazias.
- RN-03: A coluna **Form Factor** de cada linha tem uma lista com os modelos associados ao projeto e mostra um
  modelo por vez. A escolha vale só para aquela linha e é perdida ao trocar de aba ou ao recarregar.
- RN-04: Antes da escolha, a linha mostra **o modelo da execução mais recente** daquele caso. Sem execução, o
  primeiro modelo do projeto, em ordem alfabética (a mesma das outras telas de Form Factor).
- RN-05: Há uma coluna por data em que houve execução no projeto, da mais recente (à esquerda) para a mais
  antiga. Uma importação com data nova cria a coluna sem outra ação. As colunas TC ID e Form Factor ficam fixas
  ao rolar para os lados.
- RN-06: A tabela mostra no máximo as **7 datas mais recentes**. Não há navegação para datas anteriores: as mais
  antigas aparecem só ao filtrar um dia ou uma semana (RN-11).
- RN-07: Cada célula mostra o resultado (Pass, Fail ou o valor como veio) do modelo escolhido na linha, naquela
  data. Sem execução desse modelo nessa data, a célula fica com o marcador vazio das outras tabelas. Entram as
  execuções importadas e as manuais. Com duas execuções do mesmo modelo no mesmo dia, a célula mostra a mais
  recente.
- RN-08: O título de cada coluna de data mostra a dica **"SDF Result"** ao passar o mouse ou focar pelo teclado.
- RN-09: Clicar no resultado abre uma janela com o TC ID, o device e a data no título, e o **SDF ID** e a
  **origem** ("Importado da planilha" ou "Adicionado manualmente") no corpo, com um único botão **Fechar**. Sem
  SDF ID, aparece o marcador vazio. Não há link para o site do SDF.
- RN-10: A **busca** (lupa) encontra casos pelo **ID do tester** (o dev responsável), pelo **SDF ID** ou pelo
  **device**. A busca por device encontra os casos com ao menos uma execução daquele modelo, e as linhas
  encontradas já vêm com ele escolhido.
- RN-10a: Os cabeçalhos **TC ID** e **Form Factor** têm filtro, como nas outras tabelas: TC ID por texto e Form
  Factor por modelo (mesma regra da busca por device). As colunas de data e Actions não têm filtro.
- RN-11: O **calendário** filtra por **um dia** ou por **uma semana**. Com o filtro, a tabela lista só os casos
  com execução no período e só as colunas de data dele (até 7). Ele substitui o filtro de semana atual.
- RN-12: Limpar a busca, os filtros e o calendário volta às 7 datas mais recentes e a todos os casos.
- RN-13: A ação **Resumo de execuções** da linha abre um painel com o ID do tester no topo e uma **grade com
  todos os devices do projeto nas linhas e todas as datas do caso nas colunas, em ordem cronológica**. Cada
  célula mostra o resultado; clicar nele abre a janela da RN-09. Com duas execuções do mesmo device no mesmo
  dia, a célula mostra as duas.
- RN-14: A tela é somente consulta: não importa, não edita e não exclui resultado.

## Critérios de aceite

> Formato Dado / Quando / Então. Os de falha trazem `(falha)`.

- **CA-01:** Dado um gerente com dois projetos no escopo, quando abre a tela, então vê uma aba com o nome de
  cada projeto, e a primeira lista todos os casos desse projeto, sem paginação.
- **CA-02 (falha):** Dado um projeto fora do escopo do usuário, quando ele abre a tela ou busca por um caso
  desse projeto, então o projeto não aparece em nenhuma aba nem no resultado.
- **CA-03:** Dado execuções em 10 datas diferentes, quando a aba abre, então aparecem só as 7 mais recentes, da
  mais nova para a mais antiga, sem controle para ir às anteriores.
- **CA-04:** Dado uma importação com data nova, quando a tela é recarregada, então a data nova é a primeira
  coluna.
- **CA-05:** Dado um caso cuja execução mais recente foi no S27, quando a linha aparece, então o Form Factor
  mostra S27 e as células mostram os resultados do S27.
- **CA-06:** Dado duas linhas, quando a pessoa escolhe S26 na primeira e S27 na segunda, então cada linha mostra
  os resultados do seu modelo, e a escolha de uma não muda a outra.
- **CA-07 (falha):** Dado um modelo escolhido que não executou o caso numa data, quando a célula aparece, então
  ela mostra o marcador vazio, e não o resultado de outro modelo.
- **CA-08:** Dado uma execução manual e uma importada do mesmo modelo no mesmo dia, quando a célula da tabela
  aparece, então mostra a mais recente, e a célula do Resumo de execuções mostra as duas.
- **CA-09:** Dado um resultado na tabela, quando a pessoa clica nele (ou usa o teclado), então abre a janela com
  o SDF ID, a origem e só o botão Fechar; numa execução manual sem SDF ID, aparece o marcador vazio.
- **CA-10:** Dado a busca por um SDF ID, por um ID de tester ou por um device, quando aplicada, então só os
  casos correspondentes aparecem; na busca por device, as linhas já vêm nesse modelo.
- **CA-10a:** Dado o filtro do cabeçalho Form Factor com o S26, quando aplicado, então só os casos com execução
  no S26 aparecem, já com o S26 escolhido; o filtro de TC ID encontra o caso pelo identificador.
- **CA-11 (falha):** Dado uma busca ou um filtro sem correspondência, quando aplicado, então a tabela mostra o
  estado de "nenhum resultado" com a opção de limpar.
- **CA-12:** Dado um dia ou uma semana antigos escolhidos no calendário, quando aplicados, então aparecem só os
  casos com execução no período e só as colunas de data dele; limpar volta às 7 datas mais recentes.
- **CA-13:** Dado um caso, quando a pessoa abre o Resumo de execuções, então vê o ID do tester e a grade com
  todos os devices do projeto e todas as datas do caso, em ordem cronológica; clicar num resultado abre a janela
  com o SDF ID e a origem.
- **CA-14 (falha):** Dado que a consulta falhou, quando a aba carrega, então a tabela mostra o erro com a opção
  de tentar de novo.
- **CA-15:** Dado a dica "SDF Result", quando o foco do teclado chega ao título de uma coluna de data, então a
  dica aparece, como ao passar o mouse.

## Fora de escopo

- Mudar o formato da planilha SDF ou a importação (outra spec).
- Link para o site do SDF e atalho para a página do projeto.
- Importar, registrar, editar ou excluir resultados nesta tela.
- Exportar a tabela.
- As telas de Form Factor dentro do projeto (Resumo e Resultados da spec 022), que continuam como estão.

## Dúvidas em aberto

Nenhuma. Decisões de 2026-10-28:

- O botão **Filter** saiu do Figma; a lupa busca por ID do tester, SDF ID e device (RN-10). Só TC ID e Form
  Factor têm filtro no cabeçalho (RN-10a).
- **No máximo 7 datas**, sem navegação; as anteriores só pelo calendário, que filtra **dia ou semana** (RN-06 e
  RN-11). O Figma mostra 8 colunas; vale a decisão da usuária.
- **Sem paginação** de Test Cases (RN-02). Isso foge do padrão de 20 por página (ADRs 0022 e 0034): o `plan.md`
  propõe um ADR para a exceção.
- Janela do resultado com **só o botão Fechar** (RN-09); a aba usa o **nome do projeto** (RN-01); sem atalho
  para a página do projeto.
- Resumo de execuções em **grade** devices × datas, com o detalhe ao clicar (RN-13).
- Busca e filtro por device: casos com ao menos uma execução daquele modelo; modelo padrão sem execução: o
  primeiro do projeto (RN-04 e RN-10).
