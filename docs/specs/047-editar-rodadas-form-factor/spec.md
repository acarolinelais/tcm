# 047. Corrigir rodadas e resultados de Form Factor: Spec

- **Status:** Rascunho
- **Data:** 2026-10-30

## Problema

Uma rodada criada por engano, um SDF ID digitado errado ou um resultado FAIL lançado no modelo errado ficam para
sempre: as specs 020 a 022 não permitem corrigir. Um resultado errado ainda muda o Status do caso (FAIL leva a
`In Fixes`, PASS em todos os modelos leva a `Done`), e o erro se espalha para o histórico e os Resultados Gerais.

## Objetivo

A gestão pode corrigir o SDF ID de uma rodada, cancelar uma rodada aberta por engano e corrigir um resultado
lançado errado, sempre com uma justificativa e com o efeito no Status do caso explicado antes de confirmar.

## Histórias de usuário

- Como **KP**, quero corrigir o SDF ID de uma rodada digitado errado.
- Como **gerente**, quero cancelar uma rodada criada por engano antes de alguém lançar resultados.
- Como **KP**, quero trocar um FAIL lançado no modelo errado e devolver o caso ao Status certo.

## Regras de negócio

- RN-01: Corrigir rodada ou resultado é permitido a admin, gerente e KP no escopo do projeto. O dev não corrige,
  nem os resultados que ele mesmo lançou.
- RN-02: O SDF ID pode ser corrigido a qualquer momento, com as mesmas regras de formato e de unicidade das
  specs 022 e 025.
- RN-03: Uma rodada sem nenhum resultado pode ser cancelada. Os casos dela voltam a ficar elegíveis para uma
  próxima rodada. Uma rodada com resultados não pode ser cancelada: os resultados precisam ser corrigidos um a um.
- RN-04: Corrigir um resultado exige uma justificativa de 1 a 500 caracteres. O valor anterior e a justificativa
  ficam visíveis no histórico de execuções.
- RN-05: Antes de confirmar, o diálogo mostra o Status que o caso vai assumir com os resultados corrigidos, pela
  mesma regra da spec 022 (FAIL → `In Fixes`; PASS em todos → `Done`; parcial → `In Validation`). Se o caso já
  saiu dessa etapa por outra mudança, o Status dele não é alterado e o diálogo avisa isso.
- RN-06: Os Resultados Gerais e o resumo do projeto passam a mostrar o valor corrigido.

## Critérios de aceite

- **CA-01:** Dado uma rodada com SDF ID "SDF-12", quando o KP o corrige para "SDF-21", então a rodada e os seus
  resultados passam a mostrar "SDF-21".
- **CA-02:** Dado uma rodada sem resultados, quando o gerente a cancela, então os casos dela voltam a aparecer
  como elegíveis.
- **CA-03:** Dado um FAIL que levou o caso a `In Fixes`, quando o KP o corrige para PASS e todos os outros
  modelos estão PASS, então o caso vai para `Done` e o histórico mostra o valor anterior e a justificativa.
- **CA-04 (falha):** Dado uma rodada com algum resultado, quando alguém tenta cancelá-la, então é recusado e a
  pessoa é orientada a corrigir os resultados.
- **CA-05 (falha):** Dado uma correção sem justificativa, quando a pessoa tenta salvar, então é recusada e o
  resultado não muda.
- **CA-06 (falha):** Dado um dev, quando tenta corrigir um resultado, então a ação não aparece e uma tentativa
  direta é recusada.
- **CA-07 (falha):** Dado um SDF ID já usado em outra rodada do projeto, quando o KP tenta usá-lo na correção,
  então é recusado (spec 025).

## Fora de escopo

- Apagar resultados (só corrigir o valor).
- Corrigir dados de um relatório SDF importado reimportando o arquivo.
- Mudar quais casos fazem parte de uma rodada.

## Dúvidas em aberto

- Rodadas com Status `Done` ou `Cancelled` também podem ter resultados corrigidos?
- "Limpar" um resultado (voltar para sem resultado) deve ser permitido?
- A regra de não mudar um caso que já saiu da etapa (RN-05) é o comportamento desejado?
