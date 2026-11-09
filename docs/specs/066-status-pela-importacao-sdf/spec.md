# 066. Status do Test Case pela importação do relatório SDF: Spec

- **Status:** Aprovada
- **Data:** 2026-11-06
- **Specs relacionadas:** 060 (importação do relatório SDF no formato novo), 065 (End date pela aprovação em todos
  os devices), 038 (histórico do Test Case), 026 (exclusão com justificativa)
- **Apoio:** diagrama "TCM - Fluxo de status do Test Case (dev x automação)", bloco "Atualiza os TCs In Validation"

## Problema

Hoje a importação do relatório SDF grava os resultados, mas não mexe no Status dos Test Cases. Um caso em In
Validation que passou em todos os devices continua lá até alguém movê-lo à mão, e um que falhou não volta para o
dev. Só o registro manual numa rodada faz isso. Quem gerencia precisa conferir caso por caso depois de cada
importação.

## Objetivo

Depois de uma importação aceita, um caso em In Validation segue os resultados: tudo PASS leva a Done e um FAIL
devolve o caso para o dev em In Fixes. Caso em qualquer outro Status fica como está — o relatório grava os
resultados PASS e FAIL no histórico e não mexe no Status.

## Histórias de usuário

- Como **gerente** ou **KP**, quero que a importação do SDF feche os casos em validação que passaram em todos os
  devices, para não mover cada um à mão.
- Como **gerente** ou **KP**, quero que um caso em validação que falhou volte para o dev sozinho, para a correção
  começar logo.
- Como **dev**, quero ver no histórico do caso que o Status mudou pela importação, para saber de onde veio a mudança.

## Regras de negócio

- RN-01: As regras valem só para a importação do relatório SDF que foi aceita. Um relatório recusado não grava nada
  e não muda nenhum Status (spec 060). O registro manual numa rodada continua com a regra que já tem.
- RN-02: **Tudo PASS** é a mesma condição da End date (spec 065): cada device associado ao projeto tem resultado, e
  o resultado mais recente de cada um, contando esta importação e as anteriores, é PASS. A comparação ignora
  maiúsculas, minúsculas e espaços nas pontas.
- RN-03: **FAIL nesta importação** é o resultado do caso no relatório que está sendo importado ser FAIL, com a
  mesma comparação. Um FAIL antigo de outro device não conta aqui.
- RN-04: Caso em **In Validation**:
  - tudo PASS → Done;
  - FAIL nesta importação → In Fixes;
  - nenhum dos dois (ex.: PASS neste device e outro device ainda sem resultado) → continua em In Validation.
- RN-05: Caso em **qualquer outro Status** (To-Do, In Progress, In Review, In Fixes, Done, Excluded): o Status não
  muda, seja o resultado PASS, FAIL ou outro, e nem quando o caso passa a ter tudo PASS. O relatório só grava os
  resultados no histórico de execuções. Só In Validation entra no fluxo automático; fora dela quem move o caso é
  uma pessoa.
- RN-06: Isso vale também para **Excluded**: excluir é uma decisão com justificativa (spec 026) e só uma pessoa a
  desfaz.
- RN-07: Valores que não são PASS nem FAIL (N/A, check, vazio) não mudam o Status em nenhum caso.
- RN-08: Toda mudança de Status feita pela importação aparece no histórico do caso com a origem Form Factor, como
  as mudanças do registro manual (spec 038).
- RN-09: A mudança de Status acontece junto com a gravação dos resultados: ou os dois entram, ou nada entra.
- RN-10: Depois da importação, a tabela de Test Cases, o Board e a General Results mostram o Status novo sem
  recarregar a página.
- RN-11: Ir direto para Done sem passar por In Review não preenche o Code done (spec 065): a data continua sendo só
  a da primeira entrada em In Review.

## Critérios de aceite

- **CA-01:** Dado o projeto Clock com os devices SM-S948B e SM-1234, e o caso Clock_000001 em In Validation com PASS
  no SM-S948B, quando é importado um relatório do SM-1234 com PASS nesse caso, então o caso vai para Done.
- **CA-02:** Dado o caso Clock_000002 em In Validation, quando o relatório do SM-1234 traz FAIL nele, então o caso
  vai para In Fixes.
- **CA-03:** Dado o caso Clock_000003 em In Validation sem resultado no SM-S948B, quando o relatório do SM-1234 traz
  PASS nele, então o caso continua em In Validation.
- **CA-04:** Dado o caso Clock_000004 em To-Do (ou In Progress, In Review, In Fixes) com PASS no SM-S948B, quando o
  relatório do SM-1234 traz PASS nele e o caso passa a ter tudo PASS, então o Status não muda e só o resultado entra
  no histórico de execuções.
- **CA-05:** Dado o caso Clock_000005 em In Progress, quando o relatório traz FAIL nele, então o Status continua In
  Progress e o FAIL aparece no histórico de execuções.
- **CA-06:** Dado um caso em In Validation com FAIL antigo no SM-S948B, quando o relatório do SM-1234 traz PASS, então
  o caso continua em In Validation (não está tudo PASS e não há FAIL nesta importação).
- **CA-07:** Dado um relatório com casos nas três situações (tudo PASS em In Validation, FAIL em In Validation e
  resultados em casos fora de In Validation), quando ele é importado, então cada caso segue a sua regra na mesma
  importação.
- **CA-08:** Dado um caso que mudou de Status pela importação, quando alguém abre o histórico dele, então a mudança
  aparece com a origem Form Factor.
- **CA-09 (falha):** Dado um caso Excluded com PASS em todos os devices, quando o relatório é importado, então ele
  continua Excluded, com a mesma justificativa.
- **CA-10 (falha):** Dado um caso Done, quando o relatório traz FAIL nele, então ele continua Done.
- **CA-11 (falha):** Dado um relatório recusado (por exemplo, device fora do projeto ou SDF ID repetido), então
  nenhum Status muda.
- **CA-12 (falha):** Dado um caso em In Validation, quando o relatório traz N/A nele, então ele continua em In
  Validation.
- **CA-13:** Dado a General Results aberta, quando a importação termina, então a tabela de Test Cases e o Board do
  projeto mostram o Status novo sem recarregar a página.

## Fora de escopo

- Mudar a regra do registro manual numa rodada: ela já olha só In Validation, igual a esta, mas decide com os
  resultados da rodada em vez do mais recente de cada device. Unificar as duas é outra spec.
- Desfazer uma mudança de Status feita pela importação, ou recalcular Status quando um device é associado ou
  desassociado do projeto.
- Avisar alguém (notificação) quando o Status muda.
- Mostrar, no fim da importação, quantos casos mudaram de Status.

## Dúvidas em aberto

- Nenhuma. Resolvidas em 2026-11-06: tudo PASS usa o resultado mais recente de cada device, como a End date;
  Excluded não muda; a rodada manual fica como está.
- Revisado em 2026-11-07, depois do teste em dev: só In Validation muda de Status (RN-05). Na primeira versão um
  caso em To-Do, In Progress, In Review ou In Fixes ia para Done ao completar tudo PASS, e isso fechava casos que
  ninguém tinha mandado para validação.
