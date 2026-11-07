# 067. Desfazer a última importação do relatório SDF: Spec

- **Status:** Concluída
- **Data:** 2026-11-07
- **Specs relacionadas:** 059 (General Results), 060 (importação do relatório SDF no formato novo), 065 (End date),
  066 (Status pela importação), 038 (histórico do Test Case), 047 (corrigir rodadas e resultados)

## Problema

Na General Results, o botão Import SDF report importa o relatório assim que a pessoa escolhe o arquivo, sem uma etapa
de confirmação. Se ela escolher o arquivo errado (outro device, outro dia, uma cópia já corrigida), os resultados
entram no histórico, os casos em In Validation mudam de Status (spec 066) e o SDF ID fica ocupado. Hoje não tem como
voltar atrás.

## Objetivo

Quem pode importar consegue desfazer a importação mais recente do projeto. Os resultados dela saem das telas, os
Status que ela mudou voltam para In Validation quando ninguém mexeu no caso depois, e o SDF ID fica livre para o
arquivo certo.

## Histórias de usuário

- Como **gerente** ou **KP**, quero desfazer a importação que acabei de fazer com o arquivo errado, para não deixar
  resultados falsos no histórico.
- Como **gerente** ou **KP**, quero importar de novo o arquivo corrigido com o mesmo SDF ID depois de desfazer.
- Como **dev**, quero ver no histórico do caso que o Status voltou porque uma importação foi desfeita.

## Regras de negócio

- RN-01: Quem pode desfazer é quem pode importar (spec 060, RN-13): admin, gerente e KP com a permissão de importar
  relatório SDF, só nos projetos do seu escopo.
- RN-02: Só a **importação mais recente ainda válida** do projeto pode ser desfeita. Depois de desfeita, a anterior
  passa a ser a mais recente e também pode ser desfeita. Não há limite de tempo.
- RN-03: Antes de desfazer, a pessoa confirma num diálogo que mostra o SDF ID, o device, a data da execução, quem
  importou e quando. O diálogo avisa que os resultados saem das telas e que os Status mudados pela importação voltam.
- RN-04: Os resultados da importação desfeita deixam de aparecer na General Results, no histórico de execuções do
  caso e em tudo que conta resultados (End date, Overview). A importação desfeita continua registrada, com quem
  desfez e quando.
- RN-05: Cada caso que a importação mudou de Status (spec 066) volta para In Validation **se ainda estiver no Status
  que a importação deixou** e ninguém o moveu depois. Caso que alguém moveu depois fica como está.
- RN-06: A volta para In Validation aparece no histórico do caso com a origem Form Factor e a indicação de que veio
  de uma importação desfeita.
- RN-07: A End date de cada caso afetado é recalculada sem os resultados desfeitos (spec 065). O Code done não muda.
- RN-08: O SDF ID da importação desfeita fica livre: um arquivo com o mesmo SDF ID pode ser importado de novo no
  projeto (spec 060, RN-03).
- RN-09: Desfazer é tudo ou nada: resultados, Status e End date mudam juntos, ou nada muda.
- RN-10: Depois de desfazer, a General Results, a tabela de Test Cases e o Board mostram o estado novo sem recarregar
  a página.
- RN-11: Sem importação válida no projeto, a opção de desfazer não aparece.

## Critérios de aceite

- **CA-01:** Dado o projeto Clock com uma importação do SM-1234 que trouxe PASS no Clock_000001, quando o gerente
  desfaz a última importação e confirma, então esse PASS some da General Results e do histórico de execuções do caso.
- **CA-02:** Dado o Clock_000002, que a importação levou de In Validation para In Fixes e continua em In Fixes,
  quando a importação é desfeita, então o caso volta para In Validation e o histórico mostra a mudança com a origem
  Form Factor.
- **CA-03:** Dado o Clock_000003, que a importação levou para Done e um gerente depois moveu para In Progress, quando a
  importação é desfeita, então o caso continua em In Progress.
- **CA-04:** Dado o Clock_000004, que ganhou End date por essa importação, quando ela é desfeita, então a End date
  volta a ficar vazia (ou volta à data calculada sem ela).
- **CA-05:** Dado duas importações no projeto, quando a mais recente é desfeita, então a opção de desfazer passa a
  oferecer a anterior.
- **CA-06:** Dado uma importação desfeita com o SDF ID 456789-990123, quando um arquivo com esse SDF ID é importado,
  então ele é aceito.
- **CA-07:** Dado o diálogo de confirmação aberto, quando a pessoa cancela, então nada muda.
- **CA-08 (falha):** Dado um dev, ou um KP sem a permissão de importar, então a opção de desfazer não aparece e um
  pedido direto é recusado.
- **CA-09 (falha):** Dado um projeto sem importações (ou com todas desfeitas), então a opção de desfazer não aparece e
  um pedido direto é recusado.
- **CA-10 (falha):** Dado o diálogo aberto para a importação A, quando outra pessoa importa a B antes da confirmação,
  então desfazer a A é recusado com um aviso de que ela não é mais a última, e nada muda.
- **CA-11 (falha):** Dado uma importação de um projeto fora do escopo da pessoa, quando ela tenta desfazê-la, então o
  pedido é recusado e nada muda.

## Fora de escopo

- Desfazer uma importação que não é a mais recente, ou escolher numa lista de importações.
- Refazer (desfazer o desfazer). Para voltar, importa-se o arquivo de novo.
- Desfazer resultados lançados à mão numa rodada (spec 047).
- Corrigir resultados linha a linha dentro de uma importação.
- Notificar alguém quando uma importação é desfeita.

## Dúvidas em aberto

- Nenhuma. Resolvidas em 2026-11-07: o Status volta só se ninguém mexeu no caso; só a mais recente, repetível; o SDF ID
  fica livre.
