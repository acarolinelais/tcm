# 017. Status In Validation do Test Case: Spec

- **Status:** Concluída
- **Data:** 2026-10-25

## Problema
Depois da revisão, alguns Test Cases ainda passam por uma etapa de validação antes de receberem o resultado
final (`Pass` ou `Fail`). Hoje essa etapa não tem um Status próprio: o caso fica em `InReview`, e quem
acompanha o projeto não sabe se ele está sendo revisado ou validado.

## Objetivo
Adicionar o Status `InValidation` (rótulo "In Validation") ao progresso do Test Case, entre `InReview` e
`Pass`, disponível em todos os lugares onde o Status já é escolhido, filtrado ou exibido.

## Histórias de usuário
- Como **responsável principal por um Test Case**, quero marcar o caso como "In Validation" para mostrar
  ao time que ele saiu da revisão e está sendo validado.
- Como **gerente ou KP**, quero filtrar os casos em "In Validation" para acompanhar o que falta validar.

## Regras de negócio
- RN-01: O Status do Test Case passa a aceitar `To-Do`, `InProgress`, `InReview`, `InValidation`, `Pass`
  ou `Fail`. A ordem de exibição nas opções segue essa sequência.
- RN-02: `InValidation` segue as mesmas regras de permissão dos demais Status (RN-16 da spec 011): quem já
  pode alterar o Status de um caso pode escolher `InValidation`.
- RN-03: `InValidation` não tem Data final; a Data final continua existindo só para casos em `Pass`.
- RN-04: O rótulo exibido é "In Validation" em inglês, com tradução em português e coreano, e tem um badge
  visual próprio, distinto dos demais Status.
- RN-05: Os Test Cases existentes não mudam de Status.

## Critérios de aceite
- **CA-01:** Dado um Test Case que a pessoa pode editar, quando ela muda o Status para "In Validation",
  então o novo Status e a data de atualização são persistidos e a linha exibe o badge de "In Validation".
- **CA-02:** Dada a listagem de Test Cases, quando a pessoa abre o filtro de Status, então "In Validation"
  aparece entre "In Review" e "Pass" e, ao escolhê-lo, só os casos nesse Status são listados.
- **CA-03:** Dado o drawer de edição de um Test Case, quando a pessoa abre o campo Status, então
  "In Validation" é uma das opções, entre "In Review" e "Pass".
- **CA-04:** Dado um caso em "In Validation", quando a listagem é exibida, então a coluna Data final mostra
  "—".
- **CA-05 (falha):** Dado um Test Case, quando alguém tenta gravar um Status fora das seis opções
  permitidas, então a operação é recusada e a validação informa o campo inválido.
- **CA-06 (falha):** Dado um Test Case atribuído a outra pessoa, quando um membro sem permissão de gestão
  tenta mudar o Status para "In Validation", então a operação é recusada.
- **CA-07:** Dados Test Cases cadastrados antes desta mudança, quando ela entra em vigor, então todos mantêm
  o Status que tinham.

## Fora de escopo
- Fluxo obrigatório entre Status (ex.: exigir passar por "In Validation" antes de "Pass").
- Novas permissões ou papéis específicos para validar.
- Indicadores, gráficos ou contagens por Status no dashboard.
- Coluna de Status na planilha de importação (continua ignorada, RN-11a da spec 011).

## Dúvidas em aberto
- Nenhuma.
