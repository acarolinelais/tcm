# 025. SDF ID único por rodada no projeto: Spec

- **Status:** Concluída
- **Data:** 2026-10-27

## Problema

Ao criar uma rodada de Form Factor, a gestão informa o SDF ID que está sendo testado. Hoje nada impede usar
um SDF ID que já pertence a uma rodada anterior do mesmo projeto. Uma digitação repetida cria duas rodadas
para o mesmo SDF, e o Resumo e o histórico passam a mostrar resultados misturados sem que ninguém perceba.

## Objetivo

O sistema recusa a criação de uma rodada cujo SDF ID já foi usado em outra rodada do mesmo projeto, e mostra
o motivo no próprio campo, para a gestão corrigir antes de criar.

## Histórias de usuário

- Como **gestão do projeto**, quero ser avisado quando o SDF ID que digitei já tem uma rodada, para não criar
  uma rodada duplicada por engano.

## Regras de negócio

- RN-01: Dentro de um projeto, cada SDF ID pertence a no máximo uma rodada. Projetos diferentes podem usar o
  mesmo SDF ID.
- RN-02: A comparação ignora maiúsculas e minúsculas e os espaços no início e no fim: `sdf-002 ` repete
  `SDF-002`.
- RN-03: O SDF ID continua opcional (spec 022). Rodadas sem SDF ID não entram na verificação e podem existir
  em qualquer quantidade.
- RN-04: Ao encontrar a repetição, a rodada não é criada e nenhum TC muda. O diálogo continua aberto com o
  valor digitado e um aviso informa que esse SDF já tem uma rodada no projeto. *(Alterada em 2026-10-27: o
  aviso passou do campo SDF ID para um toast.)*
- RN-05: Rodadas antigas que já repetem um SDF ID continuam como estão. A regra vale para as rodadas criadas
  a partir de agora.

## Critérios de aceite

- **CA-01:** Dado um projeto com uma rodada `SDF-001`, quando a gestão cria uma rodada `SDF-002`, então a
  rodada é criada normalmente.
- **CA-02 (falha):** Dado um projeto com uma rodada `SDF-001`, quando a gestão tenta criar outra rodada
  `SDF-001`, então a criação é recusada, nenhuma rodada nova aparece e um toast informa que esse SDF já tem
  uma rodada no projeto.
- **CA-03 (falha):** Dado um projeto com uma rodada `SDF-001`, quando a gestão tenta criar uma rodada
  ` sdf-001 `, então a criação é recusada como no CA-02.
- **CA-04:** Dado que o projeto A tem uma rodada `SDF-001`, quando a gestão cria uma rodada `SDF-001` no
  projeto B, então a rodada é criada.
- **CA-05:** Dado um projeto com uma rodada sem SDF ID, quando a gestão cria outra rodada sem SDF ID, então a
  rodada é criada.
- **CA-06 (falha):** Dado que o toast avisou o SDF ID repetido, quando a gestão troca o valor no diálogo, que
  continuou aberto, por um SDF ID novo e cria, então a rodada é criada.

## Fora de escopo

- Verificar o SDF ID na importação do relatório SDF (ela tem regras próprias da spec 022).
- Editar o SDF ID de uma rodada já criada.
- Corrigir ou mesclar as rodadas antigas que já repetem um SDF ID.
- Avisar durante a digitação, antes de clicar em criar.

## Dúvidas em aberto

- Nenhuma.
