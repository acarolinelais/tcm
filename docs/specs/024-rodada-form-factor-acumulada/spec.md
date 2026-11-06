# 024. Rodada Form Factor acumulada: Spec

- **Status:** Rascunho
- **Data:** 2026-10-26

## Problema

O padrão do time é reexecutar, a cada novo SDF, todos os Test Cases que já foram validados, além dos que
acabaram de ficar prontos. Hoje uma rodada captura só os TCs em `In Validation`. Um TC aprovado numa rodada
passa a `Done` e não entra na rodada seguinte. Assim, a segunda rodada não reflete o que o time de fato
testa naquele SDF, e uma regressão de um TC já aprovado não tem onde ser registrada.

## Objetivo

Cada rodada nova passa a acumular os TCs já aprovados com os TCs que ficaram prontos para validação. Um TC
aprovado que falhar no SDF novo volta para correção. O Resumo mostra os TCs da rodada atual do projeto,
incluindo os já aprovados.

## Histórias de usuário

- Como **gestão do projeto**, quero que a rodada de um novo SDF inclua todos os TCs já aprovados e os que
  ficaram prontos, para registrar o resultado completo daquele SDF.
- Como **DEV responsável**, quero que um TC aprovado que falhou no SDF novo volte para correção, para que a
  regressão não passe despercebida.
- Como **membro do projeto**, quero ver no Resumo todos os TCs da rodada atual, aprovados ou não, para
  acompanhar o resultado daquele SDF.

## Regras de negócio

- RN-01: Criar uma rodada captura todos os TCs ativos do projeto com Status `In Validation` ou `Done`. Os
  TCs em `To-Do`, `In Progress`, `In Review`, `In Fixes` e `Excluded` ficam de fora até voltarem para
  `In Validation`. Esta regra substitui a RN-01 da spec 022, que capturava só `In Validation`. Continua não
  havendo opção de escolha na criação nem limite de quantidade.
- RN-02: Ao registrar os resultados de um TC na rodada:
  - Em `In Validation`: `PASS` em todos os modelos do projeto leva a `Done`; algum `FAIL` leva a
    `In Fixes`; resultado parcial sem `FAIL` mantém `In Validation` (como hoje).
  - Em `Done`: algum `FAIL` leva a `In Fixes` (regressão); sem `FAIL`, o TC continua `Done`, com resultado
    completo ou parcial.
  - Um TC que saiu de `In Validation` ou `Done` depois de capturado (por exemplo, `Excluded`) guarda os
    resultados no histórico sem mudar de Status.
- RN-03: O Resumo do Form Factor lista os TCs capturados na rodada mais recente do projeto e os TCs em
  `In Validation` que ainda não estão nela. Um TC `Excluded` não aparece. Esta regra substitui a RN-08 da
  spec 023, que listava só `In Validation`. As colunas, o SDF ID e a ação de registrar seguem as RN-12 e
  RN-13 da spec 022 (só a rodada atual do TC, e só enquanto ela estiver pendente).
- RN-04: Permissões, SDF ID opcional, histórico e importação por planilha seguem a spec 022 sem mudança. Um
  DEV registra resultados de TCs `Done` da rodada nas mesmas condições dos TCs em `In Validation` (ser o
  responsável principal ou o Backup).

## Critérios de aceite

- **CA-01:** Dado um projeto com 500 TCs, quando a gestão cria a SDF-001 com 200 TCs em `In Validation` e
  todos recebem `PASS` em todos os modelos, depois coloca outros 200 em `In Validation` e cria a SDF-002,
  então a SDF-002 captura 400 TCs. Repetindo com os 100 restantes, a SDF-003 captura 500.
- **CA-02:** Dado que 10 TCs da SDF-001 receberam `FAIL` e estão em `In Fixes`, quando a gestão cria a
  SDF-002, então esses 10 ficam de fora. Quando um deles volta para `In Validation`, então entra na rodada
  seguinte.
- **CA-03:** Dado um TC `Done` capturado numa rodada nova, quando recebe `FAIL` em algum modelo, então o
  Status muda para `In Fixes` junto com o salvamento dos resultados.
- **CA-04:** Dado um TC `Done` capturado numa rodada nova, quando recebe `PASS` em todos os modelos ou só
  em parte deles, sem `FAIL`, então o Status continua `Done`.
- **CA-05:** Dado que a SDF-002 capturou TCs `Done` e `In Validation`, quando alguém abre o Resumo, então
  vê todos os TCs da SDF-002 com SDF ID `SDF-002` e colunas vazias até o registro, e também os TCs que
  entraram em `In Validation` depois da criação da SDF-002, sem rodada.
- **CA-06:** Dado um DEV responsável principal ou Backup de um TC `Done` capturado na rodada, quando
  registra os resultados pela ação da linha, então os resultados são salvos na rodada.
- **CA-07 (falha):** Dado um projeto sem TCs em `In Validation` ou `Done`, quando a gestão tenta criar uma
  rodada, então a criação é recusada e nenhuma rodada é gravada.
- **CA-08 (falha):** Dado um TC em `In Review`, `In Progress`, `To-Do` ou `Excluded`, quando a gestão cria
  uma rodada, então ele não é capturado e não aparece no Resumo como TC da rodada.
- **CA-09 (falha):** Dado um DEV sem vínculo com um TC `Done` da rodada, quando tenta registrar resultados
  para ele, então a operação é recusada e o Status permanece `Done`.

## Fora de escopo

- Escolher, na criação, quais TCs entram na rodada (por exemplo, só os novos).
- Reabrir rodadas anteriores ou corrigir resultados já registrados.
- Aplicar o critério acumulado ao Resumo global (Resultados Gerais, spec 021).
- Mudar o fluxo de Status manual do TC (spec 023).

## Dúvidas em aberto

- Nenhuma.
