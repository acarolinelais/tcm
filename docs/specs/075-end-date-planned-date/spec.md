# 075. End date e Planned date nos Test Cases: Spec

- **Status:** Concluída
- **Data:** 2026-11-11
- **Specs relacionadas:** 065 (datas de finalização, alterada), 071 (data planejada do projeto), 011 e 016
  (importação da planilha), 073 (My Fixes)

## Problema

Com sprints separadas para automação e correção (spec 073), as duas datas da aba Test Cases deixam de ajudar. A
**Code done** (primeira entrada em In Review) é a que interessa para a sprint de automação, mas tem um nome que o time
não usa. A **End date** (todos os devices passaram) mistura a automação com a correção, que agora tem a própria aba.
E a data planejada do projeto (spec 071) só pode ser definida depois que o projeto existe, editando o formulário.

## Objetivo

A aba Test Cases passa a mostrar **End date**, o dia em que o dev terminou de automatizar o caso, e **Planned date**,
o prazo do projeto. A Planned date pode vir da planilha na importação, e o burndown continua planejando por ela.

## Histórias de usuário

- Como **KP**, quero informar o prazo do projeto na própria planilha, para o projeto já nascer com o planejamento.
- Como **gerente** ou **KP**, quero ver ao lado de cada caso quando ele foi automatizado e qual é o prazo, para
  acompanhar a sprint de automação.

## Regras de negócio

**Planilha**
- RN-01: A planilha de Test Cases aceita a coluna opcional **Planned date**, com dia, mês e ano.
- RN-02: A Planned date é do projeto: as linhas preenchidas precisam ter a mesma data. Linhas vazias valem como essa
  data.
- RN-03: Na importação, a data da planilha vira a data planejada do projeto (spec 071), e o dia da importação é o
  início do planejamento (spec 071, RN-04).
- RN-04: Coluna ausente ou toda vazia: o projeto nasce sem data planejada, como hoje.
- RN-05: A data segue as regras da spec 071 (RN-09): não pode ser anterior ao dia da importação nem passar de dois
  anos dele. Data inválida, fora do intervalo ou diferente entre as linhas recusa a planilha inteira, com o erro
  apontando a linha, como os outros erros da planilha. A prévia mostra a data lida.

**Aba Test Cases**
- RN-06: A coluna **Code done** passa a se chamar **End date**, com a mesma regra: o dia em que o caso entrou em In
  Review pela primeira vez (spec 065, RN-01 e RN-02). Ela não muda quando o caso volta para In Review numa correção
  (spec 073).
- RN-07: A End date antiga (o dia em que todos os devices passaram, spec 065, RN-03 a RN-08) sai da aba Test Cases.
- RN-08: A nova coluna **Planned date** mostra a data planejada do projeto em cada linha. Sem data, mostra um traço.
- RN-09: Ninguém edita as datas na tabela. A Planned date continua editada no formulário do projeto, só por admin da
  unidade, gerente e KP (spec 071, RN-02 e RN-03).
- RN-10: O filtro por dia, o seletor de semana e a exportação da aba Test Cases passam a usar a nova End date.
- RN-11: O burndown não muda: continua planejando pela data planejada do projeto (spec 071).

## Critérios de aceite

- **CA-01:** Dado uma planilha com Planned date 19/12/2026 em todas as linhas, quando o KP importa, então o projeto
  nasce com a data planejada 19/12/2026, e o burndown planeja a partir do dia da importação.
- **CA-02:** Dado uma planilha sem a coluna Planned date, quando o KP importa, então o projeto nasce sem data
  planejada.
- **CA-03 (falha):** Dado uma planilha com 19/12/2026 numa linha e 20/12/2026 em outra, quando o KP importa, então a
  planilha é recusada, com o erro apontando a linha com a data diferente, e nada é criado.
- **CA-04 (falha):** Dado uma planilha com Planned date no passado, a mais de dois anos ou que não é uma data, quando
  o KP importa, então a planilha é recusada com o erro na linha.
- **CA-05:** Dado um caso que entrou em In Review em 10/11/2026, quando a pessoa abre a aba Test Cases, então a coluna
  End date mostra 10/11/2026 e não há mais a coluna Code done.
- **CA-06:** Dado esse caso, quando ele falha no SDF e volta para In Review em 20/11/2026 na correção, então a End
  date continua 10/11/2026.
- **CA-07:** Dado um projeto com data planejada, quando a pessoa abre a aba Test Cases, então cada linha mostra a
  Planned date do projeto; sem data, um traço.
- **CA-08 (falha):** Dado um dev, quando abre a aba Test Cases, então não consegue editar a End date nem a Planned
  date.
- **CA-09:** Dado o filtro por semana na aba Test Cases, quando a pessoa escolhe uma semana, então a lista mostra os
  casos com a nova End date naquela semana, e a exportação usa a mesma data.

## Fora de escopo

- Uma Planned date diferente para cada caso.
- Mudar o burndown ou a meta diária (spec 071).
- A data de fim da correção, que aparece na My Fixes (spec 073).
- Apagar do sistema a data em que todos os devices passaram. Ela só sai da tabela.

## Dúvidas em aberto

- Nenhuma. A Planned date fica como coluna, mesmo com o mesmo valor em todas as linhas (RN-08).
