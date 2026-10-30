# 043. Ações em lote na lista de Test Cases: Spec

- **Status:** Rascunho
- **Data:** 2026-10-30

## Problema

Um projeto tem centenas de casos. Quando a gestão redistribui o trabalho ou move um grupo de casos de etapa, ela
precisa abrir e alterar linha por linha. É lento e fácil de errar.

## Objetivo

Na lista de Test Cases, a gestão pode selecionar vários casos e mudar de uma vez o Status, o responsável
principal ou o Backup, e vê claramente o que foi aplicado e o que não foi.

## Histórias de usuário

- Como **KP**, quero atribuir 30 casos a um dev de uma vez, quando ele entra no time.
- Como **gerente**, quero mover vários casos para `To-Do` depois de um replanejamento.

## Regras de negócio

- RN-01: A lista de Test Cases ganha uma coluna de seleção, com "selecionar todos da página". A seleção é
  mantida ao trocar de página dentro dos mesmos filtros.
- RN-02: Com pelo menos um caso selecionado, aparece uma barra com o total selecionado e as ações Mudar Status,
  Mudar responsável, Mudar Backup e Limpar seleção.
- RN-03: As ações em lote estão disponíveis para admin, gerente e KP no escopo. O dev não vê a seleção.
- RN-04: Cada caso segue as mesmas regras da alteração individual. `Excluded` não está disponível em lote,
  porque exige uma justificativa por caso (spec 026).
- RN-05: Um lote tem no máximo 200 casos.
- RN-06: Depois de aplicar, a tela mostra quantos casos mudaram e lista os que foram recusados, com o motivo
  de cada um. Cada mudança aplicada gera seu registro no histórico (spec 038).

## Critérios de aceite

- **CA-01:** Dado 10 casos selecionados, quando o KP escolhe Mudar responsável → Ana, então os 10 passam a ter
  Ana como responsável e a tela mostra "10 casos atualizados".
- **CA-02:** Dado casos selecionados nas páginas 1 e 2, quando a pessoa aplica Mudar Status, então todos os
  selecionados mudam.
- **CA-03 (falha):** Dado um lote em que 2 casos não aceitam o novo responsável (por exemplo, a pessoa já é o
  Backup deles), quando a ação é aplicada, então os outros mudam e a tela lista os 2 recusados com o motivo.
- **CA-04 (falha):** Dado 201 casos selecionados, quando a pessoa tenta aplicar, então a ação é recusada e pede
  um lote menor.
- **CA-05 (falha):** Dado um dev, quando abre a lista, então não vê a seleção, e uma tentativa direta de alterar
  em lote é recusada.

## Fora de escopo

- Excluir em lote.
- Ações em lote em outras tabelas (usuários, times, modelos).
- Desfazer um lote.

## Dúvidas em aberto

- O lote deve aplicar o que for possível (como descrito) ou ser tudo ou nada?
- O limite de 200 casos é adequado ao tamanho real dos projetos?
