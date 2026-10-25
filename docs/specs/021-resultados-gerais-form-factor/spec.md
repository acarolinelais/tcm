# 021. Resultados gerais de Form Factor: Spec

- **Status:** Concluída
- **Data:** 2026-10-25

## Problema
Hoje é necessário abrir cada projeto para consultar seus resultados de Form Factor. Isso dificulta acompanhar a validação SDF como um todo e comparar a situação entre projetos.

## Objetivo
Disponibilizar uma tela única de Resultados Gerais que reúna os Form Factors dos projetos acessíveis ao usuário. A tela oferece um Resumo dos resultados mais recentes e uma visão para consultar todas as rodadas registradas.

## Histórias de usuário
- Como **membro com acesso a Form Factor**, quero consultar resultados de vários projetos numa tela única para localizar rapidamente os Test Cases que precisam de atenção.
- Como **membro com acesso a Form Factor**, quero alternar entre o resultado mais recente e o histórico completo para acompanhar a evolução das validações.
- Como **membro com acesso a Form Factor**, quero identificar o projeto e os modelos aplicáveis a cada Test Case para interpretar os resultados sem confundir ausência de resultado com modelo não utilizado.

## Regras de negócio
- RN-01: A navegação apresenta uma opção **Resultados Gerais** (General Results), disponível somente para perfis **Gerente** e **KP** com permissão de consulta de Form Factor.
- RN-02: A tela reúne dados apenas dos projetos ativos aos quais o perfil atual tem acesso: o Gerente consulta projetos dos setores sob sua gestão e o KP consulta projetos dos seus times.
- RN-03: A visão **Resumo** apresenta uma linha por Test Case e o resultado mais recente de cada modelo aplicável ao projeto daquele caso.
- RN-04: O Resumo inclui uma coluna de Projeto para distinguir Test Cases com identificadores iguais em projetos diferentes.
- RN-05: As colunas de modelos formam a união dos modelos usados nos projetos presentes no resultado. Para cada linha, modelo não associado ao projeto é indicado como **N/A**; modelo associado sem resultado é indicado como vazio.
- RN-06: Sem filtro de semana, o Resumo inclui Test Cases dos projetos acessíveis mesmo quando ainda não têm resultado. Com filtro de semana, lista os casos com ao menos um resultado naquela semana e mostra, por modelo, o resultado mais recente da semana selecionada.
- RN-07: A visão **Ver todos os resultados** apresenta uma linha por execução registrada, com projeto, Test Case, responsável, origem, identificador SDF quando disponível, data e resultados por modelo. Rodadas anteriores permanecem visíveis.
- RN-08: As duas visões permitem filtrar por semana, projeto, Test Case, responsável, modelo e resultado. A visão detalhada também permite filtrar por identificador SDF e origem.
- RN-09: Alterar filtros reinicia a paginação. As listas usam paginação, com tamanho inicial de 20 itens, e permitem navegar horizontalmente quando a união de modelos excede a largura disponível.
- RN-10: A tela global é somente para consulta. Importar um relatório SDF ou registrar uma rodada manual continua no contexto do projeto.
- RN-11: O nome do projeto permite abrir seu detalhe para consultar ou executar ações naquele contexto.

## Critérios de aceite
> Use o formato Dado / Quando / Então. Inclua cenários de falha.

- **CA-01:** Dado um usuário Gerente ou KP com permissão de consulta de Form Factor, quando abre Resultados Gerais, então vê a visão Resumo com dados dos projetos acessíveis ao seu perfil e uma coluna que identifica o projeto de cada Test Case.
- **CA-02:** Dado que os projetos acessíveis usam conjuntos diferentes de modelos, quando a tela é exibida, então há uma coluna por modelo da união e cada linha distingue modelos não associados (**N/A**) de modelos associados ainda sem resultado.
- **CA-03:** Dado um Test Case com várias rodadas para o mesmo modelo, quando consulta o Resumo, então vê somente o resultado mais recente por modelo, sem perder os demais resultados do histórico.
- **CA-04:** Dado um usuário com acesso a projetos sem resultado, quando abre o Resumo sem filtro de semana, então os Test Cases desses projetos também aparecem com as células de resultado vazias.
- **CA-05:** Dado um usuário que escolhe uma semana, quando aplica o filtro no Resumo, então são listados os Test Cases com resultados naquela semana e cada célula apresenta o resultado mais recente daquela semana.
- **CA-06:** Dado um usuário que seleciona **Ver todos os resultados**, quando há várias execuções para o mesmo Test Case, então cada execução aparece em sua própria linha com projeto, origem, data e resultados por modelo.
- **CA-07:** Dado uma lista global, quando o usuário filtra por projeto, Test Case, responsável, modelo ou resultado, ou por SDF ID/origem na visão detalhada, então só permanecem os registros correspondentes e a página volta para a primeira.
- **CA-08:** Dado mais resultados do que cabem numa página ou uma quantidade de modelos que exceda a largura da tela, quando o usuário navega pela lista, então consegue acessar todas as páginas e colunas sem perder a relação entre cabeçalho e linha.
- **CA-09 (falha):** Dado um usuário que não seja Gerente ou KP, ou que não tenha permissão de consulta de Form Factor, quando tenta abrir Resultados Gerais ou consultar seus dados, então o acesso é recusado sem revelar projetos ou resultados.
- **CA-10 (falha):** Dado um filtro que não corresponde a nenhum registro, quando é aplicado, então a tela informa que não encontrou resultados e permite limpar os filtros.
- **CA-11 (falha):** Dado projetos ou resultados de outra unidade ou fora do escopo organizacional do usuário, quando a tela é consultada, então esses dados não aparecem, mesmo que um filtro tente alcançá-los.

## Fora de escopo
- Importar relatórios SDF ou registrar/editar resultados manualmente pela tela global.
- Alterar ou excluir execuções e resultados já registrados.
- Criar métricas agregadas de aprovação, percentuais ou dashboards.
- Alterar o comportamento das telas de Form Factor dentro de cada projeto.

## Dúvidas em aberto
- Nenhuma. As colunas por modelo, os perfis autorizados, o escopo organizacional e o modo somente consulta foram confirmados.
