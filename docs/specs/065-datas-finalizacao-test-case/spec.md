# 065. Datas de finalização do Test Case: Spec

- **Status:** Concluída
- **Data:** 2026-11-06
- **Specs relacionadas:** 038 (auditoria, de onde sai o histórico de Status), 058 (tabela de Test Cases em
  Projects), 059 e 060 (resultados por device na General Results e importação do relatório SDF)

## Problema

A tabela de Test Cases mostra o Status atual de cada caso, mas não mostra quando o caso chegou em cada etapa.
Quem gerencia não consegue saber quando o dev terminou de codar um caso nem quando o caso foi validado em todos
os devices do projeto. Hoje isso só sai procurando na auditoria, caso por caso.

## Objetivo

A tabela de Test Cases ganha duas datas: quando o código do caso foi finalizado pela primeira vez e quando todos
os devices do projeto passaram no SDF. As duas são preenchidas pelo sistema, ninguém digita.

## Histórias de usuário

- Como **gerente** ou **KP**, quero ver quando cada dev terminou de codar um caso, para acompanhar o ritmo do time.
- Como **gerente** ou **KP**, quero ver quando cada caso passou em todos os devices, para saber o que está fechado.
- Como **qualquer perfil** que vê a tabela, quero ver as duas datas junto do caso, sem abrir a auditoria.

## Regras de negócio

- RN-01: **Finalização do código** é a data e hora em que o caso entrou no Status In Review pela primeira vez.
  Ela é gravada no momento da mudança de Status, por qualquer caminho que mude o Status (tela do caso, Board ou
  qualquer outro que venha a existir, como as ações em lote da spec 043).
- RN-02: A finalização do código não muda mais depois de gravada. Se o caso volta para In Progress (ou outro
  Status) e entra de novo em In Review, a data continua a da primeira vez.
- RN-03: **Finalização de tudo** é gravada quando, para cada device associado ao projeto, o caso tem resultado e
  o resultado mais recente desse device é PASS. Um FAIL antigo de um device que depois passou não impede.
  O mais recente é o de data de execução mais recente, a mesma regra que a General Results já usa (spec 059).
- RN-04: A comparação com PASS ignora maiúsculas, minúsculas e espaços nas pontas (`pass`, ` PASS `). Qualquer
  outro valor (FAIL, N/A, check, vazio) não é PASS.
- RN-05: A data gravada na finalização de tudo é a data da execução que completou a condição, isto é, a mais
  recente entre os últimos resultados de cada device. É a data que aparece na coluna da General Results.
- RN-06: A finalização de tudo é conferida sempre que entra um resultado novo para o caso, seja pela importação
  do relatório SDF, seja pelo registro manual de uma rodada.
- RN-07: A finalização de tudo não muda mais depois de gravada. Um FAIL que chega depois, um device associado
  ao projeto depois ou um resultado corrigido não apagam nem trocam a data.
- RN-08: Um projeto sem nenhum device associado nunca preenche a finalização de tudo.
- RN-09: **Retroativo.** Ao entrar no ar, os casos que já existem recebem as duas datas pelo histórico:
  a finalização do código pela primeira mudança para In Review registrada na auditoria, e a finalização de tudo
  pelos resultados já gravados, com as regras RN-03 a RN-05. Caso sem esse histórico fica com a data vazia.
- RN-10: Na tabela de Test Cases, a finalização do código aparece na coluna **Code done** e a finalização de tudo
  na coluna **End date**, que já existia. A End date deixa de ser a última atualização de um caso Done e passa a
  ser a finalização de tudo, sem depender do Status; o filtro por dia, o seletor de semana da aba Test Cases e a
  exportação continuam, agora com esse valor. As células mostram só a data (dia, mês e ano) no formato que a tabela já usa, com a data e a hora
  ao passar o mouse. Sem data, a célula mostra um traço.
- RN-11: Ninguém edita as duas datas à mão, em nenhum perfil.

## Critérios de aceite

- **CA-01:** Dado um caso em In Progress sem finalização do código, quando o dev muda o Status para In Review,
  então a coluna de finalização do código mostra a data de hoje.
- **CA-02:** Dado um caso que já tem finalização do código em 01/11/2026, quando ele volta para In Progress e
  entra de novo em In Review em 06/11/2026, então a coluna continua mostrando 01/11/2026.
- **CA-03:** Dado um caso movido para In Review pelo Board, então a finalização do código é gravada do mesmo
  jeito que pela tela do caso.
- **CA-04:** Dado o projeto Clock com os devices SM-S948B e SM-1234, e o caso Clock_000005 com PASS no SM-S948B
  em 05/11/2026, quando é importado um relatório do SM-1234 de 06/11/2026 com PASS nesse caso, então a
  finalização de tudo do Clock_000005 mostra 06/11/2026.
- **CA-05:** Dado o mesmo projeto, quando o relatório do SM-1234 de 06/11/2026 traz FAIL no Clock_000005, então
  a finalização de tudo do caso continua vazia.
- **CA-06:** Dado um caso com FAIL no SM-1234 em 05/11/2026 e PASS no SM-S948B, quando entra PASS no SM-1234
  em 07/11/2026, então a finalização de tudo mostra 07/11/2026.
- **CA-07:** Dado um caso com PASS em só um dos dois devices do projeto, então a finalização de tudo continua
  vazia.
- **CA-08:** Dado um caso com finalização de tudo em 06/11/2026, quando chega um FAIL novo para ele, então a
  data continua 06/11/2026.
- **CA-09:** Dado um resultado registrado à mão numa rodada que completa a condição da RN-03, então a
  finalização de tudo é gravada como na importação.
- **CA-10:** Dado um caso que entrou em In Review antes desta mudança, com isso registrado na auditoria, quando a
  mudança entra no ar, então a finalização do código mostra a data registrada na auditoria.
- **CA-11 (falha):** Dado um caso sem nenhuma mudança para In Review no histórico, então a finalização do código
  mostra um traço, e não a data de criação do caso nem outra data inventada.
- **CA-12 (falha):** Dado um projeto sem devices associados, quando entra um resultado PASS para um caso, então a
  finalização de tudo continua vazia.
- **CA-13 (falha):** Dado um relatório SDF recusado (por exemplo, device fora do projeto), então nenhuma
  finalização de tudo é gravada, porque nenhum resultado entrou.
- **CA-14 (falha):** Dado qualquer perfil, quando tenta alterar uma das duas datas pela API, então o sistema
  ignora ou recusa o campo e a data não muda.

## Fora de escopo

- Filtrar, ordenar ou exportar pelo Code done. A End date mantém o filtro e a exportação que já tinha (RN-10).
- Levar as datas para a Overview, a Timeline ou o Board. A Overview continua contando entregas por Done e pela
  última atualização do caso, então pode discordar da End date da tabela; alinhar as duas é outra spec.
- Mostrar a hora ao focar a célula pelo teclado; a data continua visível.
- Mostrar quanto tempo o caso levou entre uma etapa e outra.
- Apagar ou recalcular uma data já gravada (RN-02 e RN-07). Corrigir rodadas e resultados é a spec 047.
- Avisar alguém quando um caso finaliza.

## Dúvidas em aberto

- Nenhuma. Resolvidas em 2026-11-06: a finalização de tudo usa a data da execução no SDF (RN-05); as colunas são
  **Code done** e **End date**, e a coluna All passed separada saiu depois da primeira versão (RN-10).
