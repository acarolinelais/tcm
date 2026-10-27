# 023. Ciclo de Status do Test Case com PR e correções: Spec

- **Status:** Concluída
- **Data:** 2026-10-25

## Problema

Hoje o Status `In Review` acumula dois significados. O primeiro é o TC em revisão de PR. O segundo é o TC que recebeu
`FAIL` numa rodada Form Factor (spec 022). Assim não dá para saber se um TC aguarda a aprovação do PR ou uma
correção. O fluxo atual também deixa o DEV pular a revisão e ir de `In Progress` direto para `In Validation`.
Isso não reflete o processo do time: o TC só vai para validação depois que o PR é aprovado.

## Objetivo

O ciclo de Status passa a seguir o trabalho real do TC: escrita, PR em revisão, PR aprovado e validação nos
modelos, com o resultado final `Done` ou `In Fixes`. Um TC que não pode ser automatizado é marcado como
`Excluded` e sai do fluxo sem perder seu histórico.

## Histórias de usuário

- Como **DEV responsável**, quero marcar que subi o PR do TC para que a revisão saiba que ele está pronto.
- Como **DEV responsável ou gestão**, quero marcar o PR como aprovado para que o TC fique elegível para validação.
- Como **membro do projeto**, quero distinguir um TC com falha a corrigir de um TC aguardando revisão de PR.
- Como **DEV atribuído ou gestão**, quero excluir um TC que não pode ser automatizado.

## Regras de negócio

- RN-01: O catálogo de Status do TC é `To-Do`, `In Progress`, `In Review`, `In Validation`, `Done`, `In Fixes`
  e `Excluded`. Todo TC novo nasce em `To-Do`.
- RN-02: O ciclo é: `To-Do` → `In Progress` (o DEV começou) → `In Review` (o PR foi enviado) → `In Validation`
  (o PR foi aprovado). Ao salvar os resultados da rodada, o TC vai para `Done` se todos os modelos do projeto
  tiverem `PASS`, ou para `In Fixes` se algum modelo tiver `FAIL`. Resultados parciais sem `FAIL` mantêm
  `In Validation`.
- RN-03: Um TC em `In Fixes` volta para `In Review` quando o DEV envia o PR com a correção. Não há caminho direto
  de `In Fixes` ou `In Progress` para `In Validation`.
- RN-04: O responsável principal pode fazer as transições `To-Do` → `In Progress`, `In Progress` → `In Review`,
  `In Review` → `In Validation` e `In Fixes` → `In Review`. Admin da unidade, gerente e KP autorizados no escopo
  do projeto também podem mover `In Review` → `In Validation`. A gestão mantém a edição livre de Status que já
  existe.
- RN-05: `Done` e `In Fixes` vêm do registro de resultados da rodada. O DEV não os define manualmente.
- RN-06: `Excluded` marca um TC que não pode ser automatizado. O DEV atribuído (principal ou Backup) e a gestão
  autorizada no escopo podem excluir um TC a partir de qualquer Status. A exclusão não apaga o TC, seus resultados
  nem seu histórico de rodadas. É o mesmo Status `Cancelled` da spec 022, agora exibido como `Excluded` (EN),
  `Excluído` (PT) e `제외됨` (KO). Escolher `Excluded` na linha pede confirmação antes de gravar; para o DEV, a
  confirmação avisa que só a gestão consegue desfazer (incluído em 2026-10-27).
- RN-07: TCs que estão em `In Review` e cuja execução de rodada mais recente tem algum `FAIL` passam a
  `In Fixes`. Os demais TCs em `In Review` continuam em `In Review`.
- RN-08: A visão Resumo do Form Factor mostra uma única tabela com os TCs em `In Validation`, no formato que
  existia antes da spec 022. A lista separada de TCs elegíveis e o painel de TCs da rodada deixam de existir.
  A gestão continua criando a rodada pelo botão acima da tabela.
- RN-09: Cada linha da tabela oferece a ação de registrar resultado quando o TC tem uma rodada com resultados
  pendentes. O registro vai para a rodada pendente mais recente do TC. A ação aparece para a gestão no escopo e
  para o DEV principal ou Backup do TC; para os demais usuários, a linha fica só de leitura.

## Critérios de aceite

- **CA-01:** Dado um TC novo, quando o DEV principal o move para `In Progress`, depois para `In Review` e depois
  para `In Validation`, então cada transição é salva e, ao final, o TC aparece entre os elegíveis do Form Factor.
- **CA-02:** Dado um TC em `In Review`, quando um Admin, gerente ou KP no escopo marca o PR como aprovado, então
  o Status passa para `In Validation`.
- **CA-03:** Dado um TC em uma rodada, quando algum modelo recebe `FAIL`, então o resultado é salvo e o Status
  muda para `In Fixes`.
- **CA-04:** Dado um TC com `PASS` em todos os modelos do projeto na rodada, quando os resultados são salvos,
  então o Status muda para `Done`. Com `PASS` em só parte dos modelos e nenhum `FAIL`, o Status continua
  `In Validation`.
- **CA-05:** Dado um TC em `In Fixes`, quando o DEV principal envia a correção, então o Status volta para
  `In Review` e os resultados das rodadas anteriores continuam no histórico.
- **CA-06 (falha):** Dado um TC em `In Progress` ou `In Fixes`, quando o DEV tenta movê-lo direto para
  `In Validation`, então a transição é recusada e o Status permanece igual.
- **CA-07 (falha):** Dado um DEV, quando tenta definir `Done` ou `In Fixes` manualmente, então a operação é
  recusada e o Status permanece igual.
- **CA-08:** Dado um TC que não pode ser automatizado, quando o DEV atribuído ou a gestão no escopo o marca como
  `Excluded`, então o Status é salvo e o histórico permanece consultável.
- **CA-09 (falha):** Dado um DEV sem atribuição ao TC, quando tenta marcá-lo como `Excluded` ou mudar seu
  Status, então a operação é recusada e o Status permanece igual.
- **CA-10:** Dado um TC em `In Review` cuja última rodada tem `FAIL`, quando a atualização é aplicada, então ele
  passa a `In Fixes`. Um TC em `In Review` sem `FAIL` na última rodada continua em `In Review`.
- **CA-11:** Dado qualquer tela que mostra Status de TC (Test Cases, rodada, filtros), quando o usuário a
  consulta, então vê `In Fixes` e `Excluded` com os textos em PT, EN e KO.
- **CA-12:** Dado um projeto com TCs em `In Validation`, quando alguém abre o Resumo do Form Factor, então vê
  uma única tabela com esses TCs, sem a lista de elegíveis nem o painel da rodada.
- **CA-13:** Dado um TC numa rodada com resultados pendentes, quando o DEV principal, o Backup ou a gestão usa
  a ação da linha, então registra os resultados nessa rodada e a tabela reflete o novo Status.
- **CA-14 (falha):** Dado um TC sem rodada pendente, ou um usuário sem vínculo com o TC e fora da gestão, quando a
  tabela é exibida, então a linha não oferece a ação de registrar resultado.

## Fora de escopo

- Integração com o repositório de código para detectar o PR enviado ou aprovado automaticamente.
- Exigir motivo ou comentário ao excluir um TC.
- Reabrir um TC `Excluded` ou `Done` pelo DEV (a gestão continua podendo editar o Status).
- Mudar as regras de criação de rodada, permissões de importação ou registro de resultados da spec 022.

## Dúvidas em aberto

- Nenhuma.
