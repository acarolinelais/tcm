# 026. Justificativa ao excluir um Test Case: Spec

- **Status:** Concluída
- **Data:** 2026-10-27

## Problema

Marcar um TC como `Excluded` tira o TC do fluxo e das rodadas (spec 023, RN-06). Hoje não fica registrado o
motivo. Quem abre o projeto depois vê o TC excluído sem saber por que ele não pode ser automatizado, e a
gestão não consegue avaliar se a exclusão faz sentido ou se o TC deveria voltar.

## Objetivo

Toda exclusão de TC passa a exigir uma justificativa escrita. A justificativa fica visível a partir da linha
do TC, e qualquer pessoa que vê o TC consegue lê-la.

## Histórias de usuário

- Como **DEV atribuído ou gestão**, quero informar por que estou excluindo um TC, para que o time entenda a
  decisão.
- Como **membro do projeto**, quero ler a justificativa de um TC excluído, para saber por que ele saiu do
  fluxo.

## Regras de negócio

- RN-01: Excluir um TC exige uma justificativa de 1 a 500 caracteres. Os espaços nas pontas são ignorados, e
  um texto só com espaços conta como vazio.
- RN-02: A regra vale em todos os pontos onde um TC pode ser excluído: na linha da listagem (DEV principal,
  Backup ou gestão) e no painel de edição da gestão. Quem pode excluir continua o mesmo (spec 023, RN-06).
- RN-03: A justificativa é pedida no mesmo passo da confirmação de exclusão. Sem justificativa válida, a
  exclusão não pode ser confirmada e o TC não muda.
- RN-04: A listagem de Test Cases ganha uma coluna de observações. Um TC excluído com justificativa mostra um
  ícone nessa coluna. Ao clicar no ícone, abre um painel lateral só de leitura com o rótulo "Justificativa" e o
  texto informado. Nos demais TCs a célula mostra `—`, o padrão de valor ausente das tabelas.
- RN-05: Qualquer perfil que já vê o TC na listagem (Admin, Gerente, KP ou Developer) vê o ícone e abre o
  painel. Ver a justificativa não exige poder excluir.
- RN-06: Quando o TC sai de `Excluded` (pela gestão ou pelo DEV principal, que hoje edita o Status
  livremente), a justificativa é apagada. Uma nova exclusão pede uma nova justificativa.
- RN-07: Os TCs que já estavam excluídos antes desta spec ficam sem justificativa e com `—` na coluna, até
  serem reativados e excluídos de novo.

## Critérios de aceite

- **CA-01:** Dado um TC em `In Progress` atribuído ao DEV, quando ele escolhe `Excluded` na linha, escreve
  "Depende de hardware indisponível" e confirma, então o TC fica `Excluded` e a coluna de observações mostra o
  ícone.
- **CA-02:** Dado um TC excluído com justificativa, quando uma pessoa de qualquer perfil que vê o TC clica no
  ícone de observações, então um painel mostra "Justificativa" e o texto informado, sem permitir edição.
- **CA-03:** Dado um TC que a gestão edita pelo painel de edição, quando ela muda o Status para `Excluded`,
  então precisa informar a justificativa antes de salvar, e ela fica registrada como no CA-01.
- **CA-04 (falha):** Dado o pedido de exclusão aberto, quando a justificativa está vazia ou só tem espaços,
  então não dá para confirmar, e uma tentativa direta de excluir sem justificativa é recusada sem mudar o TC.
- **CA-05 (falha):** Dado o pedido de exclusão aberto, quando a justificativa passa de 500 caracteres, então
  a exclusão é recusada e o TC não muda.
- **CA-06:** Dado um TC excluído com justificativa, quando a gestão ou o DEV principal muda o Status para `To-Do`, então a
  justificativa some e a coluna de observações mostra `—`.
- **CA-07 (falha):** Dado um DEV que não é principal nem Backup do TC, quando ele tenta excluir o TC com
  justificativa, então a operação é recusada como hoje (spec 023, CA-09).

## Fora de escopo

- Editar a justificativa de um TC que já está excluído.
- Registrar e mostrar quem excluiu e quando (pode vir numa spec futura).
- Guardar o histórico das exclusões anteriores (a reativação apaga a justificativa, RN-06).
- Pedir justificativa para outros Status.
- Preencher justificativa para os TCs excluídos antes desta spec.

## Dúvidas em aberto

- Nenhuma.
