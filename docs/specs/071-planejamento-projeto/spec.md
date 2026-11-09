# 071. Data planejada do projeto: Spec

- **Status:** Concluída
- **Data:** 2026-11-09
- **Specs relacionadas:** 063 (burndown do Overview, RN-07, e a proposta de planejamento por projeto), 064 (seletor
  de projeto no Overview), 069 (projetos encerrados)

## Problema

A linha de planejado do burndown cai 2 Test Cases por dia útil em todos os projetos. Ninguém escolheu esse ritmo
para nenhum projeto, e ele não muda sem mexer no sistema. A gestão quer dizer quando cada projeto deve terminar e
ver se o time está no ritmo para chegar lá.

## Objetivo

Cada projeto pode ter uma **data planejada** de entrega, que a gestão define e muda quando quiser. O burndown passa
a planejar a partir dela, e a meta de casos por dia sai da conta, não de um número fixo. Projeto sem data
planejada não tem linha de planejado.

## Histórias de usuário

- Como **gerente** ou **KP**, quero definir a data em que um projeto deve terminar, para o burndown mostrar o ritmo
  necessário.
- Como **gerente** ou **KP**, quero mudar essa data quando o prazo mudar, sem pedir ajuste no sistema.
- Como **qualquer perfil** que vê o burndown, quero saber quantos casos por dia útil a meta pede, para comparar com o
  que o time está entregando.

## Regras de negócio

- RN-01: A **data planejada** é um campo opcional do projeto, só com dia, mês e ano.
- RN-02: Quem já edita o projeto (admin da unidade, gerente e KP, no seu escopo) define, muda e apaga a data
  planejada. O dev não.
- RN-03: A data planejada é editada no formulário de edição do projeto, junto dos outros dados dele. A lista de
  projetos mostra o valor numa coluna **Planned date**, só para leitura. Sem data, a célula mostra um traço.
- RN-04: Ao definir ou mudar a data, o sistema guarda também o dia em que isso foi feito: é o **início do
  planejamento**.
- RN-05: Com data planejada, o burndown vai do início do planejamento até a data planejada (ou até hoje, se a
  data já passou). A linha de planejado começa com o número de casos não Done do projeto no dia do início e cai
  em linha reta, por dia útil (segunda a sexta, sem feriados), até zero na data planejada; depois dela, fica em
  zero. A linha de executado vai do início até hoje e não tem ponto nos dias que ainda não chegaram. Sem data
  planejada, o gráfico continua com os últimos 30 dias, só com o executado.
- RN-06: A **meta diária** é esse número de casos dividido pelos dias úteis depois do início do planejamento até a
  data planejada (o dia do início não conta, a data planejada conta). A linha cai a meta a cada um desses dias. O burndown mostra, junto do título, a data planejada e a meta diária (por exemplo,
  "Planned date 19/12/2026 · 3 per business day"), com uma casa decimal quando não for inteira.
- RN-07: Projeto sem data planejada não tem linha de planejado nem meta; o burndown mostra só o executado e diz que
  o projeto não tem data planejada. A meta fixa de 2 por dia deixa de existir.
- RN-08: Mudar a data planejada recomeça o planejamento no dia da mudança (RN-04 e RN-05). Apagar a data volta à
  RN-07.
- RN-09: A data planejada não pode ser anterior ao dia em que é definida, nem ficar a mais de dois anos dele. Uma data já gravada que fica no passado
  continua valendo.
- RN-10: Se não há nenhum dia útil depois do início até a data planejada (por exemplo, a data é o próprio dia ou o
  sábado seguinte a uma sexta), a meta é o número inteiro de casos não Done, e a linha vai a zero na data planejada.

## Critérios de aceite

- **CA-01:** Dado o projeto Clock sem data planejada, quando o KP do time define 19/12/2026, então a coluna Planned
  date mostra 19/12/2026.
- **CA-02:** Dado que o KP definiu, em 27/11/2026 (sexta), a data planejada de Clock como 11/12/2026 (sexta), com 30
  casos não Done em 27/11, quando alguém abre o burndown de Clock, então o planejado começa em 30 em 27/11, cai 3 a
  cada dia útil e chega a zero em 11/12 (são 10 dias úteis de 30/11 a 11/12).
- **CA-03:** Dado o cenário da CA-02, quando alguém abre o burndown, então vê "3 per business day" e a data
  planejada junto do título.
- **CA-04:** Dado 20 casos não Done no início do planejamento e 6 dias úteis depois dele até a data planejada, quando alguém abre o burndown, então a meta
  aparece como 3,3 por dia útil.
- **CA-05:** Dado o projeto Camera sem data planejada, quando alguém abre o burndown dele, então só a linha de
  executado aparece, com o aviso de que o projeto não tem data planejada.
- **CA-06:** Dado Clock com data planejada definida em 01/12/2026, quando o gerente muda a data em 05/12/2026, então o
  planejado recomeça em 05/12/2026 com o número de casos não Done desse dia.
- **CA-07:** Dado Clock com data planejada, quando o KP apaga a data, então o burndown volta ao comportamento da
  CA-05.
- **CA-08:** Dado o planejamento de Clock iniciado em 27/11/2026 com data planejada em 11/12/2026, e hoje
  02/12/2026, quando alguém abre o burndown, então o gráfico vai de 27/11 a 11/12, o planejado aparece em todos os
  dias e chega a zero em 11/12, e o executado tem pontos só de 27/11 a 02/12.
- **CA-13:** Dado o planejamento de Clock com data planejada em 11/12/2026, e hoje 15/12/2026, quando alguém abre o
  burndown, então o gráfico vai até 15/12, o planejado fica em zero depois de 11/12 e o executado mostra os casos
  ainda abertos.
- **CA-09 (falha):** Dado um dev do time de Clock, quando ele tenta definir a data planejada, então o sistema recusa
  por falta de permissão.
- **CA-10 (falha):** Dado hoje 09/11/2026, quando o KP tenta definir a data planejada 08/11/2026, então o sistema
  recusa e informa que a data não pode estar no passado.
- **CA-11 (falha):** Dado um KP de outro time, quando ele tenta definir a data planejada de Clock, então o sistema
  recusa como recusa hoje a edição do projeto.
- **CA-12 (falha):** Dado uma data inválida (por exemplo, 31/02/2026), quando alguém tenta salvar, então o sistema
  recusa e informa que a data é inválida.

## Fora de escopo

- Data de início escolhida à mão, feriados e pausas (a proposta completa da spec 063).
- Recalcular o planejado quando o escopo muda (casos importados ou excluídos depois do início do planejamento).
- Perguntar a data planejada na importação da planilha.
- Página própria de planejamento e data planejada por Test Case.
- Distribuição de casos para sprint de manutenção.
- Avisos ou notificações de atraso.
- Histórico das mudanças da data planejada na auditoria (hoje a auditoria não cobre projetos).

## Decisões (2026-11-09)

- A data planejada é um dado do projeto, editado no formulário dele; a coluna da lista é só leitura (RN-03).
- A meta por dia é variável: sai da data planejada de cada projeto (RN-06). Não há mais meta fixa; sem data
  planejada, não há linha de planejado (RN-07).
- O burndown com data planejada vai do início do planejamento até a data planejada, como um burndown clássico,
  e não mais nos últimos 30 dias (RN-05). Um planejamento longo dá mais pontos no gráfico; o eixo espaça as datas.
