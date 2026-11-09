# 020. Histórico e lançamento de resultados Form Factor: Spec

- **Status:** Concluída
- **Data:** 2026-10-25

## Problema
O Form Factor mostra uma matriz resumida com uma linha por Test Case e o resultado mais recente por modelo. O histórico de execuções importadas pelo SDF existe no banco, mas não pode ser consultado como uma lista. Também não há como registrar manualmente PASS/FAIL por modelo. Os filtros e a rolagem da tabela atual dificultam a consulta.

## Objetivo
Manter o Form Factor como visão geral do projeto e oferecer uma lista histórica de todas as rodadas de todos os Test Cases. Permitir registrar rodadas manualmente, preservar cada resultado e corrigir a experiência de filtros e rolagem.

## Histórias de usuário
- Como **membro do projeto**, quero ver um resumo dos resultados mais recentes por TC e modelo para acompanhar rapidamente a cobertura.
- Como **membro do projeto**, quero consultar todas as rodadas de validação para entender como cada resultado evoluiu.
- Como **usuário autorizado**, quero registrar uma rodada manual por TC com resultados para vários modelos para incluir validações feitas fora do relatório SDF.

## Regras de negócio
- RN-01: A visão **Resumo** tem uma linha por Test Case e uma coluna por modelo associado ao projeto.
- RN-02: Cada célula do Resumo mostra o resultado mais recente daquele par Test Case/modelo. Sem resultado, mostra um marcador vazio.
- RN-03: A visão **Results** lista cada rodada de cada TC, inclusive as anteriores. Uma nova rodada não substitui nem apaga resultados existentes.
- RN-03a: Results apresenta uma linha por rodada e uma coluna por modelo associado ao projeto.
- RN-04: Uma rodada manual pertence a um único TC e pode conter resultados para um ou mais modelos associados ao projeto; não é obrigatório preencher todos os modelos. Cada resultado pertence a exatamente um modelo.
- RN-05: Os resultados inseridos manualmente aceitam somente PASS ou FAIL. Resultados importados do SDF continuam preservando os valores que o relatório fornecer.
- RN-06: As rodadas exibem origem (manual ou importação SDF), data e identificador SDF quando disponível. A data de uma rodada manual é preenchida automaticamente no momento do registro.
- RN-07: A consulta mantém filtros por semana/data e responsável. Resumo e Results também oferecem filtros para os dados próprios de suas colunas, inclusive TC, modelo/resultado e identificador SDF quando aplicável.
- RN-08: O filtro de responsável permanece compacto, limita a altura e largura do menu e permite localizar um membro por texto. Ele aceita mais de um responsável, no Resumo e em Results: cada escolha se aplica na hora, "Limpar" desmarca todos e Esc só fecha o menu, mantendo a escolha (seleção múltipla incluída em 2026-10-27).
- RN-09: Tabelas Form Factor usam uma única área de rolagem vertical, mantêm o cabeçalho visível durante a rolagem e não deixam menus de filtro cortados pelo contêiner.
- RN-10: A criação manual exige permissão de escrita de resultados Form Factor; a consulta segue a permissão existente `form_factor.consultar`.
- RN-11: Filtros, paginação e acesso respeitam o escopo do projeto e o isolamento da unidade.

## Critérios de aceite
> Use o formato Dado / Quando / Então. Inclua cenários de falha.

- **CA-01:** Dado um projeto com TCs, modelos e resultados, quando o usuário abre Form Factor, então vê a visão Resumo com uma linha por TC e o resultado mais recente por modelo.
- **CA-02:** Dado um TC com várias rodadas para o mesmo modelo, quando o usuário consulta o Resumo, então a célula mostra a rodada mais recente.
- **CA-03:** Dado um projeto com várias rodadas importadas ou manuais, quando o usuário abre Results, então cada rodada aparece em sua própria linha, com TC, data, origem, SDF ID quando houver e uma coluna de resultado por modelo.
- **CA-04:** Dado um usuário com permissão para registrar resultados, quando ele cria uma rodada manual para um TC e informa PASS/FAIL para modelos, então a rodada e todos os resultados são persistidos e aparecem em Results e no Resumo.
- **CA-05:** Dado um resultado mais antigo e uma rodada manual mais recente para o mesmo TC/modelo, quando o Resumo é atualizado, então mostra o resultado da rodada manual e Results continua mostrando ambas.
- **CA-06:** Dado Results ou Resumo com dados, quando o usuário filtra por TC, responsável, data/semana, modelo/resultado ou SDF ID conforme a visão, então somente os itens correspondentes são listados e a paginação reinicia na primeira página.
- **CA-07:** Dado um filtro de responsável com muitos membros, quando o usuário abre o filtro, então o menu permanece dentro da tela, tem dimensões limitadas e permite buscar pelo identificador/nome; quando marca dois responsáveis, então aparecem os itens de qualquer um deles, e a busca esconde opções sem desmarcar as já escolhidas.
- **CA-08:** Dada uma tabela com muitas linhas, quando o usuário rola os resultados, então a rolagem vertical acontece em uma única região e o cabeçalho continua visível.
- **CA-09 (falha):** Dado um usuário sem permissão de registrar resultados, quando tenta criar uma rodada manual pela API, então a operação é recusada e nenhum resultado é gravado.
- **CA-10 (falha):** Dado um lançamento manual com resultado diferente de PASS/FAIL, sem TC válido, com modelo não associado ao projeto ou sem nenhum resultado, quando é enviado, então a API rejeita a rodada e não persiste dados parciais.
- **CA-11 (falha):** Dado um usuário que não tem acesso ao projeto ou uma referência de outra unidade, quando consulta ou tenta registrar resultados, então a operação é recusada sem revelar dados.

## Fora de escopo
- Editar ou excluir rodadas e resultados já registrados.
- Alterar o formato de importação do SDF ou reescrever o histórico importado.
- Criar ou associar modelos ao projeto nesta tela.
- Consolidar resultados em percentuais ou métricas de aprovação.
