# 033. Paginação na tela Resultados Gerais: Spec

- **Status:** Concluída
- **Data:** 2026-10-29
- **ADRs relacionados:** 0004, 0022, 0034, 0039 (substitui 0038)
- **Altera:** a RN-02 da spec 032 ("todos os Test Cases, sem paginação")

## Problema

Cada aba da tela Resultados Gerais lista todos os Test Cases do projeto de uma vez. Num projeto com centenas de
casos (ex.: 800), a lista fica longa demais: é difícil achar um caso, o cabeçalho de datas some ao rolar e a tela
demora mais para carregar. Todas as outras listagens do sistema já são paginadas.

## Objetivo

Cada aba passa a mostrar os Test Cases em páginas, como as outras listagens, sem mudar as colunas de data nem o
restante do comportamento da spec 032.

## Histórias de usuário

- Como **gerente, KP ou administrador**, quero navegar pelos casos de um projeto grande página por página para
  achar um caso sem rolar centenas de linhas.
- Como **gestão**, quero escolher quantos casos ver por página, como nas outras listagens.

## Regras de negócio

Todas as regras da spec 032 continuam valendo, exceto a RN-02, que passa a ser a RN-01 abaixo.

- RN-01: Cada aba lista os Test Cases do projeto em páginas de **20 casos** por padrão, na mesma ordem de hoje
  (por TC ID). A pessoa pode escolher 10, 20, 50 ou 100 por página, como nas outras listagens.
- RN-02: O rodapé mostra a página atual, o total de páginas e o total de casos encontrados, com os controles para
  ir à página anterior e à próxima.
- RN-03: As **colunas de data** (até 7) e a lista de **modelos** são as mesmas em todas as páginas: elas
  consideram todos os casos do projeto que passam pela busca, pelos filtros e pelo calendário, e não só os da
  página. Trocar de página nunca muda as colunas.
- RN-04: Buscar, filtrar, escolher um dia ou uma semana, limpar os filtros, trocar o tamanho da página ou trocar
  de aba volta para a **página 1**.
- RN-05: O modelo escolhido numa linha (RN-03 da spec 032) continua escolhido ao ir para outra página e voltar;
  a escolha é perdida ao trocar de aba ou recarregar, como hoje.
- RN-06: Um caso sem execução continua aparecendo, com as células de data vazias, na página em que cair pela
  ordem.

## Critérios de aceite

> Formato Dado / Quando / Então. Os de falha trazem `(falha)`.

- **CA-01:** Dado um projeto com 45 casos, quando o gerente abre a aba, então vê os 20 primeiros casos por TC ID
  e o rodapé indica página 1 de 3 e 45 casos.
- **CA-02:** Dado a aba na página 1, quando a pessoa vai para a página 3, então vê os 5 últimos casos, com as
  mesmas colunas de data da página 1.
- **CA-03:** Dado um projeto em que só os casos da página 3 tiveram execução numa data, quando a pessoa está na
  página 1, então a coluna dessa data aparece mesmo assim (com as células da página vazias).
- **CA-04:** Dado a aba na página 2, quando a pessoa busca, filtra por TC ID ou Form Factor, escolhe um dia ou
  semana, limpa os filtros ou troca o tamanho da página, então a tabela volta para a página 1.
- **CA-05:** Dado a aba de um projeto na página 2, quando a pessoa troca para outra aba, então a nova aba abre
  na página 1.
- **CA-06:** Dado a pessoa escolheu outro modelo numa linha da página 1, quando vai para a página 2 e volta,
  então a linha continua com o modelo escolhido.
- **CA-07:** Dado a pessoa escolheu 50 por página, quando a aba tem 45 casos, então todos aparecem numa página
  só e o rodapé indica página 1 de 1.
- **CA-08 (falha):** Dado um pedido de página menor que 1 ou de tamanho fora do intervalo de 1 a 100, quando o
  sistema recebe a consulta, então recusa e informa o campo inválido.
- **CA-09 (falha):** Dado um pedido de uma página além da última, quando o sistema recebe a consulta, então
  devolve a página sem casos, com o total correto e as mesmas colunas de data.
- **CA-10 (falha):** Dado um projeto fora do escopo do usuário, quando ele pede qualquer página desse projeto,
  então o sistema recusa como hoje, sem revelar o total de casos.

## Fora de escopo

- Mudar as colunas de data (continua o limite de 7) ou o filtro de dia/semana.
- Paginar o painel Resumo de execuções de um caso.
- Guardar a página ou o tamanho escolhido entre visitas (na URL ou nas preferências da conta).
- Virtualizar as linhas da tabela.

## Dúvidas em aberto

- Nenhuma.
